import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AppToastService } from '../../core/services/app-toast.service';
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
      <ion-content fullscreen class="edit-profile-content cop-content--secondary">
        <div class="edit-profile-shell cop-secondary-shell">
          <header class="edit-profile-header" aria-label="Edit Profile">
            <app-mobile-header
              title="Edit Profile"
              subtitle="Update your member details"
              fallbackRoute="/tabs/profile"
              tone="editorial"
            ></app-mobile-header>
          </header>

          <div class="edit-profile-stack">
            <div *ngIf="loading" class="state-card loading-state" aria-live="polite">
              <ion-spinner name="crescent"></ion-spinner>
              <div class="state-copy">
                <h2>Loading profile</h2>
                <p>Checking your member session.</p>
              </div>
            </div>

            <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="save()" class="profile-form">
              <div *ngIf="loadErrorMessage" class="state-card" aria-live="polite">
                <div class="state-copy">
                  <h2>We couldn't load your profile</h2>
                  <p>{{ loadErrorMessage }}</p>
                </div>
                <ion-button expand="block" class="state-button" (click)="loadProfile()">Try again</ion-button>
              </div>

              <div class="form-card cop-card cop-card--soft">
                <div class="form-card__section">
                  <div class="field-group">
                    <label class="form-label" for="edit-first-name">First name</label>
                    <ion-item fill="solid" class="form-field">
                      <ion-input
                        #firstNameInput
                        id="edit-first-name"
                        formControlName="first_name"
                        placeholder="First name"
                        maxlength="150"
                        aria-describedby="edit-first-name-error"
                        autocomplete="given-name"
                      ></ion-input>
                    </ion-item>
                    <p id="edit-first-name-error" class="field-error" *ngIf="showControlError('first_name')">Enter your first name.</p>
                  </div>

                  <div class="field-group">
                    <label class="form-label" for="edit-last-name">Last name</label>
                    <ion-item fill="solid" class="form-field">
                      <ion-input
                        #lastNameInput
                        id="edit-last-name"
                        formControlName="last_name"
                        placeholder="Last name"
                        maxlength="150"
                        aria-describedby="edit-last-name-error"
                        autocomplete="family-name"
                      ></ion-input>
                    </ion-item>
                    <p id="edit-last-name-error" class="field-error" *ngIf="showControlError('last_name')">Enter your last name.</p>
                  </div>

                  <div class="field-group">
                    <label class="form-label" for="edit-phone-number">Phone number</label>
                    <ion-item fill="solid" class="form-field">
                      <ion-input
                        #phoneNumberInput
                        id="edit-phone-number"
                        formControlName="phone_number"
                        placeholder="+39 333 123 4567"
                        inputmode="tel"
                        autocomplete="tel"
                        maxlength="20"
                        aria-describedby="edit-phone-number-error"
                      ></ion-input>
                    </ion-item>
                    <p id="edit-phone-number-error" class="field-error" *ngIf="showControlError('phone_number')">
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
              </div>

              <ion-button expand="block" type="submit" class="save-button cop-button-primary" [disabled]="!canSubmit">
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
        --background: var(--cop-color-background-soft);
      }

      .edit-profile-shell {
        gap: 1rem;
      }

      .edit-profile-header {
        margin-bottom: 0.05rem;
      }

      .edit-profile-stack {
        width: 100%;
        max-width: 32rem;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .profile-form {
        display: flex;
        flex-direction: column;
        gap: 1.05rem;
      }

      .form-card,
      .state-card {
        background: var(--cop-color-surface);
        border-radius: 16px;
        box-shadow: var(--cop-shadow-card-soft);
      }

      .form-card {
        padding: 1.05rem 1rem 1rem;
      }

      .form-card__section {
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
      }

      .field-group {
        display: flex;
        flex-direction: column;
        gap: 0.42rem;
      }

      .form-label {
        display: block;
        margin: 0;
        color: var(--cop-color-text-primary);
        font-size: 0.9rem;
        font-weight: 600;
      }

      .form-field {
        --background: #ffffff;
        --border-radius: 14px;
        --padding-start: 0.75rem;
        --inner-padding-end: 0.75rem;
        --inner-padding-top: 0.18rem;
        --inner-padding-bottom: 0.18rem;
        --min-height: 52px;
        border: 1px solid var(--cop-color-border-field);
        box-shadow: 0 6px 16px rgba(7, 24, 69, 0.05);
        overflow: hidden;
        border-radius: 14px;
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease,
          transform 160ms ease;
      }

      .form-field--select {
        --padding-start: 0.7rem;
        --inner-padding-end: 0.7rem;
      }

      .form-field.item-has-focus,
      .form-field.ion-focused {
        border-color: rgba(11, 29, 115, 0.2);
        box-shadow:
          0 8px 18px rgba(7, 24, 69, 0.06),
          0 0 0 3px rgba(213, 166, 47, 0.14);
        transform: translateY(-1px);
      }

      .field-error {
        margin: 0.05rem 0 0;
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
        min-height: 52px;
        font-weight: 700;
        margin-top: 0.05rem;
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

      .state-button {
        --background: #102b79;
        --background-hover: #102b79;
        --background-activated: #0a1f59;
        --border-radius: 16px;
        --box-shadow: 0 12px 22px rgba(11, 29, 115, 0.2);
        --color: #ffffff;
      }

      @media (max-width: 430px) {
        .edit-profile-shell {
          gap: 0.92rem;
        }

        .form-card {
          padding: 1rem 0.92rem 0.95rem;
        }
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
  loadErrorMessage = '';
  private loadRequestInFlight = false;
  private navigationPending = false;

  @ViewChild('firstNameInput', { read: ElementRef }) private readonly firstNameInput?: ElementRef<HTMLElement>;
  @ViewChild('lastNameInput', { read: ElementRef }) private readonly lastNameInput?: ElementRef<HTMLElement>;
  @ViewChild('phoneNumberInput', { read: ElementRef }) private readonly phoneNumberInput?: ElementRef<HTMLElement>;

  readonly form = this.fb.group({
    first_name: ['', [Validators.required, Validators.maxLength(150), this.trimmedRequiredValidator]],
    last_name: ['', [Validators.required, Validators.maxLength(150), this.trimmedRequiredValidator]],
    phone_number: ['', [Validators.required, this.phoneValidator]],
    preferred_language: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly appToast: AppToastService,
    private readonly sentryTelemetry: SentryTelemetryService
  ) {}

  get canSubmit(): boolean {
    return !this.loading && !this.saving && !this.loadErrorMessage && this.form.valid;
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
    this.loadProfile();
  }

  loadProfile(): void {
    if (this.loadRequestInFlight) {
      return;
    }

    this.loadRequestInFlight = true;
    this.loading = true;
    this.loadErrorMessage = '';
    this.errorMessage = '';
    const wasAuthenticated =
      this.authService.isAuthenticatedSnapshot || !!this.authService.accessTokenSnapshot;

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        const memberProfileLoaded = !!profile?.id;
        if (!memberProfileLoaded) {
          this.loadRequestInFlight = false;
          void this.navigateByUrl(wasAuthenticated ? '/tabs/more' : '/login', { replaceUrl: true });
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
        this.loadRequestInFlight = false;
      },
      error: (error: unknown) => {
        const httpError = error as HttpErrorResponse;
        this.loadRequestInFlight = false;
        this.loading = false;
        if (httpError?.status === 401) {
          void this.navigateByUrl('/login', { replaceUrl: true });
          return;
        }

        if (httpError?.status === 403 || httpError?.status === 404) {
          void this.navigateByUrl('/tabs/more', { replaceUrl: true });
          return;
        }

        this.loadErrorMessage = 'Unable to load your profile right now. Please try again.';
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
      this.focusFirstInvalidControl();
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
        this.authService.getCurrentUser().subscribe({
          next: () => undefined,
          error: () => undefined,
        });
        await this.appToast.success('Profile updated');

        await this.navigateByUrl('/profile/account-settings', { replaceUrl: true });
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
        this.focusFirstInvalidControl(body);
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

  private focusFirstInvalidControl(body?: Record<string, unknown>): void {
    const orderedFields: Array<'first_name' | 'last_name' | 'phone_number'> = ['first_name', 'last_name', 'phone_number'];
    const serverField = orderedFields.find((field) => Array.isArray(body?.[field]) || typeof body?.[field] === 'string');
    const invalidField = serverField ?? orderedFields.find((field) => this.form.controls[field].invalid) ?? null;
    const target =
      invalidField === 'first_name'
        ? this.firstNameInput?.nativeElement
        : invalidField === 'last_name'
          ? this.lastNameInput?.nativeElement
          : invalidField === 'phone_number'
            ? this.phoneNumberInput?.nativeElement
            : null;

    target?.focus();
  }

  private trimmedRequiredValidator(control: AbstractControl): ValidationErrors | null {
    const value = `${control.value ?? ''}`.trim();
    return value ? null : { required: true };
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

  private async navigateByUrl(url: string, extras?: { replaceUrl?: boolean }): Promise<void> {
    if (this.navigationPending) {
      return;
    }

    this.navigationPending = true;
    try {
      await this.router.navigateByUrl(url, extras);
    } finally {
      this.navigationPending = false;
    }
  }
}
