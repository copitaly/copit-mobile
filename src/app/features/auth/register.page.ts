import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-register',
  template: `
    <ion-page>
      <ion-content fullscreen class="auth-content">
        <div class="auth-hero app-header app-header--inner">
          <div class="app-header__inner">
            <button class="auth-back app-header__back" type="button" aria-label="Back" (click)="goHome()">
              <ion-icon class="app-back-icon" name="arrow-back" aria-hidden="true"></ion-icon>
            </button>
            <div class="app-header__copy auth-hero__copy">
              <h1 class="app-header__title">Create account</h1>
              <p class="app-header__subtitle">Start giving with your profile</p>
            </div>
          </div>
        </div>

        <div class="surface auth-surface">
          <div class="surface__content auth-surface__content">
            <div class="auth-card">
              <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
                <div class="name-grid">
                  <div class="field-group">
                    <label class="auth-label" for="register-first-name">First name</label>
                    <ion-item fill="solid" class="auth-field">
                      <ion-input
                        id="register-first-name"
                        formControlName="first_name"
                        placeholder="Kwame"
                        autocomplete="given-name"
                        (ionInput)="clearErrorMessage()"
                      ></ion-input>
                    </ion-item>
                    <p class="field-error" *ngIf="showControlError('first_name')">Enter your first name.</p>
                  </div>

                  <div class="field-group">
                    <label class="auth-label" for="register-last-name">Last name</label>
                    <ion-item fill="solid" class="auth-field">
                      <ion-input
                        id="register-last-name"
                        formControlName="last_name"
                        placeholder="Asante"
                        autocomplete="family-name"
                        (ionInput)="clearErrorMessage()"
                      ></ion-input>
                    </ion-item>
                    <p class="field-error" *ngIf="showControlError('last_name')">Enter your last name.</p>
                  </div>
                </div>

                <div class="field-group">
                  <label class="auth-label" for="register-phone">Phone number *</label>
                  <ion-item fill="solid" class="auth-field">
                    <ion-input
                      id="register-phone"
                      formControlName="phone_number"
                      placeholder="+39 333 123 4567"
                      autocomplete="tel"
                      inputmode="tel"
                      (ionInput)="clearErrorMessage()"
                    ></ion-input>
                  </ion-item>
                  <p class="field-error" *ngIf="showControlError('phone_number')">Enter your phone number.</p>
                </div>

                <div class="field-group">
                  <label class="auth-label" for="register-email">Email (optional)</label>
                  <ion-item fill="solid" class="auth-field">
                    <ion-input
                      id="register-email"
                      formControlName="email"
                      type="email"
                      placeholder="you@example.com"
                      autocomplete="email"
                      inputmode="email"
                      (ionInput)="clearErrorMessage()"
                    ></ion-input>
                  </ion-item>
                  <p class="field-error" *ngIf="showEmailError">Enter a valid email address.</p>
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
                  <p class="field-error" *ngIf="showControlError('password')">Enter a password to continue.</p>
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
                      (ionInput)="clearErrorMessage()"
                    ></ion-input>
                    <button
                      type="button"
                      class="password-toggle"
                      aria-label="Toggle confirm password visibility"
                      (click)="toggleConfirmPasswordVisibility()"
                    >
                      <ion-icon [name]="showConfirmPassword ? 'eye-off-outline' : 'eye-outline'" aria-hidden="true"></ion-icon>
                    </button>
                  </ion-item>
                  <p class="field-error" *ngIf="showConfirmRequiredError">Confirm your password.</p>
                  <p class="field-error" *ngIf="showPasswordMismatchError">Your passwords do not match.</p>
                </div>

                <div class="auth-feedback" [class.auth-feedback--visible]="!!errorMessage">
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

      .auth-back {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(6px);
        justify-content: center;
        padding: 0;
        min-height: 40px;
      }

      .auth-back ion-icon {
        font-size: 1.1rem;
      }

      .auth-hero__copy {
        text-align: center;
        align-items: center;
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
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      phone_number: ['', Validators.required],
      email: ['', Validators.email],
      password: ['', Validators.required],
      confirm_password: ['', Validators.required],
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
  ) {}

  get canSubmit(): boolean {
    return this.form.valid && !this.loading;
  }

  get showEmailError(): boolean {
    const control = this.form.controls.email;
    return control.touched && !!control.value.trim() && control.hasError('email');
  }

  get showConfirmRequiredError(): boolean {
    const control = this.form.controls.confirm_password;
    return control.touched && control.hasError('required');
  }

  get showPasswordMismatchError(): boolean {
    const control = this.form.controls.confirm_password;
    return control.touched && this.form.hasError('passwordMismatch') && !control.hasError('required');
  }

  ngOnDestroy(): void {
    this.clearErrorDismissTimer();
  }

  showControlError(controlName: 'first_name' | 'last_name' | 'phone_number' | 'password'): boolean {
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
        void this.router.navigate(['/profile']);
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

  goHome(): void {
    void this.router.navigate(['/home']);
  }

  private getRegisterPayload() {
    const value = this.form.getRawValue();
    return {
      ...value,
      email: value.email.trim() || null,
    };
  }

  private getRegisterErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Something went wrong. Please try again.';
    }

    if (error.status === 400) {
      if (this.hasFieldError(error, 'phone_number')) {
        return 'That phone number is already in use.';
      }

      if (this.hasFieldError(error, 'email')) {
        return 'That email address is already in use or invalid.';
      }

      if (this.hasFieldError(error, 'password') || this.hasFieldError(error, 'confirm_password')) {
        return 'Please review your password details and try again.';
      }

      return 'Please review your details and try again.';
    }

    return 'Something went wrong. Please try again.';
  }

  private hasFieldError(error: HttpErrorResponse, field: string): boolean {
    return typeof error.error === 'object' && error.error !== null && field in error.error;
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
