import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';

import { MobileHeaderComponent } from './mobile-header.component';

@Component({
  standalone: true,
  selector: 'app-feature-page-shell',
  imports: [CommonModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div
      class="feature-page-shell"
      [class.feature-page-shell--editorial]="headerTone === 'editorial'"
      data-testid="feature-page-shell"
    >
      <div
        class="feature-page-shell__hero app-header app-header--inner"
        [class.feature-page-shell__hero--editorial]="headerTone === 'editorial'"
      >
        <app-mobile-header
          [title]="title"
          [subtitle]="subtitle"
          [showBack]="showBack"
          [backAriaLabel]="backAriaLabel"
          [centerCopy]="centerCopy"
          [fallbackRoute]="backFallbackRoute"
          [actionIcon]="actionIcon"
          [actionAriaLabel]="actionAriaLabel"
          [actionDisabled]="actionDisabled"
          [action]="action"
          [tone]="headerTone"
        ></app-mobile-header>
      </div>

      <div
        class="surface feature-page-shell__surface"
        [class.feature-page-shell__surface--flat]="surfaceTone === 'flat'"
        [class.feature-page-shell__surface--editorial]="headerTone === 'editorial'"
        data-testid="feature-page-surface"
      >
        <div
          class="surface__content feature-page-shell__content"
          [class.feature-page-shell__content--flat]="surfaceTone === 'flat'"
          [style.max-width]="contentMaxWidth"
        >
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

      .feature-page-shell--editorial .feature-page-shell__hero.feature-page-shell__hero--editorial.app-header {
        background: var(--cop-color-surface);
        padding:
          var(--cop-secondary-padding-top)
          var(--cop-page-padding-inline-end)
          0.9rem
          var(--cop-page-padding-inline-start);
        border-radius: 0;
        box-shadow: none;
      }

      .feature-page-shell__surface {
        flex: 1 0 auto;
        min-height: 100%;
        margin-top: var(--feature-shell-sheet-overlap);
        padding-top: var(--feature-shell-sheet-top-padding);
        border-radius: var(--feature-shell-sheet-radius) var(--feature-shell-sheet-radius) 0 0;
      }

      .feature-page-shell__surface--flat {
        background: transparent;
        box-shadow: none;
        margin-top: 0;
        padding-top: 0;
        border-radius: 0;
        min-height: auto;
      }

      .feature-page-shell__surface--editorial {
        background: transparent;
      }

      .feature-page-shell__content {
        width: 100%;
        margin: 0 auto;
        padding-bottom: calc(var(--feature-shell-sheet-top-padding) + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)));
      }

      .feature-page-shell__content--flat {
        padding-bottom: calc(1.35rem + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)));
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
  @Input() backFallbackRoute = '/tabs/home';
  @Input() contentMaxWidth = '520px';
  @Input() actionIcon: string | null = null;
  @Input() actionAriaLabel = '';
  @Input() actionDisabled = false;
  @Input() action: (() => void | Promise<void>) | null = null;
  @Input() headerTone: 'inverse' | 'editorial' = 'inverse';
  @Input() surfaceTone: 'sheet' | 'flat' = 'sheet';
}
