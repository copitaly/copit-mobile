import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription, tap } from 'rxjs';

import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { DonationFlowStateService, DonationCheckoutSummary } from '../../core/services/donation-flow-state.service';
import { ApiService } from '../../core/services/api.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import {
  DonationAnalyticsContext,
  DonationAnalyticsContextService,
} from '../../core/services/donation-analytics-context.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

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

type DonationVerificationState = 'verifying' | 'confirmed' | 'pending';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate-success',
  templateUrl: './success.page.html',
  styleUrls: ['./success.page.scss'],
})
export class DonateSuccessPage implements OnInit, OnDestroy {
  summary: DonationCheckoutSummary | null = null;
  verificationState: DonationVerificationState = 'verifying';
  verificationMessage = '';
  private isVerifying = false;
  private verifySub?: Subscription;
  private pendingVerification:
    | { type: 'hosted'; sessionId: string }
    | { type: 'mobile'; donationId: number; transactionReference: string }
    | null = null;
  private pendingNavigation = false;

  constructor(
    private readonly api: ApiService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly sentryTelemetry: SentryTelemetryService,
    private readonly analyticsService: AnalyticsService,
    private readonly donationAnalyticsContext: DonationAnalyticsContextService,
    private readonly localeService: LocaleService
  ) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    const donationIdParam = this.route.snapshot.queryParamMap.get('donation_id');
    const recurringDonationIdParam = this.route.snapshot.queryParamMap.get('recurring_donation_id');

    if (!sessionId && !donationIdParam && !recurringDonationIdParam) {
      this.applyPendingStoredSummary(this.localeService.translate('donations.success.noConfirmation'));
      return;
    }

    if (sessionId) {
      this.verifyHosted(sessionId);
      return;
    }

    if (recurringDonationIdParam) {
      this.applyPendingStoredSummary(
        this.localeService.translate('donations.processing.monthlyPending')
      );
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

    this.applyPendingStoredSummary(this.localeService.translate('donations.success.noConfirmation'));
  }

  ngOnDestroy(): void {
    this.verifySub?.unsubscribe();
  }

  private verifyHosted(sessionId: string): void {
    this.pendingVerification = { type: 'hosted', sessionId };
    this.verifySub = this.api
      .get<VerifyCheckoutSessionResponse>('donations/verify-checkout-session/', {
        session_id: sessionId,
      })
      .pipe(tap(() => this.startVerification()))
      .subscribe({
        next: response => {
          this.isVerifying = false;
          if (response.verified) {
            this.summary = this.mapVerificationResponse(response);
            this.verificationState = 'confirmed';
            this.verificationMessage = '';
            this.pendingVerification = null;
            void this.analyticsService.trackDonationPaymentSuccess(
              this.resolveSuccessAnalyticsContext(this.summary, response),
              'backend'
            );
            this.donationAnalyticsContext.clearContext();
            this.donationFlowState.clear();
          } else {
            this.applyPendingStoredSummary(this.localeService.translate('donations.processing.verificationPending'));
          }
        },
        error: error => {
          this.isVerifying = false;
          this.sentryTelemetry.captureFeatureError('donations', 'Donation success verification failed', error, {
            flow: 'hosted',
          });
          this.applyPendingStoredSummary(this.resolvePendingMessage(error));
        },
      });
  }

  private verifyNative(donationId: number, transactionReference: string | null): void {
    if (!transactionReference) {
      this.applyPendingStoredSummary(this.localeService.translate('donations.processing.checkHistory'));
      return;
    }

    this.pendingVerification = { type: 'mobile', donationId, transactionReference };
    this.verifySub = this.api
      .get<VerifyMobilePaymentResponse>('donations/verify-mobile-payment/', {
        donation_id: donationId,
        transaction_reference: transactionReference,
      })
      .pipe(tap(() => this.startVerification()))
      .subscribe({
        next: response => {
          this.isVerifying = false;
          if (response.verified) {
            this.summary = this.mapMobileResponse(response);
            this.verificationState = 'confirmed';
            this.verificationMessage = '';
            this.pendingVerification = null;
            void this.analyticsService.trackDonationPaymentSuccess(
              this.resolveSuccessAnalyticsContext(this.summary, response),
              'backend'
            );
            this.donationAnalyticsContext.clearContext();
            this.donationFlowState.clear();
          } else {
            this.applyPendingStoredSummary(this.localeService.translate('donations.processing.verificationPending'));
          }
        },
        error: error => {
          this.isVerifying = false;
          this.sentryTelemetry.captureFeatureError('donations', 'Donation success verification failed', error, {
            flow: 'mobile',
            donation_id: donationId,
          });
          this.applyPendingStoredSummary(this.resolvePendingMessage(error));
        },
      });
  }

  private applyPendingStoredSummary(message: string): void {
    const stored = this.donationFlowState.consumeStoredSummary();
    this.summary = stored;
    this.isVerifying = false;
    this.verificationState = 'pending';
    this.verificationMessage = message;
  }

  private mapVerificationResponse(response: VerifyCheckoutSessionResponse): DonationCheckoutSummary {
    const stored = this.donationFlowState.getStoredSummary();
    const amount = response.amount ? Number(response.amount) : undefined;
    return {
      ...stored,
      branchName: response.church?.name ?? stored?.branchName ?? undefined,
      branchId: response.church?.id ?? stored?.branchId ?? undefined,
      category: response.category ?? stored?.category ?? undefined,
      amount: amount ?? stored?.amount,
      currency: response.currency ?? stored?.currency,
      donorEmail: response.donor_email ?? stored?.donorEmail,
      transactionReference: response.transaction_reference ?? stored?.transactionReference ?? undefined,
    };
  }

  private mapMobileResponse(response: VerifyMobilePaymentResponse): DonationCheckoutSummary {
    const stored = this.donationFlowState.getStoredSummary();
    const amount = response.amount ? Number(response.amount) : undefined;
    return {
      ...stored,
      branchName: response.church?.name ?? stored?.branchName ?? undefined,
      branchId: response.church?.id ?? stored?.branchId ?? undefined,
      category: response.category ?? stored?.category ?? undefined,
      amount: amount ?? stored?.amount,
      currency: response.currency ?? stored?.currency,
      donorEmail: stored?.donorEmail,
      transactionReference: response.transaction_reference ?? stored?.transactionReference ?? undefined,
    };
  }

  goToBranches(): void {
    if (this.pendingNavigation) {
      return;
    }

    this.pendingNavigation = true;
    this.router.navigate(['/tabs/donate'], { replaceUrl: true }).finally(() => {
      this.pendingNavigation = false;
    });
  }

  goHome(): void {
    if (this.pendingNavigation) {
      return;
    }

    this.pendingNavigation = true;
    this.router.navigate(['/tabs/home'], { replaceUrl: true }).finally(() => {
      this.pendingNavigation = false;
    });
  }

  retryVerification(): void {
    if (this.isVerifying || !this.pendingVerification) {
      return;
    }

    if (this.pendingVerification.type === 'hosted') {
      this.verifyHosted(this.pendingVerification.sessionId);
      return;
    }

    this.verifyNative(this.pendingVerification.donationId, this.pendingVerification.transactionReference);
  }

  formatAmount(amount: number, currency?: string): string {
    const normalizedCurrency = (currency ?? 'EUR').toUpperCase();
    return new Intl.NumberFormat('en-IT', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatInterval(interval: string): string {
    return interval === 'monthly'
      ? this.localeService.translate('donations.monthly')
      : this.localeService.translate('donations.oneTime');
  }

  private startVerification(): void {
    this.isVerifying = true;
    this.verificationState = 'verifying';
    this.verificationMessage = '';
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

  private resolvePendingMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'TimeoutError') {
      return this.localeService.translate('donations.processing.timeout');
    }

    return this.localeService.translate('donations.processing.checkHistoryBeforeRetry');
  }

  get statusIcon(): string {
    return this.verificationState === 'confirmed' ? 'checkmark-outline' : 'time-outline';
  }

  get statusTitle(): string {
    if (this.verificationState === 'confirmed') {
      return this.localeService.translate('donations.success.title');
    }

    return this.verificationState === 'verifying'
      ? this.localeService.translate('donations.processing.title')
      : this.localeService.translate('donations.processing.pendingTitle');
  }

  get statusSubtitle(): string {
    if (this.verificationState === 'confirmed') {
      return this.localeService.translate('donations.success.received');
    }

    return this.verificationState === 'verifying'
      ? this.localeService.translate('donations.processing.secureConfirmation')
      : this.localeService.translate('donations.processing.waitFinalConfirmation');
  }

  get primaryCopy(): string {
    if (this.verificationState === 'confirmed') {
      return this.localeService.translate('donations.success.appreciation');
    }

    return this.localeService.translate('donations.processing.doNotResubmit');
  }

  get showConfirmationNote(): boolean {
    return this.verificationState === 'confirmed' && !!this.summary?.donorEmail?.trim();
  }

  get canRetryVerification(): boolean {
    return !!this.pendingVerification;
  }
}
