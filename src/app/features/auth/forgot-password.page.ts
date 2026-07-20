import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-forgot-password',
  template: `
    <ion-page>
      <ion-content fullscreen class="auth-content">
        <div class="auth-hero app-header app-header--inner">
          <app-mobile-header
            title="Forgot password"
            subtitle="Enter your email to get reset instructions"
            fallbackRoute="/login"
          ></app-mobile-header>
        </div>

        <div class="surface auth-surface">
          <div class="surface__content auth-surface__content">
            <div class="auth-card">
              <ng-container *ngIf="!submitted; else submittedState">
                <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
                  <div class="field-group">
                    <label class="auth-label" for="forgot-email">Email</label>
                    <ion-item fill="solid" class="auth-field">
                      <ion-input
                        id="forgot-email"
                        formControlName="email"
                        type="email"
                        placeholder="you@example.com"
                        autocomplete="email"
                        inputmode="email"
                        (ionInput)="clearMessage()"
                      ></ion-input>
                    </ion-item>
                    <p class="field-error" *ngIf="showEmailError">{{ emailErrorMessage }}</p>
                  </div>

                  <div class="auth-feedback" [class.auth-feedback--visible]="!!message">
                    <ion-text [color]="messageTone" *ngIf="message" class="auth-message">
                      {{ message }}
                    </ion-text>
                  </div>

                  <ion-button expand="block" type="submit" class="auth-submit" [disabled]="!canSubmit">
                    <ion-spinner *ngIf="loading" slot="start" name="crescent"></ion-spinner>
                    <span>{{ loading ? 'Sending...' : 'Send reset instructions' }}</span>
                  </ion-button>
                </form>
              </ng-container>

              <ng-template #submittedState>
                <div class="status-copy">
                  <h2>Check your email</h2>
                  <p>
                    If an account exists for this email, we sent password reset instructions.
                  </p>
                </div>
              </ng-template>

              <button type="button" class="auth-link auth-link--center" (click)="goToLogin()">
                Back to login
              </button>
            </div>
          </div>
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
        background: #0b1d73;
      }

      ion-content.auth-content {
        --background: #0b1d73;
        --keyboard-offset: 0px;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .auth-content::part(scroll) {
        flex: 1;
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }

      .auth-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .auth-hero {
        width: 100%;
        padding-bottom: 1.75rem;
      }

      .auth-surface {
        margin-top: -0.08rem;
        padding-top: 1.25rem;
        box-shadow: 0 -6px 22px rgba(2, 18, 54, 0.08);
        border-radius: 24px 24px 0 0;
      }

      .auth-surface__content {
        width: 100%;
        max-width: 456px;
        margin: 0 auto;
        gap: 0;
        padding-top: 0.35rem;
        padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
      }

      .auth-card {
        background: #ffffff;
        border-radius: 22px;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1);
        padding: 1.25rem;
      }

      .auth-form,
      .field-group {
        display: flex;
        flex-direction: column;
      }

      .auth-label {
        display: block;
        margin: 0 0 0.5rem;
        color: #304468;
        font-size: 0.9rem;
        font-weight: 600;
        line-height: 1.3;
      }

      .auth-field {
        --background: #f2f3f6;
        --border-radius: 18px;
        --padding-start: 0.65rem;
        --inner-padding-end: 0.35rem;
        --inner-padding-top: 0.42rem;
        --inner-padding-bottom: 0.42rem;
        margin-bottom: 0.35rem;
        border: 1px solid rgba(47, 66, 107, 0.12);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
        transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
        overflow: hidden;
        border-radius: 18px;
      }

      .auth-field.item-has-focus,
      .auth-field.ion-focused {
        --background: #f7f9ff;
        border-color: rgba(32, 59, 144, 0.48);
        box-shadow: 0 0 0 3px rgba(32, 59, 144, 0.12);
      }

      .field-error {
        margin: 0 0 0.85rem;
        color: #c63d47;
        font-size: 0.84rem;
        line-height: 1.35;
      }

      .auth-feedback {
        min-height: 1.45rem;
        display: flex;
        align-items: center;
        margin: 0 0 0.45rem;
      }

      .auth-feedback--visible {
        min-height: auto;
      }

      .auth-message {
        display: block;
        margin: 0;
        line-height: 1.4;
      }

      .auth-submit {
        --background: #f5b628;
        --background-hover: #f5b628;
        --background-activated: #d79d1f;
        --border-radius: 999px;
        --box-shadow: 0 10px 22px rgba(245, 182, 40, 0.24);
        margin-top: 0.2rem;
        font-weight: 600;
        min-height: 52px;
      }

      .auth-submit.button-disabled {
        --background: #f2d998;
        --background-hover: #f2d998;
        --color: rgba(36, 52, 92, 0.5);
        --box-shadow: none;
        opacity: 0.72;
        filter: saturate(0.8);
      }

      .status-copy {
        text-align: center;
        color: #304468;
        padding: 0.4rem 0 0.2rem;
      }

      .status-copy h2 {
        margin: 0 0 0.55rem;
        font-size: 1.2rem;
        color: #0b1d73;
      }

      .status-copy p {
        margin: 0;
        line-height: 1.5;
      }

      .auth-link {
        border: 0;
        background: transparent;
        color: #163c9a;
        font: inherit;
        font-weight: 600;
        padding: 0;
      }

      .auth-link--center {
        display: block;
        width: 100%;
        margin: 1.25rem auto 0;
        text-align: center;
      }
    `,
  ],
})
export class ForgotPasswordPage {
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading = false;
  submitted = false;
  message = '';
  messageTone: 'danger' | 'medium' = 'danger';

  constructor(
    private readonly authService: AuthService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
  ) {}

  get canSubmit(): boolean {
    return this.form.valid && !this.loading;
  }

  get showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.touched && (control.hasError('required') || (!!control.value.trim() && control.hasError('email')));
  }

  get emailErrorMessage(): string {
    const control = this.form.controls.email;
    if (control.hasError('required')) {
      return 'Enter your email address.';
    }

    return 'Enter a valid email address.';
  }

  submit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.clearMessage();
    this.authService
      .forgotPassword({ email: this.form.controls.email.getRawValue().trim() })
      .subscribe({
        next: () => {
          this.submitted = true;
        },
        error: (error: unknown) => {
          this.messageTone = 'danger';
          this.message = this.getErrorMessage(error);
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  clearMessage(): void {
    this.message = '';
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'Enter a valid email address.';
    }

    return 'We could not send reset instructions right now. Please try again.';
  }
}
