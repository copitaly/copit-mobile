import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, isDevMode } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OverlayDiagnosticsService {
  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  capture(label: string, details: Record<string, unknown> = {}): void {
    if (!isDevMode()) {
      return;
    }

    const overlays = Array.from(
      this.document.querySelectorAll('ion-modal, ion-alert, ion-action-sheet, ion-popover, ion-loading, ion-backdrop')
    ).map((element) => ({
      tag: element.tagName.toLowerCase(),
      classes: element.className,
      hidden: element.getAttribute('aria-hidden'),
      pointerEvents: this.readStyle(element, 'pointer-events'),
      opacity: this.readStyle(element, 'opacity'),
    }));

    console.info('[OverlayDiagnostics]', {
      label,
      details,
      overlays,
      htmlOverflow: this.readStyle(this.document.documentElement, 'overflow'),
      bodyOverflow: this.readStyle(this.document.body, 'overflow'),
      bodyPointerEvents: this.readStyle(this.document.body, 'pointer-events'),
    });
  }

  private readStyle(element: Element | null, property: string): string {
    if (!element) {
      return '';
    }

    return getComputedStyle(element).getPropertyValue(property).trim();
  }
}
