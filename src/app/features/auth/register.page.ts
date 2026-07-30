import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
import {
  AUTH_PASSWORD_MIN_LENGTH,
  extractFirstFieldError,
  getAuthNetworkMessage,
  passwordStrengthValidator,
  trimmedRequiredValidator,
  emailFormatValidator,
} from './auth-form.utils';

function optionalPhoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = `${control.value ?? ''}`.trim();
  if (!value) {
    return null;
  }

  return /^\+?[0-9()\-\s]{7,20}$/.test(value) ? null : { invalidPhone: true };
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-register',
  template: `
    <ion-page>
      <ion-content fullscreen class="auth-content">
        <div class="auth-hero app-header app-header--inner">
          <app-mobile-header
            title="Create account"
            subtitle="Start giving with your profile"
            fallbackRoute="/tabs/home"
          ></app-mobile-header>
        </div>

        <div class="surface auth-surface">
          <div class="surface__content auth-surface__content">
            <div class="auth-card">
              <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
                <div class="name-grid">
                  <div class="field-group">
                    <label class="auth-label" for="register-first-name">First name</label>
                    <ion-item fill="solid" class="auth-field">
                      <ion-input
                        id="register-first-name"
                        formControlName="first_name"
                        placeholder="Kwame"
                        autocomplete="given-name"
                        enterkeyhint="next"
                        (ionInput)="clearErrorMessage()"
                      ></ion-input>
                    </ion-item>
                    <p class="field-error" *ngIf="showControlError('first_name')" aria-live="polite">
                      Enter your first name.
                    </p>
                  </div>

                  <div class="field-group">
                    <label class="auth-label" for="register-last-name">Last name</label>
                    <ion-item fill="solid" class="auth-field">
                      <ion-input
                        id="register-last-name"
                        formControlName="last_name"
                        placeholder="Asante"
                        autocomplete="family-name"
                        enterkeyhint="next"
                        (ionInput)="clearErrorMessage()"
                      ></ion-input>
                    </ion-item>
                    <p class="field-error" *ngIf="showControlError('last_name')" aria-live="polite">
                      Enter your last name.
                    </p>
                  </div>
                </div>

                <div class="field-group">
                  <label class="auth-label" for="register-email">Email *</label>
                  <ion-item fill="solid" class="auth-field">
                    <ion-input
                      id="register-email"
                      formControlName="email"
                      type="email"
                      placeholder="you@example.com"
                      autocomplete="email"
                      inputmode="email"
                      autocapitalize="off"
                      autocorrect="off"
                      spellcheck="false"
                      enterkeyhint="next"
                      (ionInput)="clearErrorMessage()"
                    ></ion-input>
                  </ion-item>
                  <p class="field-error" *ngIf="showEmailError" aria-live="polite">{{ emailErrorMessage }}</p>
                </div>

                <div class="field-group">
                  <label class="auth-label" for="register-phone">Phone number (optional)</label>
                  <ion-item fill="solid" class="auth-field">
                    <ion-input
                      id="register-phone"
                      formControlName="phone_number"
                      placeholder="+39 333 123 4567"
                      autocomplete="tel"
                      inputmode="tel"
                      enterkeyhint="next"
                      (ionInput)="clearErrorMessage()"
                    ></ion-input>
                  </ion-item>
                  <p class="field-error" *ngIf="showPhoneError" aria-live="polite">{{ phoneErrorMessage }}</p>
                </div>

                <div class="field-group">
                  <label class="auth-label" for="register-password">Password</label>
                  <ion-item fill="solid" class="auth-field">
                    <ion-input
                      id="register-password"
                      formControlName="password"
                      [type]="showPassword ? 'text' : 'password'"
                      placeholder="At least 6 characters"
                      autocomplete="new-password"
                      autocapitalize="off"
                      autocorrect="off"
                      spellcheck="false"
                      enterkeyhint="next"
                      (ionInput)="clearErrorMessage()"
                    ></ion-input>
                    <button
                      type="button"
                      class="password-toggle"
                      [attr.aria-label]="passwordToggleLabel"
                      (click)="togglePasswordVisibility()"
                    >
                      <ion-icon [name]="showPassword ? 'eye-off-outline' : 'eye-outline'" aria-hidden="true"></ion-icon>
                    </button>
                  </ion-item>
                  <p class="field-error" *ngIf="showPasswordError" aria-live="polite">{{ passwordErrorMessage }}</p>
                </div>

                <div class="field-group">
                  <label class="auth-label" for="register-confirm-password">Confirm password</label>
                  <ion-item fill="solid" class="auth-field">
                    <ion-input
                      id="register-confirm-password"
                      formControlName="confirm_password"
                      [type]="showConfirmPassword ? 'text' : 'password'"
                      placeholder="Re-enter password"
                      autocomplete="new-password"
                      autocapitalize="off"
                      autocorrect="off"
                      spellcheck="false"
                      enterkeyhint="done"
                      (ionInput)="clearErrorMessage()"
                    ></ion-input>
                    <button
                      type="button"
                      class="password-toggle"
                      [attr.aria-label]="confirmPasswordToggleLabel"
                      (click)="toggleConfirmPasswordVisibility()"
                    >
                      <ion-icon [name]="showConfirmPassword ? 'eye-off-outline' : 'eye-outline'" aria-hidden="true"></ion-icon>
                    </button>
                  </ion-item>
                  <p class="field-error" *ngIf="showConfirmRequiredError" aria-live="polite">Confirm your password.</p>
                  <p class="field-error" *ngIf="showPasswordMismatchError" aria-live="polite">Your passwords do not match.</p>
                </div>

                <div class="auth-feedback" [class.auth-feedback--visible]="!!errorMessage" aria-live="polite">
                  <ion-text color="danger" *ngIf="errorMessage" class="auth-error">
                    {{ errorMessage }}
                  </ion-text>
                </div>

                <ion-button expand="block" type="submit" class="auth-submit" [disabled]="!canSubmit">
                  <ion-spinner *ngIf="loading" slot="start" name="crescent"></ion-spinner>
                  <span>{{ loading ? 'Creating account...' : 'Create account' }}</span>
                </ion-button>

                <p class="auth-login-copy">
                  Already have an account?
                  <button class="auth-link" type="button" (click)="goToLogin()">Sign in</button>
                </p>
              </form>
            </div>

            <p class="auth-legal">
              By creating an account you agree to our Terms &amp; Privacy Policy.
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
        background: #0b1d73;
      }

      .auth-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .auth-hero {
        width: 100%;
        padding-bottom: 1.75rem;
        background: #0b1d73;
      }

      .auth-surface {
        flex: 1;
        margin-top: -0.08rem;
        padding-top: 1.25rem;
        background: #f4f7ff;
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

      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .name-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.8rem;
      }

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
        min-height: 1.45rem;
        display: flex;
        align-items: center;
        margin: 0 0 0.45rem;
      }

      .auth-feedback--visible {
        min-height: auto;
      }

      .auth-error {
        display: block;
        margin: 0;
        line-height: 1.35;
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

      .auth-login-copy {
        margin: 1.25rem 0 0;
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

      .auth-legal {
        margin: 1.2rem auto 0;
        text-align: center;
        color: rgba(55, 73, 109, 0.76);
        font-size: 0.88rem;
        line-height: 1.45;
        padding: 0 0.6rem 0;
      }

      @media (max-width: 420px) {
        .name-grid {
          grid-template-columns: 1fr;
          gap: 0;
        }
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
export class RegisterPage implements OnDestroy {
  private static readonly errorDismissDelayMs = 3500;

  readonly form = this.formBuilder.nonNullable.group(
    {
      first_name: ['', [trimmedRequiredValidator]],
      last_name: ['', [trimmedRequiredValidator]],
      email: ['', [trimmedRequiredValidator, emailFormatValidator]],
      phone_number: ['', [optionalPhoneValidator]],
      password: ['', [trimmedRequiredValidator, passwordStrengthValidator]],
      confirm_password: ['', [trimmedRequiredValidator]],
    },
    { validators: [RegisterPage.passwordMatchValidator] }
  );

  loading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  private errorDismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
  ) {
    if (this.authService.isAuthenticatedSnapshot || !!this.authService.accessTokenSnapshot) {
      void this.router.navigateByUrl('/tabs/more', { replaceUrl: true });
    }
  }

  get canSubmit(): boolean {
    return this.form.valid && !this.loading;
  }

  get showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.touched && (control.hasError('required') || control.hasError('email'));
  }

  get emailErrorMessage(): string {
    const control = this.form.controls.email;
    if (control.hasError('required')) {
      return 'Enter your email address.';
    }

    return 'Enter a valid email address.';
  }

  get showPhoneError(): boolean {
    const control = this.form.controls.phone_number;
    return control.touched && control.hasError('invalidPhone');
  }

  get phoneErrorMessage(): string {
    return 'Enter a valid phone number.';
  }

  get showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.touched && (control.hasError('required') || control.hasError('minlength'));
  }

  get passwordErrorMessage(): string {
    const control = this.form.controls.password;
    if (control.hasError('required')) {
      return 'Enter a password to continue.';
    }

    return `Use at least ${AUTH_PASSWORD_MIN_LENGTH} characters.`;
  }

  get showConfirmRequiredError(): boolean {
    const control = this.form.controls.confirm_password;
    return control.touched && control.hasError('required');
  }

  get showPasswordMismatchError(): boolean {
    const control = this.form.controls.confirm_password;
    return control.touched && this.form.hasError('passwordMismatch') && !control.hasError('required');
  }

  get passwordToggleLabel(): string {
    return this.showPassword ? 'Hide password' : 'Show password';
  }

  get confirmPasswordToggleLabel(): string {
    return this.showConfirmPassword ? 'Hide password' : 'Show password';
  }

  ngOnDestroy(): void {
    this.clearErrorDismissTimer();
  }

  showControlError(controlName: 'first_name' | 'last_name'): boolean {
    const control = this.form.controls[controlName];
    return control.touched && control.hasError('required');
  }

  submit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.clearErrorMessage();
    this.authService.register(this.getRegisterPayload()).subscribe({
      next: () => {
        void this.router.navigateByUrl('/tabs/more', { replaceUrl: true });
      },
      error: (error: unknown) => {
        this.setErrorMessage(this.getRegisterErrorMessage(error));
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  clearErrorMessage(): void {
    this.clearErrorDismissTimer();
    this.errorMessage = '';
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  private getRegisterPayload() {
    const value = this.form.getRawValue();
    const trimmedPhoneNumber = value.phone_number.trim();
    return {
      first_name: value.first_name.trim(),
      last_name: value.last_name.trim(),
      email: value.email.trim(),
      password: value.password,
      confirm_password: value.confirm_password,
      ...(trimmedPhoneNumber ? { phone_number: trimmedPhoneNumber } : {}),
    };
  }

  private getRegisterErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      const phoneError = extractFirstFieldError(error.error, 'phone_number');
      if (phoneError) {
        return phoneError || 'Enter a valid phone number.';
      }

      const emailError = extractFirstFieldError(error.error, 'email');
      if (emailError) {
        return emailError.toLowerCase().includes('exist')
          ? 'An account already exists for this email.'
          : emailError;
      }

      const passwordError =
        extractFirstFieldError(error.error, 'password') ||
        extractFirstFieldError(error.error, 'confirm_password');
      if (passwordError) {
        return passwordError;
      }

      return 'Please review your details and try again.';
    }

    return getAuthNetworkMessage('create your account', error);
  }

  private setErrorMessage(message: string): void {
    this.clearErrorDismissTimer();
    this.errorMessage = message;
    this.errorDismissTimer = setTimeout(() => {
      this.errorMessage = '';
      this.errorDismissTimer = null;
    }, RegisterPage.errorDismissDelayMs);
  }

  private clearErrorDismissTimer(): void {
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
      this.errorDismissTimer = null;
    }
  }

  private static passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value ?? '';
    const confirmPassword = group.get('confirm_password')?.value ?? '';
    return password && confirmPassword && password !== confirmPassword
      ? { passwordMismatch: true }
      : null;
  }
}
