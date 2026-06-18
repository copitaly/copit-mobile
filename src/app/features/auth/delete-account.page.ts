import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, NavController, ToastController } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MemberProfile } from '../../core/models/user.model';
import { DonationFlowStateService } from '../../core/services/donation-flow-state.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-delete-account',
  template: `
    <ion-page>
      <ion-content fullscreen class="delete-account-content">
        <div class="delete-account-hero app-header app-header--inner">
          <app-mobile-header
            title="Delete Account"
            subtitle="Review this carefully before you continue"
            fallbackRoute="/profile/account-settings"
          ></app-mobile-header>
        </div>

        <div class="surface delete-account-surface">
          <div class="surface__content delete-account-surface__content">
            <div *ngIf="loading" class="state-card loading-state" aria-live="polite">
              <ion-spinner name="crescent"></ion-spinner>
              <div class="state-copy">
                <h2>Loading account</h2>
                <p>Checking your member session.</p>
              </div>
            </div>

            <div *ngIf="!loading && profile" class="delete-stack">
              <section class="warning-card">
                <div class="warning-card__icon" aria-hidden="true">
                  <ion-icon name="warning-outline"></ion-icon>
                </div>

                <div class="warning-card__copy">
                  <h2>Delete your account</h2>
                  <p>
                    This will permanently delete your account. Your donation records may be retained for legal and
                    accounting purposes.
                  </p>
                </div>
              </section>

              <section class="confirm-card">
                <label class="confirm-label" for="delete-confirmation">Type DELETE to continue</label>
                <ion-item fill="solid" class="confirm-field">
                  <ion-input
                    id="delete-confirmation"
                    [(ngModel)]="confirmationValue"
                    placeholder="DELETE"
                    autocapitalize="characters"
                    [disabled]="submitting"
                  ></ion-input>
                </ion-item>

                <ion-text color="danger" *ngIf="errorMessage" class="error-copy">
                  {{ errorMessage }}
                </ion-text>
              </section>

              <ion-button
                expand="block"
                class="delete-button"
                [disabled]="!canDelete"
                (click)="deleteAccount()"
              >
                <ion-spinner *ngIf="submitting" slot="start" name="crescent"></ion-spinner>
                <span>{{ submitting ? 'Deleting account...' : 'Delete account permanently' }}</span>
              </ion-button>
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

      .delete-account-content {
        --background: #0b1d73;
      }

      .delete-account-hero {
        width: 100%;
        padding-bottom: 2rem;
      }

      .delete-account-surface {
        margin-top: -0.08rem;
        padding-top: 1.25rem;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -6px 22px rgba(2, 18, 54, 0.08);
      }

      .delete-account-surface__content {
        width: 100%;
        max-width: 440px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: calc(1.2rem + env(safe-area-inset-bottom));
      }

      .delete-stack {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .warning-card,
      .confirm-card,
      .state-card {
        background: #ffffff;
        border-radius: 22px;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1);
      }

      .warning-card {
        padding: 1.15rem;
        display: flex;
        gap: 0.95rem;
        align-items: flex-start;
      }

      .warning-card__icon {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        background: rgba(223, 63, 77, 0.12);
        color: #b22b39;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .warning-card__icon ion-icon {
        font-size: 1.28rem;
      }

      .warning-card__copy h2,
      .warning-card__copy p {
        margin: 0;
      }

      .warning-card__copy h2 {
        color: #03173f;
        font-size: 1.15rem;
        font-weight: 700;
      }

      .warning-card__copy p {
        margin-top: 0.48rem;
        color: rgba(3, 23, 63, 0.7);
        font-size: 0.96rem;
        line-height: 1.55;
      }

      .confirm-card {
        padding: 1.05rem;
      }

      .confirm-label {
        display: block;
        margin: 0 0 0.5rem;
        color: #304468;
        font-size: 0.9rem;
        font-weight: 600;
      }

      .confirm-field {
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

      .error-copy {
        display: block;
        margin-top: 0.72rem;
        font-size: 0.92rem;
        line-height: 1.45;
      }

      .delete-button {
        --background: #df3f4d;
        --background-hover: #df3f4d;
        --background-activated: #be3140;
        --border-radius: 999px;
        --box-shadow: 0 12px 24px rgba(223, 63, 77, 0.24);
        --color: #ffffff;
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
export class DeleteAccountPage implements OnInit {
  profile: MemberProfile | null = null;
  loading = true;
  submitting = false;
  confirmationValue = '';
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router,
    private readonly navController: NavController,
    private readonly toastController: ToastController,
    private readonly sentryTelemetry: SentryTelemetryService
  ) {}

  get canDelete(): boolean {
    return !this.submitting && this.confirmationValue.trim() === 'DELETE';
  }

  ngOnInit(): void {
    console.log('[delete-account] init');
    const wasAuthenticated =
      this.authService.isAuthenticatedSnapshot || !!this.authService.accessTokenSnapshot;

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        const memberProfileLoaded = !!profile?.id;
        console.log('[delete-account] memberProfileLoaded', {
          memberProfileLoaded,
          memberProfileId: profile?.id ?? null,
          role: profile?.role ?? null,
          allowed: memberProfileLoaded,
        });

        if (!memberProfileLoaded) {
          const redirectReason = wasAuthenticated ? 'missing-member-profile' : 'unauthenticated';
          console.log('[delete-account] redirect reason=' + redirectReason);
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
        console.log('[delete-account] memberProfileLoaded', {
          memberProfileLoaded: false,
          memberProfileId: null,
          role: null,
          allowed: false,
        });
        console.log('[delete-account] redirect reason=' + redirectReason);
        void this.router.navigateByUrl(
          redirectReason === 'unauthenticated' ? '/login' : '/profile',
          { replaceUrl: true }
        );
      },
    });
  }

  async deleteAccount(): Promise<void> {
    if (!this.canDelete || this.submitting) {
      return;
    }

    this.sentryTelemetry.addFeatureBreadcrumb('profile', 'Delete account started');
    console.log('[delete-account] delete clicked');
    this.submitting = true;
    this.errorMessage = '';

    this.authService.deleteAccount().subscribe({
      next: async () => {
        this.sentryTelemetry.addFeatureBreadcrumb('profile', 'Delete account succeeded');
        this.authService.clearLocalAuthState();
        this.donationFlowState.clear();
        this.selectedBranchService.clearBranch();

        try {
          const toast = await this.toastController.create({
            message: 'Account deleted successfully.',
            icon: 'checkmark-circle-outline',
            duration: 2400,
            position: 'bottom',
            cssClass: 'branch-save-toast',
          });
          await toast.present();
        } catch {
          // ignore toast errors
        }

        await this.navController.navigateRoot('/login');
      },
      error: async (error: unknown) => {
        const httpError = error as HttpErrorResponse;
        this.sentryTelemetry.captureFeatureError('profile', 'Delete account failed', error, {
          status: httpError?.status ?? null,
        });
        this.errorMessage =
          httpError?.status === 502
            ? 'We could not cancel your recurring donations. Please try again.'
            : 'Unable to delete your account right now. Please try again.';
        this.submitting = false;

        try {
          const toast = await this.toastController.create({
            message: this.errorMessage,
            duration: 2600,
            position: 'bottom',
          });
          await toast.present();
        } catch {
          // ignore toast errors
        }
      },
      complete: () => {
        this.submitting = false;
      },
    });
  }
}
