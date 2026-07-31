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
      <ion-content fullscreen class="account-settings-content cop-content--secondary">
        <div class="account-settings-shell cop-secondary-shell">
          <header class="account-settings-header" aria-label="Account Settings">
            <app-mobile-header
              title="Account Settings"
              subtitle="Manage your account and privacy"
              fallbackRoute="/tabs/profile"
              tone="editorial"
            ></app-mobile-header>
          </header>

          <div class="account-settings-stack">
            <div *ngIf="loading" class="state-card loading-state" aria-live="polite">
              <ion-spinner name="crescent"></ion-spinner>
              <div class="state-copy">
                <h2>Loading account</h2>
                <p>Checking your member session.</p>
              </div>
            </div>

            <section *ngIf="!loading && profile" class="settings-card cop-card cop-card--soft">
              <p class="settings-card__eyebrow">Privacy</p>
              <div class="settings-card__copy">
                <h2>Delete account</h2>
                <p>
                  Permanently remove your member access from this device and app. Donation records may still be
                  retained where required for legal and accounting reasons.
                </p>
              </div>

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
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .account-settings-content {
        --background: var(--cop-color-background-soft);
      }

      .account-settings-shell {
        gap: 1rem;
      }

      .account-settings-header {
        margin-bottom: 0.05rem;
      }

      .account-settings-stack {
        width: 100%;
        max-width: 32rem;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .settings-card,
      .state-card {
        background: var(--cop-color-surface);
        border-radius: 16px;
        box-shadow: var(--cop-shadow-card-soft);
      }

      .settings-card {
        padding: 1.05rem 1rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.95rem;
      }

      .settings-card__eyebrow {
        margin: 0;
        color: var(--cop-color-gold-deep);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .settings-card__copy {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }

      .settings-card__copy h2,
      .settings-card__copy p {
        margin: 0;
      }

      .settings-card__copy h2 {
        color: var(--cop-color-text-primary);
        font-size: 1.1rem;
        font-weight: 700;
        line-height: 1.25;
      }

      .settings-card__copy p {
        max-width: 30rem;
        color: var(--cop-color-text-secondary);
        font-size: 0.94rem;
        line-height: 1.5;
      }

      .danger-row {
        width: 100%;
        padding: 0.9rem 0.95rem;
        display: flex;
        align-items: center;
        gap: 0.8rem;
        text-align: left;
        border-radius: 16px;
        border: 1px solid rgba(223, 63, 77, 0.14);
        background: rgba(255, 245, 246, 0.92);
        color: #9b2430;
        appearance: none;
        -webkit-appearance: none;
        box-sizing: border-box;
      }

      .danger-row__icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: rgba(223, 63, 77, 0.08);
        color: #c53b4f;
      }

      .danger-row__icon ion-icon {
        font-size: 1rem;
      }

      .danger-row__copy {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.14rem;
      }

      .danger-row__copy strong {
        color: #a6293a;
        font-size: 0.98rem;
        font-weight: 700;
        line-height: 1.3;
      }

      .danger-row__copy small {
        color: rgba(155, 36, 48, 0.8);
        font-size: 0.84rem;
        line-height: 1.4;
      }

      .danger-row:focus-visible {
        outline: 2px solid rgba(198, 62, 81, 0.2);
        outline-offset: 2px;
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

      @media (max-width: 430px) {
        .account-settings-shell {
          gap: 0.92rem;
        }

        .settings-card {
          padding: 1rem 0.92rem 0.95rem;
        }
      }
    `,
  ],
})
export class AccountSettingsPage implements OnInit {
  profile: MemberProfile | null = null;
  loading = true;
  private navigationPending = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly sentryTelemetry: SentryTelemetryService
  ) {}

  ngOnInit(): void {
    const wasAuthenticated =
      this.authService.isAuthenticatedSnapshot || !!this.authService.accessTokenSnapshot;

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        const memberProfileLoaded = !!profile?.id;
        const allowed = memberProfileLoaded;

        if (!allowed) {
          const redirectReason = wasAuthenticated ? 'missing-member-profile' : 'unauthenticated';
          this.sentryTelemetry.addFeatureBreadcrumb('profile', 'Account settings page redirected', {
            reason: redirectReason,
          }, 'warning');
          void this.navigateByUrl(wasAuthenticated ? '/tabs/more' : '/login', { replaceUrl: true });
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

        void this.navigateByUrl(
          redirectReason === 'unauthenticated' ? '/login' : '/tabs/more',
          { replaceUrl: true }
        );
      },
    });
  }

  goToDeleteAccount(): void {
    void this.navigateByUrl('/profile/account-settings/delete-account');
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
