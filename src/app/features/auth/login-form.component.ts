import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonInput, IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import {
  AUTH_FALLBACK_RETURN_URL,
  getAuthNetworkMessage,
  sanitizeAuthReturnUrl,
  trimmedRequiredValidator,
} from './auth-form.utils';

@Component({
  standalone: true,
  selector: 'app-login-form',
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="login-form-shell" [class.login-form-shell--embedded]="appearance === 'embedded'" data-testid="login-form-shell">
      <div *ngIf="heading" class="login-form-heading">
        <h2 data-testid="login-form-heading">{{ heading }}</h2>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
        <div class="field-group">
          <label class="auth-label" [attr.for]="identifierInputId">Email or phone number</label>
          <ion-item fill="solid" class="auth-field auth-field--pill">
            <ion-input
              #identifierInput
              [id]="identifierInputId"
              formControlName="identifier"
              placeholder="you@example.com"
              autocomplete="username"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="next"
              (keydown.enter)="focusPasswordField()"
              (ionInput)="clearErrorMessage()"
            ></ion-input>
          </ion-item>
          <p class="field-error" *ngIf="showIdentifierError" aria-live="polite">
            Enter your email or phone number.
          </p>
        </div>

        <div class="field-group">
          <label class="auth-label" [attr.for]="passwordInputId">Password</label>
          <ion-item fill="solid" class="auth-field auth-field--pill">
            <ion-input
              #passwordInput
              [id]="passwordInputId"
              formControlName="password"
              [type]="showPassword ? 'text' : 'password'"
              placeholder="Password"
              autocomplete="current-password"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="done"
              (keydown.enter)="submit()"
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
          <p class="field-error" *ngIf="showPasswordError" aria-live="polite">
            Enter your password.
          </p>
        </div>

        <div class="forgot-row">
          <button type="button" class="forgot-link" (click)="onForgotPassword()">
            Forgot password?
          </button>
        </div>

        <div class="auth-feedback" [class.auth-feedback--visible]="!!errorMessage" aria-live="polite">
          <ion-text color="danger" *ngIf="errorMessage" class="auth-error">
            {{ errorMessage }}
          </ion-text>
        </div>

        <ion-button expand="block" type="submit" class="auth-submit" [disabled]="!canSubmit">
          <ion-spinner *ngIf="loading" slot="start" name="crescent"></ion-spinner>
          <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
        </ion-button>
      </form>

      <div
        *ngIf="showFooter"
        class="login-footer"
        [class.login-footer--embedded]="appearance === 'embedded'"
        data-testid="login-footer"
      >
        <p class="auth-register-copy">
          Don't have an account?
          <button class="auth-link" type="button" (click)="goToRegister()">Create an account</button>
        </p>

        <p class="auth-legal">
          By continuing you agree to our Terms &amp; Privacy Policy.
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

      .login-form-shell,
      .auth-form,
      .field-group,
      .login-footer,
      .login-form-heading {
        display: flex;
        flex-direction: column;
      }

      .login-form-shell {
        gap: 0;
      }

      .login-form-heading {
        margin: 0 0 0.9rem;
      }

      .login-form-heading h2 {
        margin: 0;
        color: #081f5c;
        font-size: 1.12rem;
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -0.01em;
      }

      .auth-form {
        gap: 0.1rem;
      }

      .field-error {
        margin: 0 0 0.55rem;
      }

      .forgot-row {
        display: flex;
        justify-content: flex-end;
        margin: -0.02rem 0 0.38rem;
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

      .login-footer {
        gap: 0;
        margin-top: 0.6rem;
      }

      .auth-register-copy {
        margin: 0.4rem 0 0;
        text-align: center;
        color: #41557a;
        font-size: 1rem;
        line-height: 1.45;
      }

      .auth-legal {
        margin: 0.7rem auto 0;
        text-align: center;
        color: rgba(55, 73, 109, 0.76);
        font-size: 0.88rem;
        line-height: 1.45;
        padding: 0 0.4rem;
      }

      .login-form-shell--embedded .login-footer {
        margin-top: 0.45rem;
      }
    `,
  ],
})
export class LoginFormComponent implements OnDestroy {
  private static nextInstanceId = 0;
  private readonly instanceId = ++LoginFormComponent.nextInstanceId;

  @ViewChild('identifierInput', { read: IonInput }) identifierInput?: IonInput;
  @ViewChild('passwordInput', { read: IonInput }) passwordInput?: IonInput;

  @Input() appearance: 'standalone' | 'embedded' = 'standalone';
  @Input() showFooter = true;
  @Input() returnUrl = AUTH_FALLBACK_RETURN_URL;
  @Input() heading = '';

  readonly form = this.formBuilder.nonNullable.group({
    identifier: ['', [trimmedRequiredValidator]],
    password: ['', [trimmedRequiredValidator]],
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

  get identifierInputId(): string {
    return `login-identifier-${this.instanceId}`;
  }

  get passwordInputId(): string {
    return `login-password-${this.instanceId}`;
  }

  get canSubmit(): boolean {
    const { identifier, password } = this.form.getRawValue();
    return !!identifier.trim() && !!password.trim() && !this.loading;
  }

  get showIdentifierError(): boolean {
    const control = this.form.controls.identifier;
    return control.touched && control.hasError('required');
  }

  get showPasswordError(): boolean {
    const control = this.form.controls.password;
    return control.touched && control.hasError('required');
  }

  get passwordToggleLabel(): string {
    return this.showPassword ? 'Hide password' : 'Show password';
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
        void this.router.navigateByUrl(this.sanitizedReturnUrl, { replaceUrl: true });
      },
      error: (error: unknown) => {
        this.setErrorMessage(this.getLoginErrorMessage(error));
        if (this.isCredentialError(error)) {
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
    if (this.isEmbeddedProfileFlow) {
      void this.router.navigate(['/tabs/profile'], {
        queryParams: { authMode: 'register' },
      });
      return;
    }

    void this.router.navigate(['/register'], {
      queryParams: this.sanitizedReturnUrl === AUTH_FALLBACK_RETURN_URL ? undefined : { returnUrl: this.sanitizedReturnUrl },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  clearErrorMessage(): void {
    this.clearErrorDismissTimer();
    this.errorMessage = '';
  }

  onForgotPassword(): void {
    if (this.isEmbeddedProfileFlow) {
      void this.router.navigate(['/tabs/profile'], {
        queryParams: { authMode: 'forgot-password' },
      });
      return;
    }

    void this.router.navigate(['/forgot-password'], {
      queryParams: this.sanitizedReturnUrl === AUTH_FALLBACK_RETURN_URL ? undefined : { returnUrl: this.sanitizedReturnUrl },
    });
  }

  async focusIdentifierField(): Promise<void> {
    await Promise.resolve();
    try {
      await this.identifierInput?.setFocus();
    } catch {
      // IonInput focus can be unavailable in tests or during teardown.
    }
  }

  async focusPasswordField(): Promise<void> {
    await Promise.resolve();
    try {
      await this.passwordInput?.setFocus();
    } catch {
      // IonInput focus can be unavailable in tests or during teardown.
    }
  }

  private get sanitizedReturnUrl(): string {
    return sanitizeAuthReturnUrl(this.returnUrl, AUTH_FALLBACK_RETURN_URL);
  }

  private get isEmbeddedProfileFlow(): boolean {
    return this.appearance === 'embedded' && this.sanitizedReturnUrl === '/tabs/profile';
  }

  private isCredentialError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && (error.status === 400 || error.status === 401);
  }

  private getLoginErrorMessage(error: unknown): string {
    if (this.isCredentialError(error)) {
      return 'Incorrect email or password.';
    }

    return getAuthNetworkMessage('sign you in', error);
  }

  private setErrorMessage(message: string): void {
    this.clearErrorDismissTimer();
    this.errorMessage = message;
    this.errorDismissTimer = setTimeout(() => {
      this.errorMessage = '';
      this.errorDismissTimer = null;
    }, 3500);
  }

  private clearErrorDismissTimer(): void {
    if (this.errorDismissTimer) {
      clearTimeout(this.errorDismissTimer);
      this.errorDismissTimer = null;
    }
  }
}
