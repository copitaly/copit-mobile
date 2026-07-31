import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular';

import { AppToastService } from '../../core/services/app-toast.service';
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
      <ion-content fullscreen class="delete-account-content cop-content--secondary">
        <div class="delete-account-shell cop-secondary-shell">
          <header class="delete-account-header" aria-label="Delete Account">
            <app-mobile-header
              title="Delete Account"
              subtitle="Review this carefully before you continue."
              fallbackRoute="/profile/account-settings"
              tone="editorial"
            ></app-mobile-header>
          </header>

          <div class="delete-account-stack">
            <div *ngIf="loading" class="state-card loading-state" aria-live="polite">
              <ion-spinner name="crescent"></ion-spinner>
              <div class="state-copy">
                <h2>Loading account</h2>
                <p>Checking your member session.</p>
              </div>
            </div>

            <div *ngIf="!loading && profile" class="delete-flow">
              <section class="warning-card cop-card cop-card--soft">
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

              <section class="confirm-card cop-card cop-card--soft">
                <label class="confirm-label" for="delete-confirmation">Type DELETE to continue</label>
                <ion-item fill="solid" class="confirm-field">
                  <ion-input
                    id="delete-confirmation"
                    [(ngModel)]="confirmationValue"
                    placeholder="DELETE"
                    autocapitalize="characters"
                    aria-describedby="delete-confirmation-help delete-confirmation-error"
                    aria-label="Type DELETE to continue"
                    [disabled]="submitting"
                  ></ion-input>
                </ion-item>


                <p id="delete-confirmation-error" class="error-copy" *ngIf="showInlineValidation">
                  Type DELETE exactly to continue.
                </p>

                <ion-text color="danger" *ngIf="errorMessage" class="error-copy error-copy--server" role="alert">
                  {{ errorMessage }}
                </ion-text>
              </section>

              <ion-button
                expand="block"
                class="delete-button"
                aria-label="Delete account permanently"
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
        --background: var(--cop-color-background-soft);
      }

      .delete-account-shell {
        gap: 1rem;
      }

      .delete-account-header {
        margin-bottom: 0.05rem;
      }

      .delete-account-stack {
        width: 100%;
        max-width: 32rem;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: calc(1.2rem + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)));
      }

      .delete-flow {
        display: flex;
        flex-direction: column;
        gap: 0.95rem;
      }

      .warning-card {
        padding: 1.05rem 1rem;
        display: flex;
        gap: 0.9rem;
        align-items: flex-start;
      }

      .warning-card__icon {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        background: rgba(223, 63, 77, 0.08);
        color: #b43343;
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
        color: var(--cop-color-text-primary);
        font-size: 1.08rem;
        font-weight: 700;
        line-height: 1.25;
      }

      .warning-card__copy p {
        margin-top: 0.44rem;
        color: var(--cop-color-text-secondary);
        font-size: 0.94rem;
        line-height: 1.52;
      }

      .confirm-card {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .confirm-label {
        display: block;
        margin: 0;
        color: var(--cop-color-text-primary);
        font-size: 0.9rem;
        font-weight: 600;
      }

      .confirm-field {
        --background: #ffffff;
        --border-radius: 14px;
        --padding-start: 0.72rem;
        --inner-padding-end: 0.72rem;
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

      .confirm-field.item-has-focus,
      .confirm-field.ion-focused {
        border-color: rgba(11, 29, 115, 0.2);
        box-shadow:
          0 8px 18px rgba(7, 24, 69, 0.06),
          0 0 0 3px rgba(213, 166, 47, 0.14);
        transform: translateY(-1px);
      }

      .confirm-help {
        margin: 0;
        color: var(--cop-color-text-secondary);
        font-size: 0.84rem;
        line-height: 1.45;
      }

      .error-copy {
        display: block;
        margin: 0;
        color: #c4434d;
        font-size: 0.84rem;
        line-height: 1.45;
      }

      .error-copy--server {
        margin-top: 0.08rem;
        font-size: 0.9rem;
      }

      .delete-button {
        --background: #cf5b67;
        --background-hover: #cf5b67;
        --background-activated: #b94b56;
        --border-radius: 16px;
        --box-shadow: none;
        --color: #ffffff;
        min-height: 52px;
        font-weight: 700;
      }

      .delete-button[disabled] {
        opacity: 0.62;
      }

      .state-card {
        background: var(--cop-color-surface);
        border-radius: 16px;
        box-shadow: var(--cop-shadow-card-soft);
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
        .delete-account-shell {
          gap: 0.92rem;
        }

        .warning-card,
        .confirm-card {
          padding-left: 0.92rem;
          padding-right: 0.92rem;
        }
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
  private navigationPending = false;

  constructor(
    private readonly authService: AuthService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router,
    private readonly navController: NavController,
    private readonly appToast: AppToastService,
    private readonly sentryTelemetry: SentryTelemetryService
  ) {}

  get canDelete(): boolean {
    return !this.submitting && this.confirmationValue.trim() === 'DELETE';
  }

  get showInlineValidation(): boolean {
    const trimmedValue = this.confirmationValue.trim();
    return !this.submitting && trimmedValue.length > 0 && trimmedValue !== 'DELETE';
  }

  ngOnInit(): void {
    const wasAuthenticated =
      this.authService.isAuthenticatedSnapshot || !!this.authService.accessTokenSnapshot;

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        const memberProfileLoaded = !!profile?.id;

        if (!memberProfileLoaded) {
          const redirectReason = wasAuthenticated ? 'missing-member-profile' : 'unauthenticated';
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
        void this.navigateByUrl(
          redirectReason === 'unauthenticated' ? '/login' : '/tabs/more',
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
    this.submitting = true;
    this.errorMessage = '';

    this.authService.deleteAccount().subscribe({
      next: async () => {
        this.sentryTelemetry.addFeatureBreadcrumb('profile', 'Delete account succeeded');
        this.authService.clearLocalAuthState();
        this.donationFlowState.clear();
        this.selectedBranchService.clearBranch();

        await this.appToast.success('Account deleted successfully.');

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

        await this.appToast.warning(this.errorMessage);
      },
      complete: () => {
        this.submitting = false;
      },
    });
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
