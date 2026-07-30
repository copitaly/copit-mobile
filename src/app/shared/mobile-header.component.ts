import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { StackNavigationService } from '../core/services/stack-navigation.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-mobile-header',
  template: `
    <div class="app-header__inner app-header__inner--mobile-header">
      <ion-back-button
        *ngIf="showBack"
        class="app-header__back"
        icon="chevron-back"
        text=""
        [defaultHref]="fallbackRoute"
        [attr.aria-label]="backAriaLabel"
        (click)="handleBackClick($event)"
      >
      </ion-back-button>

      <div class="app-header__copy" [class.app-header__copy--centered]="centerCopy">
        <h1 class="app-header__title">{{ title }}</h1>
        <p *ngIf="subtitle" class="app-header__subtitle">{{ subtitle }}</p>
      </div>

      <button
        *ngIf="actionIcon && actionAriaLabel"
        class="app-header__back app-header__action"
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
    `,
  ],
})
export class MobileHeaderComponent {
  private readonly stackNavigation = inject(StackNavigationService);

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
