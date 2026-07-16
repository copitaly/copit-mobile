import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, tap } from 'rxjs';
import { DonationFlowStateService, DonationCheckoutSummary } from '../../core/services/donation-flow-state.service';
import { ApiService } from '../../core/services/api.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import {
  DonationAnalyticsContext,
  DonationAnalyticsContextService,
} from '../../core/services/donation-analytics-context.service';

interface VerifyCheckoutSessionResponse {
  verified: boolean;
  payment_status?: string;
  transaction_reference?: string;
  amount?: string;
  currency?: string;
  category?: string;
  donor_email?: string;
  church?: {
    id?: number;
    name?: string;
  };
}

interface VerifyMobilePaymentResponse {
  verified: boolean;
  donation_id: number;
  church?: {
    id?: number;
    name?: string;
  };
  category?: string;
  amount?: string;
  currency?: string;
  transaction_reference?: string;
  status?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate-success',
  template: `
    <ion-page>
      <ion-content fullscreen class="success-content">
        <div class="success-hero">
          <ion-icon name="checkmark-circle" class="success-icon" aria-hidden="true"></ion-icon>
          <h1>Thank you</h1>
          <p class="hero-subtitle">Your gift has been received</p>
        </div>

        <div class="success-body">
          <p class="primary-copy">We appreciate your generous support for the local church.</p>
          <p class="fallback-note" *ngIf="!summary">
            We couldn't display the donation details right now, but your gift has been processed.
          </p>

          <div class="summary-card" *ngIf="summary">
            <p class="summary-label" *ngIf="summary.branchName">Branch</p>
            <p class="summary-value" *ngIf="summary.branchName">{{ summary.branchName }}</p>
            <p class="summary-label" *ngIf="summary.category">Category</p>
            <p class="summary-value" *ngIf="summary.category">{{ summary.category }}</p>
            <p class="summary-label" *ngIf="summary.interval">Frequency</p>
            <p class="summary-value" *ngIf="summary.interval">{{ formatInterval(summary.interval) }}</p>
            <p class="summary-label" *ngIf="summary.amount !== undefined">Amount</p>
            <p class="summary-value" *ngIf="summary.amount !== undefined">{{ formatAmount(summary.amount) }}</p>
            <p class="summary-label" *ngIf="summary.transactionReference">Reference</p>
            <p class="summary-value" *ngIf="summary.transactionReference">{{ summary.transactionReference }}</p>
          </div>

          <p class="confirmation-note">
            A confirmation email has been sent if provided.
          </p>

          <div class="actions">
            <ion-button expand="block" class="cta" (click)="goToBranches()">Give again</ion-button>
            <ion-button expand="block" fill="outline" class="secondary" (click)="goHome()">Back home</ion-button>
          </div>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
        --ion-background-color: #0b1d73;
      }

      .success-content {
        --background: #0b1d73;
        background: #0b1d73;
        color: #fff;
        min-height: 100vh;
        height: 100vh;
        display: flex;
        flex-direction: column;
        --padding-bottom: 0;
      }

      ion-content.success-content::part(scroll) {
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }

      .success-hero {
        padding:
          calc(var(--app-safe-area-top) + 1.15rem)
          calc(var(--app-safe-area-right) + 1.5rem)
          1rem
          calc(var(--app-safe-area-left) + 1.5rem);
        background: linear-gradient(180deg, #071f63, #0b1d73 90%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
      }

      .success-icon {
        font-size: 3.5rem;
        color: #0b703f;
        padding: 0.5rem;
        border-radius: 50%;
        background: rgba(19, 128, 75, 0.15);
        box-shadow: 0 0 12px rgba(5, 70, 33, 0.25);
      }

      .success-hero h1 {
        margin: 0;
        font-size: 1.85rem;
        font-weight: 600;
        color: #fff;
      }

      .hero-subtitle {
        margin: 0;
        font-size: 1rem;
        opacity: 0.88;
        color: #fff;
      }

      .success-body {
        flex: 1 1 auto;
        min-height: 0;
        background: #f5f6fa;
        padding: 2rem 1.5rem 0.8rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        justify-content: flex-start;
      }

      .primary-copy {
        margin: 0;
        font-size: 1rem;
        color: #0b1a36;
        line-height: 1.5;
        text-align: center;
      }

      .fallback-note {
        max-width: 520px;
        margin: 0;
        font-size: 0.85rem;
        color: rgba(11, 26, 54, 0.7);
        text-align: center;
        line-height: 1.4;
        font-weight: 400;
      }

      .summary-card {
        width: 100%;
        max-width: 520px;
        background: #fff;
        border-radius: 18px;
        padding: 1.25rem 1.5rem;
        box-shadow: 0 6px 16px rgba(11, 26, 54, 0.08);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .summary-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(11, 26, 54, 0.45);
        margin: 0;
      }

      .summary-value {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #0b1a36;
      }

      .actions {
        width: 100%;
        max-width: 520px;
        margin-top: 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .actions ion-button {
        border-radius: 999px;
        height: 52px;
        font-weight: 600;
      }

      .actions .cta {
        --background: #d9a30a;
        --color: #011b2d;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
      }

      .actions .secondary {
        --border-color: rgba(11, 26, 54, 0.25);
        --color: #0b1a36;
        background: transparent;
        border: 1px solid rgba(11, 26, 54, 0.25);
        box-shadow: none;
      }

      .confirmation-note {
        margin: 1.4rem auto 0.6rem;
        align-self: center;
        max-width: 520px;
        text-align: center;
        color: rgba(15, 34, 61, 0.75);
        font-size: 0.85rem;
        line-height: 1.4;
        font-weight: 500;
      }
    `
  ],
})
export class DonateSuccessPage implements OnInit, OnDestroy {
  summary: DonationCheckoutSummary | null = null;
  private isVerifying = false;
  private verifySub?: Subscription;

  constructor(
    private readonly api: ApiService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly sentryTelemetry: SentryTelemetryService,
    private readonly analyticsService: AnalyticsService,
    private readonly donationAnalyticsContext: DonationAnalyticsContextService
  ) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    const donationIdParam = this.route.snapshot.queryParamMap.get('donation_id');
    const recurringDonationIdParam = this.route.snapshot.queryParamMap.get('recurring_donation_id');
    if (sessionId) {
      this.verifyHosted(sessionId);
      return;
    }
    if (recurringDonationIdParam) {
      this.applyStoredSummary('session_storage', recurringDonationIdParam);
      return;
    }
    if (donationIdParam) {
      const donationId = Number(donationIdParam);
      if (!Number.isNaN(donationId)) {
        const transactionReference =
          this.route.snapshot.queryParamMap.get('transaction_reference')?.trim() ||
          this.donationFlowState.getStoredSummary()?.transactionReference?.trim() ||
          null;
        this.verifyNative(donationId, transactionReference);
        return;
      }
    }
    this.applyStoredSummary();
  }

  ngOnDestroy(): void {
    this.verifySub?.unsubscribe();
  }

  private verifyHosted(sessionId: string): void {
    this.verifySub = this.api
      .get<VerifyCheckoutSessionResponse>('donations/verify-checkout-session/', {
        session_id: sessionId,
      })
      .pipe(tap(() => this.startVerification(sessionId)))
      .subscribe({
        next: response => {
          if (response.verified) {
            this.summary = this.mapVerificationResponse(response);
            void this.analyticsService.trackDonationPaymentSuccess(
              this.resolveSuccessAnalyticsContext(this.summary, response),
              'backend'
            );
            this.donationAnalyticsContext.clearContext();
            this.donationFlowState.clear();
          } else {
            this.applyStoredSummary('session_storage');
          }
        },
        error: error => {
          this.sentryTelemetry.captureFeatureError('donations', 'Donation success verification failed', error, {
            flow: 'hosted',
          });
          this.applyStoredSummary('session_storage');
        },
      });
  }

  private verifyNative(donationId: number, transactionReference: string | null): void {
    if (!transactionReference) {
      this.applyStoredSummary('session_storage');
      return;
    }

    this.verifySub = this.api
      .get<VerifyMobilePaymentResponse>('donations/verify-mobile-payment/', {
        donation_id: donationId,
        transaction_reference: transactionReference,
      })
      .pipe(tap(() => this.startVerification(`mobile:${donationId}`)))
      .subscribe({
        next: response => {
          if (response.verified) {
            this.summary = this.mapMobileResponse(response);
            void this.analyticsService.trackDonationPaymentSuccess(
              this.resolveSuccessAnalyticsContext(this.summary, response),
              'backend'
            );
            this.donationAnalyticsContext.clearContext();
            this.donationFlowState.clear();
          } else {
            this.applyStoredSummary('session_storage');
          }
        },
        error: error => {
          this.sentryTelemetry.captureFeatureError('donations', 'Donation success verification failed', error, {
            flow: 'mobile',
            donation_id: donationId,
          });
          this.applyStoredSummary('session_storage');
        },
      });
  }

  private applyStoredSummary(
    verificationSource: 'session_storage' | 'generic' = 'session_storage',
    recurringDonationIdParam?: string
  ): void {
    const stored = this.donationFlowState.consumeStoredSummary();
    if (stored) {
      if (
        recurringDonationIdParam &&
        stored.recurringDonationId &&
        String(stored.recurringDonationId) !== recurringDonationIdParam
      ) {
      }
      this.summary = stored;
      void this.analyticsService.trackDonationPaymentSuccess(
        this.resolveSuccessAnalyticsContext(stored),
        verificationSource
      );
      this.donationAnalyticsContext.clearContext();
      return;
    }
    void this.analyticsService.trackDonationPaymentSuccess(
      this.resolveSuccessAnalyticsContext(null),
      'generic'
    );
    this.donationAnalyticsContext.clearContext();
  }

  private mapVerificationResponse(response: VerifyCheckoutSessionResponse): DonationCheckoutSummary {
    const amount = response.amount ? Number(response.amount) : undefined;
    return {
      branchName: response.church?.name ?? undefined,
      category: response.category ?? undefined,
      amount,
      transactionReference: response.transaction_reference ?? undefined,
    };
  }

  private mapMobileResponse(response: VerifyMobilePaymentResponse): DonationCheckoutSummary {
    const amount = response.amount ? Number(response.amount) : undefined;
    return {
      branchName: response.church?.name ?? undefined,
      category: response.category ?? undefined,
      amount,
      transactionReference: response.transaction_reference ?? undefined,
    };
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  formatAmount(amount: number): string {
    return `€${amount.toFixed(2)}`;
  }

  formatInterval(interval: string): string {
    return interval === 'monthly' ? 'Monthly' : 'One-time';
  }

  private startVerification(sessionId: string): void {
    this.isVerifying = true;
  }

  private resolveSuccessAnalyticsContext(
    summary: DonationCheckoutSummary | null,
    response?: VerifyCheckoutSessionResponse | VerifyMobilePaymentResponse
  ): DonationAnalyticsContext {
    const storedContext = this.donationAnalyticsContext.peekContext();
    const responseChurchId = response?.church?.id;
    const responseAmount = response?.amount ? Number(response.amount) : undefined;

    return {
      church_id: storedContext?.church_id ?? summary?.branchId ?? responseChurchId,
      district_id: storedContext?.district_id,
      area_id: storedContext?.area_id,
      category: storedContext?.category ?? summary?.category ?? response?.category ?? undefined,
      amount_bucket:
        storedContext?.amount_bucket ??
        this.analyticsService.getAmountBucket(summary?.amount ?? responseAmount),
      frequency:
        storedContext?.frequency ??
        (summary?.interval === 'monthly' ? 'monthly' : summary?.interval === 'one_time' ? 'one_time' : undefined),
      user_type: storedContext?.user_type ?? this.analyticsService.getUserType(),
    };
  }
}
