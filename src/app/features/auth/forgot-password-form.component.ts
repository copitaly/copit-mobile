import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewChecked, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, Input, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import {
  emailFormatValidator,
  extractErrorDetail,
  extractFirstFieldError,
  getAuthNetworkMessage,
  trimmedRequiredValidator,
} from './auth-form.utils';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-forgot-password-form',
  template: `
    <div
      class="recovery-form-shell"
      [class.recovery-form-shell--embedded]="appearance === 'embedded'"
      data-testid="forgot-password-form-shell"
    >
      <div *ngIf="heading && !submitted" class="recovery-form-heading">
        <h2 data-testid="forgot-password-form-heading">{{ heading }}</h2>
      </div>

      <ng-container *ngIf="!submitted; else submittedState">
        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form" novalidate>
          <div class="field-group">
            <label class="auth-label" for="forgot-email">Email</label>
            <ion-item fill="solid" class="auth-field auth-field--pill">
              <ion-input
                id="forgot-email"
                formControlName="email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                inputmode="email"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                enterkeyhint="done"
                (ionInput)="clearMessage()"
              ></ion-input>
            </ion-item>
            <p class="field-error" *ngIf="showEmailError" aria-live="polite">{{ emailErrorMessage }}</p>
          </div>

          <div class="auth-feedback" [class.auth-feedback--visible]="!!message" aria-live="polite">
            <ion-text [color]="messageTone" *ngIf="message" class="auth-message">
              {{ message }}
            </ion-text>
          </div>

          <ion-button expand="block" type="submit" class="auth-submit" [disabled]="!canSubmit">
            <ion-spinner *ngIf="loading" slot="start" name="crescent"></ion-spinner>
            <span>{{ loading ? 'Sending...' : 'Send reset link' }}</span>
          </ion-button>
        </form>

        <div class="auth-switches" data-testid="forgot-password-auth-links">
          <p class="auth-switches__copy">
            Remembered your password?
            <button
              type="button"
              class="auth-link"
              aria-label="Return to Sign In"
              (click)="goToLogin()"
            >
              Sign In
            </button>
          </p>

          <p class="auth-switches__copy">
            Don't have an account?
            <button
              type="button"
              class="auth-link"
              aria-label="Open Create Account"
              (click)="goToRegister()"
            >
              Create Account
            </button>
          </p>
        </div>
      </ng-container>

      <ng-template #submittedState>
        <div class="status-copy" aria-live="polite" role="status" data-testid="forgot-password-success">
          <span class="status-copy__icon" aria-hidden="true">✓</span>
          <h2 #successHeading tabindex="-1">Check your email</h2>
          <p>
            We've sent password reset instructions if an account exists for that address.
          </p>
          <p class="status-copy__support">
            Open your email and follow the link to create a new password.
          </p>
          <button type="button" class="auth-link auth-link--center" (click)="goToLogin()">
            Back to Sign In
          </button>
          <button
            type="button"
            class="auth-link auth-link--center auth-link--secondary"
            aria-label="Open Create Account"
            (click)="goToRegister()"
          >
            Create Account
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .recovery-form-shell,
      .auth-form,
      .field-group,
      .recovery-form-heading,
      .status-copy {
        display: flex;
        flex-direction: column;
      }

      .recovery-form-shell {
        gap: 0;
      }

      .recovery-form-heading {
        margin: 0 0 0.82rem;
      }

      .recovery-form-heading h2 {
        margin: 0;
        color: #081f5c;
        font-size: 1.12rem;
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -0.01em;
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

      .auth-switches {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        margin-top: 1rem;
        text-align: center;
      }

      .auth-switches__copy {
        margin: 0;
        color: rgba(8, 31, 92, 0.62);
        font-size: 0.95rem;
        line-height: 1.45;
      }

      .status-copy {
        text-align: center;
        color: #304468;
        align-items: center;
        gap: 0.72rem;
        padding: 0.22rem 0 0.12rem;
      }

      .status-copy h2,
      .status-copy p {
        margin: 0;
      }

      .status-copy__icon {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(223, 170, 34, 0.14);
        color: #0f6a5b;
        font-size: 1.1rem;
        font-weight: 700;
      }

      .status-copy h2 {
        color: #081f5c;
        font-size: 1.28rem;
        line-height: 1.18;
        outline: none;
      }

      .status-copy p {
        max-width: 24rem;
        color: rgba(8, 31, 92, 0.68);
        line-height: 1.5;
      }

      .status-copy__support {
        margin-top: -0.16rem;
      }

      .auth-link--center {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin: 0.15rem auto 0;
      }

      .auth-link--secondary {
        margin-top: -0.05rem;
      }
    `,
  ],
})
export class ForgotPasswordFormComponent implements AfterViewChecked {
  @Input() appearance: 'standalone' | 'embedded' = 'standalone';
  @Input() heading = '';
  @ViewChild('successHeading') successHeading?: ElementRef<HTMLHeadingElement>;

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [trimmedRequiredValidator, emailFormatValidator]],
  });

  loading = false;
  submitted = false;
  message = '';
  messageTone: 'danger' | 'medium' = 'danger';
  private successHeadingFocused = false;

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
    return control.touched && (control.hasError('required') || control.hasError('email'));
  }

  get emailErrorMessage(): string {
    const control = this.form.controls.email;
    if (control.hasError('required')) {
      return 'Enter your email address.';
    }

    return 'Enter a valid email address.';
  }

  ngAfterViewChecked(): void {
    if (!this.submitted || this.successHeadingFocused) {
      return;
    }

    this.successHeading?.nativeElement.focus();
    this.successHeadingFocused = true;
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
          this.successHeadingFocused = false;
        },
        error: (error: unknown) => {
          if (this.shouldRespondNeutrally(error)) {
            this.submitted = true;
            this.successHeadingFocused = false;
            this.loading = false;
            return;
          }
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
    void this.router.navigate(['/tabs/profile'], { replaceUrl: true });
  }

  goToRegister(): void {
    void this.router.navigate(['/tabs/profile'], {
      queryParams: { authMode: 'register' },
      replaceUrl: true,
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return 'Enter a valid email address.';
    }

    return getAuthNetworkMessage('send reset instructions', error);
  }

  private shouldRespondNeutrally(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    const detail = extractErrorDetail(error).toLowerCase();
    const emailError = extractFirstFieldError(error.error, 'email').toLowerCase();
    const combined = `${detail} ${emailError}`;

    return (
      (error.status === 404 || error.status === 400) &&
      (
        combined.includes('not found') ||
        combined.includes('no account') ||
        combined.includes('no user') ||
        combined.includes('unknown email') ||
        combined.includes('does not exist')
      )
    );
  }
}
