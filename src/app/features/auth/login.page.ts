import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, IonInput } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-login',
  template: `
    <ion-page>
      <ion-content fullscreen class="auth-content">
        <div class="auth-hero app-header app-header--inner">
          <app-mobile-header
            title="Welcome back"
            subtitle="Sign in to continue"
            fallbackRoute="/home"
          ></app-mobile-header>
        </div>

        <div class="surface auth-surface">
          <div class="surface__content auth-surface__content">
            <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
              <label class="auth-label" for="login-identifier">Email or phone number</label>
              <ion-item fill="solid" class="auth-field">
                <ion-input
                  id="login-identifier"
                  formControlName="identifier"
                  placeholder="you@example.com"
                  autocomplete="username"
                  (ionInput)="clearErrorMessage()"
                ></ion-input>
              </ion-item>

              <label class="auth-label" for="login-password">Password</label>
              <ion-item fill="solid" class="auth-field">
                <ion-input
                  #passwordInput
                  id="login-password"
                  formControlName="password"
                  [type]="showPassword ? 'text' : 'password'"
                  placeholder="Password"
                  autocomplete="current-password"
                  (ionInput)="clearErrorMessage()"
                ></ion-input>
                <button
                  type="button"
                  class="password-toggle"
                  aria-label="Toggle password visibility"
                  (click)="togglePasswordVisibility()"
                >
                  <ion-icon [name]="showPassword ? 'eye-off-outline' : 'eye-outline'" aria-hidden="true"></ion-icon>
                </button>
              </ion-item>

              <div class="forgot-row">
                <button type="button" class="forgot-link" (click)="onForgotPassword()">
                  Forgot password?
                </button>
              </div>

              <div class="auth-feedback" [class.auth-feedback--visible]="!!errorMessage">
                <ion-text color="danger" *ngIf="errorMessage" class="auth-error">
                  {{ errorMessage }}
                </ion-text>
              </div>

              <ion-button expand="block" type="submit" class="auth-submit" [disabled]="!canSubmit">
                <ion-spinner *ngIf="loading" slot="start" name="crescent"></ion-spinner>
                <span>{{ loading ? 'Signing in...' : 'Continue' }}</span>
              </ion-button>
            </form>

            <p class="auth-register-copy">
              Don't have an account?
              <button class="auth-link" type="button" (click)="goToRegister()">Create an account</button>
            </p>

            <p class="auth-legal">
              By continuing you agree to our Terms &amp; Privacy Policy.
            </p>
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
        max-width: 420px;
        margin: 0 auto;
        gap: 0;
        padding-top: 0.35rem;
        padding-bottom: calc(1.1rem + env(safe-area-inset-bottom));
      }

      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .auth-label {
        display: block;
        margin: 0 0 0.42rem;
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
        margin-bottom: 0.95rem;
        border: 1px solid rgba(47, 66, 107, 0.12);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
        transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
        overflow: hidden;
        border-radius: 999px;
      }

      .auth-field.item-has-focus,
      .auth-field.ion-focused {
        --background: #f7f9ff;
        border-color: rgba(32, 59, 144, 0.48);
        box-shadow: 0 0 0 3px rgba(32, 59, 144, 0.12);
      }

      .forgot-row {
        display: flex;
        justify-content: flex-end;
        margin: -0.2rem 0 0.8rem;
      }

      .forgot-link {
        border: 0;
        background: transparent;
        color: #163c9a;
        font: inherit;
        font-size: 0.94rem;
        font-weight: 600;
        padding: 0;
      }

      .password-toggle {
        border: 0;
        background: transparent;
        color: rgba(48, 68, 104, 0.54);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        align-self: center;
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        margin: 0;
        padding: 0;
        opacity: 0.9;
        line-height: 1;
      }

      .password-toggle ion-icon {
        font-size: 1.05rem;
      }

      .auth-feedback {
        min-height: 1.6rem;
        display: flex;
        align-items: center;
        margin: 0 0 0.45rem;
      }

      .auth-feedback--visible {
        min-height: auto;
      }

      .auth-submit {
        --background: #f5b628;
        --background-hover: #f5b628;
        --background-activated: #d79d1f;
        --border-radius: 999px;
        --box-shadow: 0 10px 22px rgba(245, 182, 40, 0.24);
        margin-top: 0.15rem;
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

      .auth-register-copy {
        margin: 1.3rem 0 0;
        text-align: center;
        color: #41557a;
        font-size: 1rem;
        line-height: 1.45;
      }

      .auth-link {
        border: 0;
        background: transparent;
        color: #163c9a;
        font: inherit;
        font-weight: 600;
        padding: 0;
      }

      .auth-error {
        display: block;
        margin: 0;
        line-height: 1.35;
      }

      .auth-legal {
        margin: 0.95rem auto 0;
        text-align: center;
        color: rgba(55, 73, 109, 0.76);
        font-size: 0.88rem;
        line-height: 1.45;
        padding: 0 0.4rem 0;
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
export class LoginPage implements OnDestroy {
  private static readonly errorDismissDelayMs = 3500;

  @ViewChild('passwordInput', { read: IonInput }) passwordInput?: IonInput;

  readonly form = this.formBuilder.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
  });

  loading = false;
  errorMessage = '';
  showPassword = false;
  private errorDismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
  ) {}

  get canSubmit(): boolean {
    const { identifier, password } = this.form.getRawValue();
    return !!identifier.trim() && !!password.trim() && !this.loading;
  }

  ngOnDestroy(): void {
    this.clearErrorDismissTimer();
  }

  submit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.clearErrorMessage();
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        void this.router.navigate(['/profile']);
      },
      error: (error: unknown) => {
        const isCredentialError = this.isCredentialError(error);
        this.setErrorMessage(this.getLoginErrorMessage(error));
        if (isCredentialError) {
          this.form.controls.password.setValue('');
          void this.focusPasswordField();
        }
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  goToRegister(): void {
    void this.router.navigate(['/register']);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  clearErrorMessage(): void {
    this.clearErrorDismissTimer();
    this.errorMessage = '';
  }

  onForgotPassword(): void {
    console.info('[LoginPage] Forgot password route not implemented yet.');
  }

  private isCredentialError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && (error.status === 400 || error.status === 401);
  }

  private getLoginErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Something went wrong. Please try again.';
    }

    if (this.isCredentialError(error)) {
      return 'We couldn’t sign you in. Check your email/phone and password.';
    }

    return 'Something went wrong. Please try again.';
  }

  private async focusPasswordField(): Promise<void> {
    await Promise.resolve();
    await this.passwordInput?.setFocus();
  }

  private setErrorMessage(message: string): void {
    this.clearErrorDismissTimer();
    this.errorMessage = message;
    this.errorDismissTimer = setTimeout(() => {
      this.errorMessage = '';
      this.errorDismissTimer = null;
    }, LoginPage.errorDismissDelayMs);
  }

  private clearErrorDismissTimer(): void {
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
      this.errorDismissTimer = null;
    }
  }
}
