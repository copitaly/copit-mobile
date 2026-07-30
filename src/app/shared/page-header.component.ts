import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, HostBinding, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../core/services/auth.service';
import { StackNavigationService } from '../core/services/stack-navigation.service';

@Component({
  standalone: true,
  selector: 'app-page-header',
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <header class="page-header" [class.page-header--hero]="variant === 'hero'" [class.page-header--compact]="variant === 'compact'">
      <ng-container *ngIf="variant === 'compact'; else heroHeader">
        <div class="page-header__inner page-header__inner--compact">
          <button
            *ngIf="showBack"
            type="button"
            class="page-header__icon-button page-header__icon-button--back ion-activatable"
            aria-label="Go back"
            [disabled]="navigationPending"
            (click)="goBack()"
          >
            <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
            <ion-ripple-effect></ion-ripple-effect>
          </button>

          <div class="page-header__copy page-header__copy--compact">
            <p *ngIf="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</p>
            <h1 class="page-header__title">{{ title }}</h1>
            <p *ngIf="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
          </div>

          <button
            *ngIf="showProfile"
            type="button"
            class="page-header__icon-button ion-activatable"
            aria-label="Open profile"
            [disabled]="navigationPending"
            (click)="openProfile()"
          >
            <ion-icon [name]="profileIcon" aria-hidden="true"></ion-icon>
            <ion-ripple-effect></ion-ripple-effect>
          </button>
        </div>
      </ng-container>

      <ng-template #heroHeader>
        <div class="page-header__nav">
          <div class="page-header__nav-slot">
            <button
              *ngIf="showBack"
              type="button"
              class="page-header__icon-button ion-activatable"
              aria-label="Go back"
              [disabled]="navigationPending"
              (click)="goBack()"
            >
              <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
              <ion-ripple-effect></ion-ripple-effect>
            </button>
          </div>

          <div class="page-header__nav-slot page-header__nav-slot--end">
            <button
              *ngIf="showProfile"
              type="button"
              class="page-header__icon-button ion-activatable"
              aria-label="Open profile"
              [disabled]="navigationPending"
              (click)="openProfile()"
            >
              <ion-icon [name]="profileIcon" aria-hidden="true"></ion-icon>
              <ion-ripple-effect></ion-ripple-effect>
            </button>
          </div>
        </div>

        <div class="page-header__copy">
          <p *ngIf="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</p>
          <h1 class="page-header__title">{{ title }}</h1>
          <p *ngIf="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
        </div>
      </ng-template>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      color: #ffffff;
    }

    :host(.page-header-host--compact) {
      margin-bottom: -14px;
      position: relative;
      z-index: 1;
    }

    .page-header {
      padding:
        calc(env(safe-area-inset-top, 0px) + 10px)
        calc(env(safe-area-inset-right, 0px) + 24px)
        12px
        calc(env(safe-area-inset-left, 0px) + 24px);
      background: linear-gradient(180deg, #081b61 0%, #0b1d73 80%);
      box-shadow: 0 18px 45px rgba(2, 18, 54, 0.35);
      display: flex;
      flex-direction: column;
      color: #ffffff;
    }

    .page-header--compact {
      min-height: 128px;
      justify-content: flex-start;
    }

    .page-header--hero {
      min-height: 192px;
      padding:
        calc(env(safe-area-inset-top, 0px) + 20px)
        calc(env(safe-area-inset-right, 0px) + 24px)
        24px
        calc(env(safe-area-inset-left, 0px) + 24px);
      gap: 24px;
      justify-content: space-between;
    }

    .page-header__nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 44px;
    }

    .page-header__inner--compact {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      min-width: 0;
    }

    .page-header__nav-slot {
      display: flex;
      align-items: center;
      min-width: 44px;
      min-height: 44px;
    }

    .page-header__nav-slot--end {
      justify-content: flex-end;
    }

    .page-header__icon-button {
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      border: 0;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(8px);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
      transition:
        background-color 160ms ease,
        transform 160ms ease,
        opacity 160ms ease;
      -webkit-tap-highlight-color: transparent;
    }

    .page-header__icon-button:hover:not(:disabled),
    .page-header__icon-button:focus-visible {
      background: rgba(255, 255, 255, 0.18);
    }

    .page-header__icon-button:active:not(:disabled) {
      transform: translateY(1px);
    }

    .page-header__icon-button:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.42);
      outline-offset: 3px;
    }

    .page-header__icon-button:disabled {
      opacity: 0.68;
    }

    .page-header__icon-button ion-icon {
      font-size: 1.3rem;
    }

    .page-header__copy {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-width: 400px;
      min-width: 0;
    }

    .page-header__copy--compact {
      flex: 1;
      max-width: none;
      padding-top: 2px;
    }

    .page-header__eyebrow,
    .page-header__title,
    .page-header__subtitle {
      margin: 0;
      color: #ffffff;
    }

    .page-header__eyebrow {
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.82);
      text-wrap: pretty;
    }

    .page-header__title {
      font-size: 1.78rem;
      font-weight: 700;
      line-height: 1.08;
      letter-spacing: -0.02em;
      text-wrap: balance;
    }

    .page-header--compact .page-header__title {
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      text-wrap: balance;
    }

    .page-header__subtitle {
      font-size: 0.92rem;
      font-weight: 500;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.82);
      text-wrap: pretty;
    }

    .page-header--hero .page-header__copy {
      gap: 8px;
    }

    .page-header--hero .page-header__title {
      font-size: 2rem;
    }

    .page-header--hero .page-header__subtitle {
      font-size: 1rem;
      line-height: 1.5;
    }

    @media (max-width: 420px) {
      :host(.page-header-host--compact) {
        margin-bottom: -12px;
      }

      .page-header {
        padding:
          calc(env(safe-area-inset-top, 0px) + 8px)
          calc(env(safe-area-inset-right, 0px) + 20px)
          10px
          calc(env(safe-area-inset-left, 0px) + 20px);
      }

      .page-header--compact {
        min-height: 122px;
      }

      .page-header--hero {
        min-height: 184px;
        padding:
          calc(env(safe-area-inset-top, 0px) + 18px)
          calc(env(safe-area-inset-right, 0px) + 20px)
          22px
          calc(env(safe-area-inset-left, 0px) + 20px);
        gap: 20px;
      }

      .page-header__title {
        font-size: 1.68rem;
      }

      .page-header__subtitle {
        font-size: 0.88rem;
      }

      .page-header__inner--compact {
        gap: 12px;
      }
    }
  `],
})
export class PageHeaderComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly stackNavigation = inject(StackNavigationService);

  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() eyebrow = '';
  @Input() variant: 'hero' | 'compact' = 'compact';
  @Input() showBack = true;
  @Input() showProfile = false;
  @Input() backFallbackRoute = '/home';
  @Input() profileAction: (() => void | Promise<void>) | null = null;
  @Input() profileIcon = 'person-circle-outline';

  navigationPending = false;

  @HostBinding('class.page-header-host--compact')
  get isCompactHost(): boolean {
    return this.variant === 'compact';
  }

  @HostBinding('class.page-header-host--hero')
  get isHeroHost(): boolean {
    return this.variant === 'hero';
  }

  async goBack(): Promise<void> {
    if (this.navigationPending) {
      return;
    }

    this.navigationPending = true;

    try {
      await this.stackNavigation.backWithFallback(this.backFallbackRoute);
    } finally {
      this.navigationPending = false;
    }
  }

  async openProfile(): Promise<void> {
    if (this.navigationPending) {
      return;
    }

    this.navigationPending = true;

    try {
      if (this.profileAction) {
        await this.profileAction();
        return;
      }

      const profileRoute = this.authService.isAuthenticatedSnapshot ? '/tabs/more' : '/login';
      await this.router.navigateByUrl(profileRoute);
    } finally {
      this.navigationPending = false;
    }
  }
}
