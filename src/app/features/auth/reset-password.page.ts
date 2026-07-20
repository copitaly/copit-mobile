import { CommonModule, formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { PasswordResetValidateResponse } from '../../core/models/user.model';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

type ResetViewState = 'loading' | 'valid' | 'invalid' | 'expired' | 'success';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-reset-password',
  template: `
    <ion-page>
      <ion-content fullscreen class="auth-content">
        <div class="auth-hero app-header app-header--inner">
          <app-mobile-header
            title="Reset password"
            [subtitle]="headerSubtitle"
            fallbackRoute="/login"
          ></app-mobile-header>
        </div>

        <div class="surface auth-surface">
          <div class="surface__content auth-surface__content">
            <div class="auth-card">
              <ng-container [ngSwitch]="state">
                <div *ngSwitchCase="'loading'" class="status-copy status-copy--loading">
                  <ion-spinner name="crescent"></ion-spinner>
                  <h2>Checking your reset link</h2>
                  <p>Please wait while we verify this password reset request.</p>
                </div>

                <div *ngSwitchCase="'invalid'" class="status-copy">
                  <h2>Reset link unavailable</h2>
                  <p>{{ stateMessage || 'This password reset link is invalid or expired.' }}</p>
                  <div class="action-stack">
                    <ion-button expand="block" class="auth-submit" (click)="goToForgotPassword()">
                      Request a new link
                    </ion-button>
                    <button type="button" class="auth-link auth-link--center" (click)="goToLogin()">
                      Go to login
                    </button>
                  </div>
                </div>

                <div *ngSwitchCase="'expired'" class="status-copy">
                  <h2>Reset link expired</h2>
                  <p>{{ stateMessage || 'This password reset link has expired. Request a new one to continue.' }}</p>
                  <div class="action-stack">
                    <ion-button expand="block" class="auth-submit" (click)="goToForgotPassword()">
                      Request a new link
                    </ion-button>
                    <button type="button" class="auth-link auth-link--center" (click)="goToLogin()">
                      Go to login
                    </button>
                  </div>
                </div>

                <div *ngSwitchCase="'success'" class="status-copy">
                  <h2>Password updated</h2>
                  <p>Your password has been reset successfully. Sign in with your new password.</p>
                  <ion-button expand="block" class="auth-submit" (click)="goToLogin()">
                    Go to login
                  </ion-button>
                </div>

                <form *ngSwitchCase="'valid'" [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
                  <div class="status-copy status-copy--inline">
                    <p *ngIf="maskedRecipient">
                      Resetting password for <strong>{{ maskedRecipient }}</strong>
                    </p>
                    <p *ngIf="expiresAtDisplay">Link available until {{ expiresAtDisplay }}</p>
                  </div>

                  <div class="field-group">
                    <label class="auth-label" for="reset-password">New password</label>
                    <ion-item fill="solid" class="auth-field">
                      <ion-input
                        id="reset-password"
                        formControlName="new_password"
                        [type]="showNewPassword ? 'text' : 'password'"
                        placeholder="Enter your new password"
                        autocomplete="new-password"
                        (ionInput)="clearInlineMessage()"
                      ></ion-input>
                      <button
                        type="button"
                        class="password-toggle"
                        aria-label="Toggle new password visibility"
                        (click)="showNewPassword = !showNewPassword"
                      >
                        <ion-icon [name]="showNewPassword ? 'eye-off-outline' : 'eye-outline'" aria-hidden="true"></ion-icon>
                      </button>
                    </ion-item>
                    <p class="field-error" *ngIf="showNewPasswordRequiredError">Enter a new password.</p>
                  </div>

                  <div class="field-group">
                    <label class="auth-label" for="reset-confirm-password">Confirm new password</label>
                    <ion-item fill="solid" class="auth-field">
                      <ion-input
                        id="reset-confirm-password"
                        formControlName="confirm_password"
                        [type]="showConfirmPassword ? 'text' : 'password'"
                        placeholder="Confirm your new password"
                        autocomplete="new-password"
                        (ionInput)="clearInlineMessage()"
                      ></ion-input>
                      <button
                        type="button"
                        class="password-toggle"
                        aria-label="Toggle confirm password visibility"
                        (click)="showConfirmPassword = !showConfirmPassword"
                      >
                        <ion-icon [name]="showConfirmPassword ? 'eye-off-outline' : 'eye-outline'" aria-hidden="true"></ion-icon>
                      </button>
                    </ion-item>
                    <p class="field-error" *ngIf="showConfirmRequiredError">Confirm your new password.</p>
                    <p class="field-error" *ngIf="showPasswordMismatchError">Your passwords do not match.</p>
                  </div>

                  <div class="auth-feedback" [class.auth-feedback--visible]="!!inlineMessage">
                    <ion-text [color]="inlineMessageTone" *ngIf="inlineMessage" class="auth-message">
                      {{ inlineMessage }}
                    </ion-text>
                  </div>

                  <ion-button expand="block" type="submit" class="auth-submit" [disabled]="!canSubmit">
                    <ion-spinner *ngIf="submitting" slot="start" name="crescent"></ion-spinner>
                    <span>{{ submitting ? 'Updating password...' : 'Reset password' }}</span>
                  </ion-button>
                </form>
              </ng-container>
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
      .field-group,
      .action-stack {
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

      .status-copy {
        text-align: center;
        color: #304468;
      }

      .status-copy--loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }

      .status-copy--inline {
        text-align: left;
        margin: 0 0 1rem;
      }

      .status-copy h2 {
        margin: 0 0 0.55rem;
        font-size: 1.2rem;
        color: #0b1d73;
      }

      .status-copy p {
        margin: 0.15rem 0 0;
        line-height: 1.5;
      }

      .action-stack {
        gap: 0.8rem;
        margin-top: 1.15rem;
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
        text-align: center;
      }
    `,
  ],
})
export class ResetPasswordPage implements OnInit {
  readonly form = this.formBuilder.nonNullable.group(
    {
      new_password: ['', Validators.required],
      confirm_password: ['', Validators.required],
    },
    {
      validators: (group) => {
        const newPassword = group.get('new_password')?.value ?? '';
        const confirmPassword = group.get('confirm_password')?.value ?? '';
        return newPassword && confirmPassword && newPassword !== confirmPassword
          ? { passwordMismatch: true }
          : null;
      },
    }
  );

  state: ResetViewState = 'loading';
  stateMessage = '';
  inlineMessage = '';
  inlineMessageTone: 'danger' | 'medium' = 'danger';
  submitting = false;
  showNewPassword = false;
  showConfirmPassword = false;
  maskedRecipient = '';
  expiresAtDisplay = '';
  private uid = '';
  private token = '';

  constructor(
    private readonly authService: AuthService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
  ) {}

  get headerSubtitle(): string {
    if (this.state === 'success') {
      return 'Your password is ready to use';
    }
    if (this.state === 'loading') {
      return 'Verifying your reset link';
    }
    if (this.state === 'valid') {
      return 'Choose a new password';
    }
    return 'Request a new link if this one is no longer available';
  }

  get canSubmit(): boolean {
    return this.form.valid && !this.submitting && this.state === 'valid';
  }

  get showNewPasswordRequiredError(): boolean {
    const control = this.form.controls.new_password;
    return control.touched && control.hasError('required');
  }

  get showConfirmRequiredError(): boolean {
    const control = this.form.controls.confirm_password;
    return control.touched && control.hasError('required');
  }

  get showPasswordMismatchError(): boolean {
    const control = this.form.controls.confirm_password;
    return control.touched && this.form.hasError('passwordMismatch') && !control.hasError('required');
  }

  ngOnInit(): void {
    this.uid = this.activatedRoute.snapshot.paramMap.get('uid') ?? '';
    this.token = this.activatedRoute.snapshot.paramMap.get('token') ?? '';

    if (!this.uid || !this.token) {
      this.state = 'invalid';
      this.stateMessage = 'This password reset link is invalid or incomplete.';
      return;
    }

    this.authService.validatePasswordResetToken(this.uid, this.token).subscribe({
      next: (response) => {
        this.applyValidatedToken(response);
        this.state = 'valid';
      },
      error: (error: unknown) => {
        this.applyLinkError(error);
      },
    });
  }

  submit(): void {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.clearInlineMessage();
    this.authService.confirmPasswordReset(this.uid, this.token, this.form.getRawValue()).subscribe({
      next: () => {
        this.authService.clearLocalAuthState();
        this.state = 'success';
      },
      error: (error: unknown) => {
        this.applySubmitError(error);
        this.submitting = false;
      },
      complete: () => {
        this.submitting = false;
      },
    });
  }

  clearInlineMessage(): void {
    this.inlineMessage = '';
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  goToForgotPassword(): void {
    void this.router.navigate(['/forgot-password']);
  }

  private applyValidatedToken(response: PasswordResetValidateResponse): void {
    this.maskedRecipient = response.email?.trim() ?? '';
    this.expiresAtDisplay = response.expires_at
      ? formatDate(response.expires_at, 'MMM d, y, h:mm a', 'en-GB')
      : '';
  }

  private applyLinkError(error: unknown): void {
    const detail = this.getErrorDetail(error);
    const normalized = detail.toLowerCase();

    if (normalized.includes('expired') && !normalized.includes('invalid')) {
      this.state = 'expired';
      this.stateMessage = detail || 'This password reset link has expired.';
      return;
    }

    this.state = normalized.includes('expired') ? 'expired' : 'invalid';
    this.stateMessage = detail || 'This password reset link is invalid or expired.';
  }

  private applySubmitError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.inlineMessageTone = 'danger';
      this.inlineMessage = 'We could not reset your password right now. Please try again.';
      return;
    }

    if (error.status === 400) {
      const confirmPasswordError = this.extractFirstFieldError(error.error, 'confirm_password');
      const newPasswordError = this.extractFirstFieldError(error.error, 'new_password');
      const detail = this.getErrorDetail(error);

      if (confirmPasswordError) {
        this.inlineMessageTone = 'danger';
        this.inlineMessage = confirmPasswordError;
        return;
      }

      if (newPasswordError) {
        this.inlineMessageTone = 'danger';
        this.inlineMessage = newPasswordError;
        return;
      }

      if (detail) {
        this.inlineMessageTone = 'danger';
        this.inlineMessage = detail;
        if (detail.toLowerCase().includes('invalid') || detail.toLowerCase().includes('expired')) {
          this.applyLinkError(error);
        }
        return;
      }
    }

    this.inlineMessageTone = 'danger';
    this.inlineMessage = 'We could not reset your password right now. Please try again.';
  }

  private getErrorDetail(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return '';
    }

    const detail = error.error?.detail;
    if (typeof detail === 'string') {
      return detail;
    }

    return '';
  }

  private extractFirstFieldError(errorBody: unknown, field: string): string {
    if (!errorBody || typeof errorBody !== 'object' || !(field in (errorBody as Record<string, unknown>))) {
      return '';
    }

    const value = (errorBody as Record<string, unknown>)[field];
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    if (typeof value === 'string') {
      return value;
    }
    return '';
  }
}
