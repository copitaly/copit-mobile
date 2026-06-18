import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MemberProfile } from '../../core/models/user.model';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-account-settings',
  template: `
    <ion-page>
      <ion-content fullscreen class="account-settings-content">
        <div class="account-settings-hero app-header app-header--inner">
          <app-mobile-header
            title="Account Settings"
            subtitle="Manage your account and privacy"
            fallbackRoute="/profile"
          ></app-mobile-header>
        </div>

        <div class="surface account-settings-surface">
          <div class="surface__content account-settings-surface__content">
            <div *ngIf="loading" class="state-card loading-state" aria-live="polite">
              <ion-spinner name="crescent"></ion-spinner>
              <div class="state-copy">
                <h2>Loading account</h2>
                <p>Checking your member session.</p>
              </div>
            </div>

            <div *ngIf="!loading && profile" class="settings-stack">
              <section class="settings-card">
                <p class="settings-card__eyebrow">Profile</p>
                <button type="button" class="settings-row" (click)="goToEditProfile()">
                  <span class="settings-row__icon" aria-hidden="true">
                    <ion-icon name="create-outline"></ion-icon>
                  </span>
                  <span class="settings-row__copy">
                    <strong>Edit profile</strong>
                    <small>Change your name, phone number, and language</small>
                  </span>
                  <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
                </button>
              </section>

              <section class="settings-card">
                <p class="settings-card__eyebrow">Privacy</p>
                <h2>Delete account</h2>
                <p>
                  Permanently remove your member access from this device and app. Donation records may still be
                  retained where required for legal and accounting reasons.
                </p>

                <button type="button" class="danger-row" (click)="goToDeleteAccount()">
                  <span class="danger-row__icon" aria-hidden="true">
                    <ion-icon name="trash-outline"></ion-icon>
                  </span>
                  <span class="danger-row__copy">
                    <strong>Delete account</strong>
                    <small>Review the warning and confirm</small>
                  </span>
                  <ion-icon name="chevron-forward" aria-hidden="true"></ion-icon>
                </button>
              </section>
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

      .account-settings-content {
        --background: #0b1d73;
      }

      .account-settings-hero {
        width: 100%;
        padding-bottom: 2rem;
      }

      .account-settings-surface {
        margin-top: -0.08rem;
        padding-top: 1.25rem;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -6px 22px rgba(2, 18, 54, 0.08);
      }

      .account-settings-surface__content {
        width: 100%;
        max-width: 440px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: calc(1.2rem + env(safe-area-inset-bottom));
      }

      .settings-stack {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .settings-card,
      .state-card {
        background: #ffffff;
        border-radius: 22px;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1);
      }

      .settings-card {
        padding: 1.15rem;
      }

      .settings-card__eyebrow {
        margin: 0 0 0.45rem;
        color: rgba(3, 23, 63, 0.58);
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .settings-card h2 {
        margin: 0;
        color: #03173f;
        font-size: 1.15rem;
        font-weight: 700;
      }

      .settings-card p:not(.settings-card__eyebrow) {
        margin: 0.55rem 0 0;
        color: rgba(3, 23, 63, 0.7);
        font-size: 0.95rem;
        line-height: 1.55;
      }

      .settings-row,
      .danger-row {
        width: 100%;
        margin-top: 1rem;
        padding: 0.95rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        text-align: left;
        border-radius: 18px;
        appearance: none;
        -webkit-appearance: none;
        box-sizing: border-box;
      }

      .settings-row {
        border: 1px solid rgba(66, 94, 166, 0.12);
        background: rgba(239, 243, 255, 0.96);
        color: #082356;
      }

      .settings-row__icon,
      .danger-row__icon {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .settings-row__icon {
        background: rgba(66, 94, 166, 0.12);
        color: #425ea6;
      }

      .settings-row__icon ion-icon,
      .danger-row__icon ion-icon {
        font-size: 1.1rem;
      }

      .settings-row__copy,
      .danger-row__copy {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.14rem;
      }

      .settings-row__copy strong,
      .danger-row__copy strong {
        font-size: 0.98rem;
        font-weight: 700;
      }

      .settings-row__copy small {
        color: rgba(8, 35, 86, 0.72);
        font-size: 0.84rem;
        line-height: 1.4;
      }

      .danger-row {
        border: 1px solid rgba(223, 63, 77, 0.16);
        background: rgba(255, 244, 245, 0.95);
        color: #9b2430;
      }

      .danger-row__copy small {
        color: rgba(155, 36, 48, 0.8);
        font-size: 0.84rem;
        line-height: 1.4;
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
export class AccountSettingsPage implements OnInit {
  profile: MemberProfile | null = null;
  loading = true;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly sentryTelemetry: SentryTelemetryService
  ) {}

  ngOnInit(): void {
    console.log('[account-settings] init');
    const wasAuthenticated =
      this.authService.isAuthenticatedSnapshot || !!this.authService.accessTokenSnapshot;

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        const memberProfileLoaded = !!profile?.id;
        const allowed = memberProfileLoaded;

        console.log('[account-settings] page result', {
          memberProfileLoaded,
          memberProfileId: profile?.id ?? null,
          role: profile?.role ?? null,
          allowed,
          redirectReason: null,
        });

        if (!allowed) {
          const redirectReason = wasAuthenticated ? 'missing-member-profile' : 'unauthenticated';
          this.sentryTelemetry.addFeatureBreadcrumb('profile', 'Account settings page redirected', {
            reason: redirectReason,
          }, 'warning');
          console.log('[account-settings] redirect reason=' + redirectReason);
          void this.router.navigateByUrl(wasAuthenticated ? '/profile' : '/login', { replaceUrl: true });
          return;
        }

        this.profile = profile;
        this.loading = false;
      },
      error: (error: unknown) => {
        const httpError = error as HttpErrorResponse;
        const redirectReason =
          httpError?.status === 401
            ? 'unauthenticated'
            : httpError?.status === 403 || httpError?.status === 404
              ? 'member-profile-denied'
              : 'profile-load-error';
        this.sentryTelemetry.addFeatureBreadcrumb('profile', 'Account settings page redirected', {
          reason: redirectReason,
          status: httpError?.status ?? null,
        }, redirectReason === 'profile-load-error' ? 'error' : 'warning');

        console.log('[account-settings] page result', {
          memberProfileLoaded: false,
          memberProfileId: null,
          role: null,
          allowed: false,
          redirectReason,
        });
        console.log('[account-settings] redirect reason=' + redirectReason);
        void this.router.navigateByUrl(
          redirectReason === 'unauthenticated' ? '/login' : '/profile',
          { replaceUrl: true }
        );
      },
    });
  }

  goToDeleteAccount(): void {
    void this.router.navigateByUrl('/profile/account-settings/delete-account');
  }

  goToEditProfile(): void {
    void this.router.navigateByUrl('/profile/account-settings/edit-profile');
  }
}
