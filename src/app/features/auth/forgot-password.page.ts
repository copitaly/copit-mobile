import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ForgotPasswordFormComponent } from './forgot-password-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, ForgotPasswordFormComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-forgot-password',
  template: `
    <ion-page>
      <ion-content fullscreen class="recovery-content cop-content--secondary">
        <div class="recovery-shell cop-secondary-shell">
          <header class="recovery-header" aria-labelledby="forgot-password-title">
            <ion-back-button
              class="recovery-header__back"
              defaultHref="/tabs/profile"
              text=""
              icon="chevron-back"
              aria-label="Back to Sign In"
            ></ion-back-button>

            <div class="recovery-header__copy">
              <h1 id="forgot-password-title">Forgot password</h1>
              <p>Enter your email and we&apos;ll send you instructions to reset your password.</p>
            </div>
          </header>

          <section class="recovery-card" data-testid="forgot-password-card">
            <app-forgot-password-form></app-forgot-password-form>
          </section>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ion-page {
        background: #f7f6f2;
      }

      ion-content.recovery-content {
        --background: #f7f6f2;
        --keyboard-offset: 0px;
      }

      .recovery-shell,
      .recovery-header__copy {
        display: flex;
        flex-direction: column;
      }

      .recovery-header {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: start;
        column-gap: 0.85rem;
      }

      .recovery-header__back {
        --icon-font-size: 18px;
        margin-top: 0.02rem;
      }

      .recovery-header__back::part(native) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        min-width: 40px;
        min-height: 40px;
        border: 0;
        border-radius: 50%;
        padding: 0;
        background: #ffffff;
        color: #163c9a;
        box-shadow: 0 6px 14px rgba(7, 24, 69, 0.07);
      }

      .recovery-header__copy h1,
      .recovery-header__copy p {
        margin: 0;
      }

      .recovery-header__copy {
        gap: 0.34rem;
        padding-top: 0.1rem;
      }

      .recovery-header__copy h1 {
        color: #081f5c;
        font-size: 1.95rem;
        line-height: 1.06;
        letter-spacing: -0.02em;
      }

      .recovery-header__copy p {
        max-width: 26rem;
        color: rgba(8, 31, 92, 0.68);
        font-size: 0.98rem;
        line-height: 1.45;
      }

      .recovery-card {
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 12px 28px rgba(7, 24, 69, 0.08);
        padding: 0.96rem 1rem 1rem;
        width: 100%;
        max-width: 448px;
        margin: 0 auto;
      }

      @media (max-width: 420px) {
        .recovery-shell {
          padding-left: calc(var(--cop-safe-left, env(safe-area-inset-left, 0px)) + 0.95rem);
          padding-right: calc(var(--cop-safe-right, env(safe-area-inset-right, 0px)) + 0.95rem);
        }

        .recovery-header__copy h1 {
          font-size: 1.78rem;
        }
      }
    `,
  ],
})
export class ForgotPasswordPage {}
