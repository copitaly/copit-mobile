import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
      <div class="auth-hero">
        <button class="auth-back" type="button" (click)="goHome()">
          <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
          <span>Home</span>
        </button>
        <div class="auth-hero__copy">
          <p class="auth-kicker">New Member</p>
          <h1>Create account</h1>
          <p>Register once to manage your member details from the app.</p>
        </div>
      </div>

      <ion-content fullscreen class="auth-content">
        <div class="auth-card">
          <form [formGroup]="form" (ngSubmit)="submit()">
            <ion-item fill="solid" class="auth-field">
              <ion-input formControlName="first_name" label="First name" labelPlacement="stacked"></ion-input>
            </ion-item>
            <ion-item fill="solid" class="auth-field">
              <ion-input formControlName="last_name" label="Last name" labelPlacement="stacked"></ion-input>
            </ion-item>
            <ion-item fill="solid" class="auth-field">
              <ion-input formControlName="phone_number" label="Phone number" labelPlacement="stacked"></ion-input>
            </ion-item>
            <ion-item fill="solid" class="auth-field">
              <ion-input formControlName="email" type="email" label="Email (optional)" labelPlacement="stacked"></ion-input>
            </ion-item>
            <ion-item fill="solid" class="auth-field">
              <ion-input formControlName="password" type="password" label="Password" labelPlacement="stacked"></ion-input>
            </ion-item>
            <ion-item fill="solid" class="auth-field">
              <ion-input formControlName="confirm_password" type="password" label="Confirm password" labelPlacement="stacked"></ion-input>
            </ion-item>

            <ion-text color="danger" *ngIf="errorMessage" class="auth-error">
              {{ errorMessage }}
            </ion-text>

            <ion-button expand="block" type="submit" class="auth-submit" [disabled]="form.invalid || loading">
              <ion-spinner *ngIf="loading" slot="start" name="crescent"></ion-spinner>
              <span>Create account</span>
            </ion-button>
          </form>

          <button class="auth-link" type="button" (click)="goToLogin()">
            Already have an account?
          </button>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .auth-hero {
        background: linear-gradient(180deg, #081b61, #0b1d73 80%);
        color: #fff;
        padding: calc(env(safe-area-inset-top) + 1.5rem) 1.25rem 1.25rem;
      }

      .auth-back {
        border: 0;
        background: transparent;
        color: rgba(255, 255, 255, 0.86);
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0;
        margin-bottom: 1rem;
        font: inherit;
      }

      .auth-hero__copy h1,
      .auth-hero__copy p,
      .auth-kicker {
        margin: 0;
      }

      .auth-kicker {
        opacity: 0.68;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 0.72rem;
        margin-bottom: 0.45rem;
      }

      .auth-hero__copy h1 {
        font-size: 2rem;
        margin-bottom: 0.4rem;
      }

      .auth-hero__copy p:last-child {
        color: rgba(255, 255, 255, 0.88);
      }

      .auth-content {
        --background: #f4f6fb;
      }

      .auth-card {
        margin: -0.25rem 1.25rem 1.5rem;
        background: #fff;
        border-radius: 22px;
        padding: 1.25rem;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.12);
      }

      .auth-field {
        --background: #f5f7fc;
        --border-radius: 16px;
        margin-bottom: 0.9rem;
      }

      .auth-submit {
        --background: #f5b628;
        --border-radius: 999px;
        margin-top: 0.6rem;
        font-weight: 600;
      }

      .auth-link {
        border: 0;
        background: transparent;
        color: #0b1d73;
        font: inherit;
        font-weight: 600;
        margin-top: 1rem;
        width: 100%;
      }

      .auth-error {
        display: block;
        margin: 0.25rem 0 0.5rem;
      }
    `,
  ],
})
export class RegisterPage {
  readonly form = this.formBuilder.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    phone_number: ['', Validators.required],
    email: [''],
    password: ['', Validators.required],
    confirm_password: ['', Validators.required],
  });

  loading = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.authService.register(this.form.getRawValue()).subscribe({
      next: () => {
        void this.router.navigate(['/profile']);
      },
      error: () => {
        this.errorMessage = 'Unable to create your account right now. Please review your details and try again.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  goHome(): void {
    void this.router.navigate(['/home']);
  }
}
