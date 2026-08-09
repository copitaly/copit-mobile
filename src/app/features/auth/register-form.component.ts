import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { LEGAL_LINKS } from '../../core/constants/legal-links';
import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { AuthService } from '../../core/services/auth.service';
import {
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_FALLBACK_RETURN_URL,
  extractFirstFieldError,
  getAuthTranslatedNetworkMessage,
  mapKnownAuthError,
  passwordStrengthValidator,
  sanitizeAuthReturnUrl,
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
  selector: 'app-register-form',
  imports: [CommonModule, ReactiveFormsModule, IonicModule, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div
      class="register-form-shell"
      [class.register-form-shell--embedded]="appearance === 'embedded'"
      data-testid="register-form-shell"
    >
      <div *ngIf="heading" class="register-form-heading">
        <h2 data-testid="register-form-heading">{{ heading }}</h2>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
        <div class="name-grid" data-testid="register-name-grid">
          <div class="field-group">
            <label class="auth-label" for="register-first-name">{{ 'auth.firstName' | t }}</label>
            <ion-item fill="solid" class="auth-field">
              <ion-input
                id="register-first-name"
                formControlName="first_name"
                [placeholder]="'auth.firstNamePlaceholder' | t"
                autocomplete="given-name"
                enterkeyhint="next"
                (ionInput)="clearErrorMessage()"
              ></ion-input>
            </ion-item>
            <p class="field-error" *ngIf="showControlError('first_name')" aria-live="polite">
              {{ 'validation.firstNameRequired' | t }}
            </p>
          </div>

          <div class="field-group">
            <label class="auth-label" for="register-last-name">{{ 'auth.lastName' | t }}</label>
            <ion-item fill="solid" class="auth-field">
              <ion-input
                id="register-last-name"
                formControlName="last_name"
                [placeholder]="'auth.lastNamePlaceholder' | t"
                autocomplete="family-name"
                enterkeyhint="next"
                (ionInput)="clearErrorMessage()"
              ></ion-input>
            </ion-item>
            <p class="field-error" *ngIf="showControlError('last_name')" aria-live="polite">
              {{ 'validation.lastNameRequired' | t }}
            </p>
          </div>
        </div>

        <div class="field-group">
          <label class="auth-label" for="register-email">{{ 'auth.email' | t }} *</label>
          <ion-item fill="solid" class="auth-field">
            <ion-input
              id="register-email"
              formControlName="email"
              type="email"
              [placeholder]="'auth.emailPlaceholder' | t"
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
          <label class="auth-label" for="register-phone">{{ 'auth.phoneNumberOptional' | t }}</label>
          <ion-item fill="solid" class="auth-field">
            <ion-input
              id="register-phone"
              formControlName="phone_number"
              [placeholder]="'auth.phoneNumberPlaceholder' | t"
              autocomplete="tel"
              inputmode="tel"
              enterkeyhint="next"
              (ionInput)="clearErrorMessage()"
            ></ion-input>
          </ion-item>
          <p class="field-error" *ngIf="showPhoneError" aria-live="polite">{{ phoneErrorMessage }}</p>
        </div>

        <div class="field-group">
          <label class="auth-label" for="register-password">{{ 'auth.password' | t }}</label>
          <ion-item fill="solid" class="auth-field">
            <ion-input
              id="register-password"
              formControlName="password"
              [type]="showPassword ? 'text' : 'password'"
              [placeholder]="'auth.passwordPlaceholder' | t"
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
          <label class="auth-label" for="register-confirm-password">{{ 'auth.confirmPassword' | t }}</label>
          <ion-item fill="solid" class="auth-field">
            <ion-input
              id="register-confirm-password"
              formControlName="confirm_password"
              [type]="showConfirmPassword ? 'text' : 'password'"
              [placeholder]="'auth.confirmPasswordPlaceholder' | t"
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
          <p class="field-error" *ngIf="showConfirmRequiredError" aria-live="polite">{{ 'validation.confirmPasswordRequired' | t }}</p>
          <p class="field-error" *ngIf="showPasswordMismatchError" aria-live="polite">{{ 'validation.passwordMismatch' | t }}</p>
        </div>

        <div class="auth-feedback" [class.auth-feedback--visible]="!!errorMessage" aria-live="polite">
          <ion-text color="danger" *ngIf="errorMessage" class="auth-error">
            {{ errorMessage }}
          </ion-text>
        </div>

        <ion-button expand="block" type="submit" class="auth-submit" [disabled]="!canSubmit">
          <ion-spinner *ngIf="loading" slot="start" name="crescent"></ion-spinner>
          <span>{{ loading ? ('auth.creatingAccount' | t) : ('auth.createAccountAction' | t) }}</span>
        </ion-button>
      </form>

      <div
        *ngIf="showFooter"
        class="register-footer"
        [class.register-footer--embedded]="appearance === 'embedded'"
        data-testid="register-footer"
      >
        <p class="auth-login-copy">
          {{ 'auth.alreadyHaveAccount' | t }}
          <button class="auth-link" type="button" (click)="goToLogin()">{{ 'auth.signIn' | t }}</button>
        </p>

        <p class="auth-legal">
          <span>{{ 'auth.termsPrivacyCreateAccountPrefix' | t }}</span>
          <span>&nbsp;</span>
          <a
            class="auth-legal-link"
            [href]="termsUrl"
            [attr.aria-label]="'auth.openTermsPolicyAria' | t"
            (click)="openTerms($event)"
          >
            {{ 'auth.termsLabel' | t }}
          </a>
          <span class="auth-legal-group">
            <span>&nbsp;{{ 'auth.termsPrivacyJoiner' | t }}&nbsp;</span>
            <a
              class="auth-legal-link"
              [href]="privacyPolicyUrl"
              [attr.aria-label]="'auth.openPrivacyPolicyAria' | t"
              (click)="openPrivacyPolicy($event)"
            >
              {{ 'auth.privacyPolicyLabel' | t }}
            </a>
            <span>.</span>
          </span>
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .register-form-shell,
      .auth-form,
      .field-group,
      .register-footer,
      .register-form-heading {
        display: flex;
        flex-direction: column;
      }

      .register-form-shell {
        gap: 0;
      }

      .register-form-heading {
        margin: 0 0 0.9rem;
      }

      .register-form-heading h2 {
        margin: 0;
        color: #081f5c;
        font-size: 1.12rem;
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -0.01em;
      }

      .auth-form {
        gap: 0.08rem;
      }

      .name-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.8rem;
      }

      .field-error {
        margin: 0 0 0.58rem;
      }

      .auth-feedback {
        min-height: 0;
        margin: 0 0 0.35rem;
      }

      .auth-feedback--visible {
        min-height: auto;
      }

      .auth-submit:active {
        transform: translateY(1px);
      }

      .register-footer {
        gap: 0;
        margin-top: 0.6rem;
      }

      .auth-login-copy {
        margin: 0.45rem 0 0;
        text-align: center;
        color: #41557a;
        font-size: 1rem;
        line-height: 1.45;
      }

      .auth-legal {
        margin: 0.72rem auto 0;
        padding: 0 0.2rem;
        text-align: center;
        color: rgba(55, 73, 109, 0.76);
        font-size: 0.84rem;
        line-height: 1.45;
      }

      .auth-legal-group {
        white-space: nowrap;
      }

      .auth-legal-link {
        display: inline;
        padding: 0.08rem 0.04rem;
        margin: 0 -0.04rem;
        color: #0b2f80;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 0.12rem;
        line-height: inherit;
        white-space: nowrap;
      }

      .auth-legal-link:focus-visible {
        outline: 2px solid rgba(11, 47, 128, 0.28);
        outline-offset: 2px;
        border-radius: 0.35rem;
      }

      .register-form-shell--embedded .register-footer {
        margin-top: 0.45rem;
      }

      @media (max-width: 420px) {
        .name-grid {
          grid-template-columns: 1fr;
          gap: 0;
        }
      }
    `,
  ],
})
export class RegisterFormComponent implements OnDestroy {
  private static readonly errorDismissDelayMs = 3500;

  @Input() appearance: 'standalone' | 'embedded' = 'standalone';
  @Input() showFooter = true;
  @Input() returnUrl = AUTH_FALLBACK_RETURN_URL;
  @Input() heading = '';

  readonly form = this.formBuilder.nonNullable.group(
    {
      first_name: ['', [trimmedRequiredValidator]],
      last_name: ['', [trimmedRequiredValidator]],
      email: ['', [trimmedRequiredValidator, emailFormatValidator]],
      phone_number: ['', [optionalPhoneValidator]],
      password: ['', [trimmedRequiredValidator, passwordStrengthValidator]],
      confirm_password: ['', [trimmedRequiredValidator]],
    },
    { validators: [RegisterFormComponent.passwordMatchValidator] }
  );

  loading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  readonly termsUrl = LEGAL_LINKS.termsAndConditions;
  readonly privacyPolicyUrl = LEGAL_LINKS.privacyPolicy;
  private errorDismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly localeService: LocaleService
  ) {}

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
      return this.localeService.translate('validation.emailRequired');
    }

    return this.localeService.translate('validation.emailInvalid');
  }

  get showPhoneError(): boolean {
    const control = this.form.controls.phone_number;
    return control.touched && control.hasError('invalidPhone');
  }

  get phoneErrorMessage(): string {
    return this.localeService.translate('validation.phoneInvalid');
  }

  get showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.touched && (control.hasError('required') || control.hasError('minlength'));
  }

  get passwordErrorMessage(): string {
    const control = this.form.controls.password;
    if (control.hasError('required')) {
      return this.localeService.translate('validation.passwordRequired');
    }

    return this.localeService.translate('validation.passwordTooShort', { count: AUTH_PASSWORD_MIN_LENGTH });
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
    return this.showPassword
      ? this.localeService.translate('auth.hidePassword')
      : this.localeService.translate('auth.showPassword');
  }

  get confirmPasswordToggleLabel(): string {
    return this.showConfirmPassword
      ? this.localeService.translate('auth.hidePassword')
      : this.localeService.translate('auth.showPassword');
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
        void this.router.navigateByUrl(this.sanitizedReturnUrl, { replaceUrl: true });
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
    if (this.isEmbeddedProfileFlow) {
      void this.router.navigate(['/tabs/profile'], { replaceUrl: true });
      return;
    }

    void this.router.navigate(['/login'], {
      queryParams: this.sanitizedReturnUrl === AUTH_FALLBACK_RETURN_URL ? undefined : { returnUrl: this.sanitizedReturnUrl },
    });
  }

  openTerms(event: Event): void {
    event.preventDefault();
    void this.openLegalRoute(this.termsUrl);
  }

  openPrivacyPolicy(event: Event): void {
    event.preventDefault();
    void this.openLegalRoute(this.privacyPolicyUrl);
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
        return phoneError || this.localeService.translate('validation.phoneInvalid');
      }

      const emailError = extractFirstFieldError(error.error, 'email');
      if (emailError) {
        return emailError.toLowerCase().includes('exist')
          ? this.localeService.translate('errors.authRegisterFailed')
          : emailError;
      }

      const passwordError =
        extractFirstFieldError(error.error, 'password') ||
        extractFirstFieldError(error.error, 'confirm_password');
      if (passwordError) {
        return passwordError;
      }

      return this.localeService.translate('validation.correctHighlighted');
    }

    return getAuthTranslatedNetworkMessage(this.localeService, 'register', error);
  }

  private setErrorMessage(message: string): void {
    this.clearErrorDismissTimer();
    this.errorMessage = message;
    this.errorDismissTimer = setTimeout(() => {
      this.errorMessage = '';
      this.errorDismissTimer = null;
    }, RegisterFormComponent.errorDismissDelayMs);
  }

  private clearErrorDismissTimer(): void {
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
      this.errorDismissTimer = null;
    }
  }

  private get sanitizedReturnUrl(): string {
    return sanitizeAuthReturnUrl(this.returnUrl, AUTH_FALLBACK_RETURN_URL);
  }

  private get isEmbeddedProfileFlow(): boolean {
    return this.appearance === 'embedded' && this.sanitizedReturnUrl === '/tabs/profile';
  }

  private static passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value ?? '';
    const confirmPassword = group.get('confirm_password')?.value ?? '';
    return password && confirmPassword && password !== confirmPassword
      ? { passwordMismatch: true }
      : null;
  }

  private openLegalRoute(route: string): Promise<boolean> {
    return this.router.navigateByUrl(route, {
      state: {
        fallbackRoute: this.getLegalFallbackRoute(),
      },
    });
  }

  private getLegalFallbackRoute(): string {
    if (this.isEmbeddedProfileFlow) {
      return '/tabs/profile?authMode=register';
    }

    return this.sanitizedReturnUrl === AUTH_FALLBACK_RETURN_URL
      ? '/register'
      : `/register?returnUrl=${encodeURIComponent(this.sanitizedReturnUrl)}`;
  }
}
