import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  selector: 'app-auth-layout',
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="auth-layout" data-testid="auth-layout-shell">
      <div class="auth-hero app-header app-header--inner">
        <app-mobile-header
          [title]="title"
          [subtitle]="subtitle"
          [fallbackRoute]="fallbackRoute"
          [backAriaLabel]="backAriaLabel"
        ></app-mobile-header>
      </div>

      <div class="surface auth-surface">
        <div class="surface__content auth-surface__content">
          <article class="auth-card">
            <ng-content></ng-content>
          </article>

          <footer *ngIf="showFooter" class="auth-layout__footer">
            <ng-content select="[authLayoutFooter]"></ng-content>
          </footer>
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
        width: 100%;
      }

      .auth-layout {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 100%;
        width: 100%;
      }

      .auth-hero {
        width: 100%;
        padding-bottom: 1.9rem;
        background: #0b1d73;
      }

      .auth-surface {
        flex: 1 0 auto;
        min-height: 100%;
        margin-top: -0.08rem;
        padding-top: 1.3rem;
        background: #f4f7ff;
        box-shadow: 0 -8px 24px rgba(2, 18, 54, 0.08);
        border-radius: 26px 26px 0 0;
      }

      .auth-surface__content {
        width: 100%;
        max-width: 420px;
        margin: 0 auto;
        gap: 0;
        padding:
          0.4rem
          calc(var(--cop-safe-right, env(safe-area-inset-right, 0px)) + 1rem)
          calc(1.5rem + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)))
          calc(var(--cop-safe-left, env(safe-area-inset-left, 0px)) + 1rem);
      }

      .auth-card {
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1);
        padding: 1.3rem;
      }

      .auth-layout__footer {
        margin-top: 1.05rem;
        text-align: center;
      }

      @media (max-height: 760px) {
        .auth-surface {
          margin-top: -0.06rem;
          padding-top: 1.1rem;
        }
      }
    `,
  ],
})
export class AuthLayoutComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() fallbackRoute = '/tabs/home';
  @Input() backAriaLabel = 'Go back';
  @Input() showFooter = false;
}
