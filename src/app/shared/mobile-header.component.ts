import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { LocaleService } from '../core/localization/locale.service';
import { StackNavigationService } from '../core/services/stack-navigation.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-mobile-header',
  template: `
    <div
      class="app-header__inner app-header__inner--mobile-header"
      [class.app-header__inner--editorial]="tone === 'editorial'"
    >
      <ion-back-button
        *ngIf="showBack"
        class="app-header__back"
        [class.app-header__back--editorial]="tone === 'editorial'"
        icon="chevron-back"
        text=""
        [defaultHref]="fallbackRoute"
        [attr.aria-label]="resolvedBackAriaLabel"
        (click)="handleBackClick($event)"
      >
      </ion-back-button>

      <div
        class="app-header__copy"
        [class.app-header__copy--centered]="centerCopy"
        [class.app-header__copy--editorial]="tone === 'editorial'"
      >
        <h1 class="app-header__title" [class.app-header__title--editorial]="tone === 'editorial'">{{ title }}</h1>
        <p *ngIf="subtitle" class="app-header__subtitle" [class.app-header__subtitle--editorial]="tone === 'editorial'">
          {{ subtitle }}
        </p>
      </div>

      <button
        *ngIf="actionIcon && actionAriaLabel"
        class="app-header__back app-header__action"
        [class.app-header__back--editorial]="tone === 'editorial'"
        type="button"
        [attr.aria-label]="actionAriaLabel"
        [disabled]="actionDisabled"
        (click)="handleAction()"
      >
        <ion-icon class="app-back-icon" [name]="actionIcon" aria-hidden="true"></ion-icon>
      </button>
    </div>
  `,
  styles: [
    `
      .app-header__back {
        --icon-font-size: 20px;
      }

      .app-header__back::part(native) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--feature-shell-nav-size);
        height: var(--feature-shell-nav-size);
        min-width: var(--feature-shell-nav-size);
        min-height: var(--feature-shell-nav-size);
        border-radius: 50%;
        border: none;
        background: rgba(255, 255, 255, 0.11);
        color: #ffffff;
        backdrop-filter: blur(6px);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        padding: 0;
      }

      .app-header__back--editorial::part(native) {
        background: #ffffff;
        color: #081f5c;
        backdrop-filter: none;
        box-shadow:
          0 8px 18px rgba(7, 24, 69, 0.05),
          inset 0 0 0 1px rgba(8, 31, 92, 0.08);
      }

      .app-header__copy--editorial {
        gap: 0.28rem;
      }

      .app-header__title--editorial,
      .app-header__subtitle--editorial {
        color: #081f5c;
      }

      .app-header__title--editorial {
        font-size: 1.42rem;
        line-height: 1.12;
        letter-spacing: -0.025em;
      }

      .app-header__subtitle--editorial {
        color: rgba(8, 31, 92, 0.68);
        font-size: 0.92rem;
        line-height: 1.38;
      }
    `,
  ],
})
export class MobileHeaderComponent {
  private readonly stackNavigation = inject(StackNavigationService);
  private readonly localeService = inject(LocaleService);

  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() showBack = true;
  @Input() backAriaLabel = 'Go back';
  @Input() centerCopy = false;
  @Input() fallbackRoute = '/tabs/home';
  @Input() actionIcon: string | null = null;
  @Input() actionAriaLabel = '';
  @Input() actionDisabled = false;
  @Input() action: (() => void | Promise<void>) | null = null;
  @Input() tone: 'inverse' | 'editorial' = 'inverse';

  get resolvedBackAriaLabel(): string {
    return this.backAriaLabel || this.localeService.translate('navigation.goBack');
  }

  handleBackClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    void this.stackNavigation.backWithFallback(this.fallbackRoute);
  }

  handleAction(): void {
    if (this.actionDisabled || !this.action) {
      return;
    }

    void this.action();
  }
}
