import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';

import { MobileHeaderComponent } from './mobile-header.component';

@Component({
  standalone: true,
  selector: 'app-feature-page-shell',
  imports: [CommonModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="feature-page-shell" data-testid="feature-page-shell">
      <div class="feature-page-shell__hero app-header app-header--inner">
        <app-mobile-header
          [title]="title"
          [subtitle]="subtitle"
          [showBack]="showBack"
          [backAriaLabel]="backAriaLabel"
          [centerCopy]="centerCopy"
          [fallbackRoute]="backFallbackRoute"
        ></app-mobile-header>
      </div>

      <div class="surface feature-page-shell__surface" data-testid="feature-page-surface">
        <div class="surface__content feature-page-shell__content" [style.max-width]="contentMaxWidth">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-height: 100%;
      }

      .feature-page-shell {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 100%;
        width: 100%;
      }

      .feature-page-shell__hero {
        border-bottom-left-radius: var(--feature-shell-header-radius);
        border-bottom-right-radius: var(--feature-shell-header-radius);
      }

      .feature-page-shell__surface {
        flex: 1;
        min-height: 0;
        margin-top: var(--feature-shell-sheet-overlap);
        padding-top: var(--feature-shell-sheet-top-padding);
        border-radius: var(--feature-shell-sheet-radius) var(--feature-shell-sheet-radius) 0 0;
      }

      .feature-page-shell__content {
        width: 100%;
        margin: 0 auto;
        padding-bottom: calc(var(--feature-shell-sheet-top-padding) + env(safe-area-inset-bottom));
      }
    `,
  ],
})
export class FeaturePageShellComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() showBack = true;
  @Input() backAriaLabel = 'Go back';
  @Input() centerCopy = false;
  @Input() backFallbackRoute = '/home';
  @Input() contentMaxWidth = '520px';
}
