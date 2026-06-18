import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MemberProfile } from '../../core/models/user.model';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-edit-profile',
  template: `
    <ion-page>
      <ion-content fullscreen class="edit-profile-content">
        <div class="edit-profile-hero app-header app-header--inner">
          <app-mobile-header
            title="Edit Profile"
            subtitle="Update your member details"
            fallbackRoute="/profile/account-settings"
          ></app-mobile-header>
        </div>

        <div class="surface edit-profile-surface">
          <div class="surface__content edit-profile-surface__content">
            <div *ngIf="loading" class="state-card loading-state" aria-live="polite">
              <ion-spinner name="crescent"></ion-spinner>
              <div class="state-copy">
                <h2>Loading profile</h2>
                <p>Checking your member session.</p>
              </div>
            </div>

            <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="save()" class="profile-form">
              <div class="form-card">
                <div class="field-group">
                  <label class="form-label" for="edit-first-name">First name</label>
                  <ion-item fill="solid" class="form-field">
                    <ion-input
                      id="edit-first-name"
                      formControlName="first_name"
                      placeholder="First name"
                    ></ion-input>
                  </ion-item>
                  <p class="field-error" *ngIf="showControlError('first_name')">Enter your first name.</p>
                </div>

                <div class="field-group">
                  <label class="form-label" for="edit-last-name">Last name</label>
                  <ion-item fill="solid" class="form-field">
                    <ion-input
                      id="edit-last-name"
                      formControlName="last_name"
                      placeholder="Last name"
                    ></ion-input>
                  </ion-item>
                  <p class="field-error" *ngIf="showControlError('last_name')">Enter your last name.</p>
                </div>

                <div class="field-group">
                  <label class="form-label" for="edit-phone-number">Phone number</label>
                  <ion-item fill="solid" class="form-field">
                    <ion-input
                      id="edit-phone-number"
                      formControlName="phone_number"
                      placeholder="+39 333 123 4567"
                      inputmode="tel"
                    ></ion-input>
                  </ion-item>
                  <p class="field-error" *ngIf="showControlError('phone_number')">
                    {{ phoneErrorMessage }}
                  </p>
                </div>

                <div class="field-group">
                  <label class="form-label" for="edit-language">Preferred language</label>
                  <ion-item fill="solid" class="form-field form-field--select">
                    <ion-select
                      id="edit-language"
                      formControlName="preferred_language"
                      placeholder="Select language"
                      interface="action-sheet"
                      justify="space-between"
                    >
                      <ion-select-option
                        *ngFor="let option of languageOptions"
                        [value]="option.value"
                      >
                        {{ option.label }}
                      </ion-select-option>
                    </ion-select>
                  </ion-item>
                </div>

                <div class="form-feedback" [class.form-feedback--visible]="!!errorMessage">
                  <ion-text color="danger" *ngIf="errorMessage">{{ errorMessage }}</ion-text>
                </div>
              </div>

              <ion-button expand="block" type="submit" class="save-button" [disabled]="!canSubmit">
                <ion-spinner *ngIf="saving" slot="start" name="crescent"></ion-spinner>
                <span>{{ saving ? 'Saving...' : 'Save changes' }}</span>
              </ion-button>
            </form>
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

      .edit-profile-content {
        --background: #0b1d73;
      }

      .edit-profile-hero {
        width: 100%;
        padding-bottom: 2rem;
      }

      .edit-profile-surface {
        margin-top: -0.08rem;
        padding-top: 1.25rem;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -6px 22px rgba(2, 18, 54, 0.08);
      }

      .edit-profile-surface__content {
        width: 100%;
        max-width: 440px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: calc(1.2rem + env(safe-area-inset-bottom));
      }

      .profile-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .form-card,
      .state-card {
        background: #ffffff;
        border-radius: 22px;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1);
      }

      .form-card {
        padding: 1.1rem;
      }

      .field-group + .field-group {
        margin-top: 0.9rem;
      }

      .form-label {
        display: block;
        margin: 0 0 0.45rem;
        color: #304468;
        font-size: 0.9rem;
        font-weight: 600;
      }

      .form-field {
        --background: #f2f3f6;
        --border-radius: 18px;
        --padding-start: 0.65rem;
        --inner-padding-end: 0.35rem;
        --inner-padding-top: 0.42rem;
        --inner-padding-bottom: 0.42rem;
        border: 1px solid rgba(47, 66, 107, 0.12);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
        overflow: hidden;
        border-radius: 999px;
      }

      .form-field--select {
        --inner-padding-top: 0.18rem;
        --inner-padding-bottom: 0.18rem;
      }

      .field-error {
        margin: 0.45rem 0 0;
        color: #d14c58;
        font-size: 0.82rem;
        line-height: 1.4;
      }

      .form-feedback {
        min-height: 1.3rem;
        margin-top: 0.85rem;
      }

      .form-feedback--visible {
        min-height: auto;
      }

      .save-button {
        --background: #f5b628;
        --background-hover: #f5b628;
        --background-activated: #d79d1f;
        --border-radius: 999px;
        --box-shadow: 0 10px 22px rgba(245, 182, 40, 0.24);
        --color: #0b1d73;
        min-height: 52px;
        font-weight: 700;
      }

      .state-card {
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 0.9rem;
      }

      .state-copy {
        display: flex;
        flex-direction: column;
        gap: 0.28rem;
      }

      .state-copy h2,
      .state-copy p {
        margin: 0;
      }

      .state-copy h2 {
        color: #03173f;
        font-size: 1rem;
        font-weight: 700;
      }

      .state-copy p {
        color: rgba(3, 23, 63, 0.62);
        font-size: 0.9rem;
        line-height: 1.45;
      }
    `,
  ],
})
export class EditProfilePage implements OnInit {
  readonly languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'italian', label: 'Italian' },
    { value: 'french', label: 'French' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'german', label: 'German' },
    { value: 'portuguese', label: 'Portuguese' },
  ] as const;

  profile: MemberProfile | null = null;
  loading = true;
  saving = false;
  errorMessage = '';

  readonly form = this.fb.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    phone_number: ['', [Validators.required, this.phoneValidator]],
    preferred_language: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastController: ToastController,
    private readonly sentryTelemetry: SentryTelemetryService
  ) {}

  get canSubmit(): boolean {
    return !this.saving && this.form.valid;
  }

  get phoneErrorMessage(): string {
    const control = this.form.controls.phone_number;
    if (control.hasError('required')) {
      return 'Enter your phone number.';
    }
    if (control.hasError('invalidPhone')) {
      return 'Enter a valid phone number.';
    }
    return 'Enter your phone number.';
  }

  ngOnInit(): void {
    const wasAuthenticated =
      this.authService.isAuthenticatedSnapshot || !!this.authService.accessTokenSnapshot;

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        const memberProfileLoaded = !!profile?.id;
        if (!memberProfileLoaded) {
          void this.router.navigateByUrl(wasAuthenticated ? '/profile' : '/login', { replaceUrl: true });
          return;
        }

        this.profile = profile;
        this.form.patchValue({
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          phone_number: profile.phone_number ?? profile.phone ?? '',
          preferred_language: this.normalizeLanguage(profile.language),
        });
        this.loading = false;
      },
      error: (error: unknown) => {
        const httpError = error as HttpErrorResponse;
        const redirectRoute =
          httpError?.status === 401 ? '/login' : '/profile';
        void this.router.navigateByUrl(redirectRoute, { replaceUrl: true });
      },
    });
  }

  showControlError(controlName: 'first_name' | 'last_name' | 'phone_number'): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  async save(): Promise<void> {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const payload = {
      first_name: this.form.value.first_name?.trim() || undefined,
      last_name: this.form.value.last_name?.trim() || undefined,
      phone_number: this.form.value.phone_number?.trim() || undefined,
      preferred_language: this.normalizeLanguage(this.form.value.preferred_language) || null,
    };

    this.authService.updateMemberProfile(payload).subscribe({
      next: async () => {
        try {
          const toast = await this.toastController.create({
            message: 'Profile updated',
            icon: 'checkmark-circle-outline',
            duration: 2400,
            position: 'bottom',
            cssClass: 'branch-save-toast',
          });
          await toast.present();
        } catch {
          // ignore toast errors
        }

        await this.router.navigateByUrl('/profile/account-settings', { replaceUrl: true });
      },
      error: (error: unknown) => {
        this.saving = false;
        const httpError = error as HttpErrorResponse;
        const body = httpError?.error as Record<string, unknown> | undefined;
        this.sentryTelemetry.captureFeatureError('profile', 'Edit profile save failed', error, {
          status: httpError?.status ?? null,
        });
        this.errorMessage =
          this.extractFirstFieldError(body)
          || (typeof body?.['detail'] === 'string' ? body['detail'] : '')
          || 'Unable to update your profile right now. Please try again.';
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  private extractFirstFieldError(body?: Record<string, unknown>): string | null {
    if (!body) {
      return null;
    }

    for (const key of ['first_name', 'last_name', 'phone_number', 'preferred_language']) {
      const value = body[key];
      if (Array.isArray(value) && typeof value[0] === 'string') {
        return value[0];
      }
    }

    return null;
  }

  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = `${control.value ?? ''}`.trim();
    if (!value) {
      return null;
    }
    return /^\+?[0-9()\-\s]{7,20}$/.test(value) ? null : { invalidPhone: true };
  }

  private normalizeLanguage(value: unknown): string {
    const normalized = `${value ?? ''}`.trim().toLowerCase();
    return this.languageOptions.some((option) => option.value === normalized) ? normalized : '';
  }
}
