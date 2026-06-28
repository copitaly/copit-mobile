import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  ConsentStatus,
  ConsentType,
  FirebaseAnalytics,
} from '@capacitor-firebase/analytics';
import { FirebaseOptions, getApps, initializeApp } from 'firebase/app';

import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import {
  AnalyticsAmountBucket,
  AnalyticsDonationFrequency,
  AnalyticsUserType,
  DonationAnalyticsContext,
} from './donation-analytics-context.service';

type AnalyticsEventName =
  | 'app_opened'
  | 'give_now_tapped'
  | 'branch_selected'
  | 'donation_form_viewed'
  | 'donation_checkout_started'
  | 'donation_payment_success'
  | 'donation_payment_cancelled'
  | 'donation_payment_failed';

type AnalyticsFailureStage = 'checkout_create' | 'payment_sheet' | 'verification' | 'unknown';
type AnalyticsVerificationSource = 'backend' | 'session_storage' | 'generic';
type GiveNowCtaType = 'default' | 'saved_church' | 'saved_churchs_list';

interface AnalyticsConsentState {
  analyticsStorage: boolean;
  adStorage: boolean;
  adUserData: boolean;
  adPersonalization: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private initialized = false;
  private appOpenedTracked = false;
  private trackingAllowed = environment.analyticsEnabled;
  private readonly firebaseConfig = environment.firebaseConfig;
  private consentState: AnalyticsConsentState = {
    analyticsStorage: environment.analyticsEnabled,
    adStorage: false,
    adUserData: false,
    adPersonalization: false,
  };

  constructor(private readonly authService: AuthService) {}

  async initialize(): Promise<void> {
    if (this.initialized || !this.isConfigured()) {
      return;
    }

    if (this.isWebPlatform() && this.firebaseConfig && getApps().length === 0) {
      initializeApp(this.firebaseConfig);
    }

    await this.applyConsentState();
    this.initialized = true;
  }

  getUserType(): AnalyticsUserType {
    return this.authService.currentUserSnapshot?.role === 'member' &&
      this.authService.isAuthenticatedSnapshot
      ? 'member'
      : 'guest';
  }

  getAmountBucket(amount: number | null | undefined): AnalyticsAmountBucket {
    if (!amount || amount < 10) {
      return '0_10';
    }
    if (amount < 25) {
      return '10_25';
    }
    if (amount < 50) {
      return '25_50';
    }
    if (amount < 100) {
      return '50_100';
    }
    if (amount < 250) {
      return '100_250';
    }
    return '250_plus';
  }

  sanitizeParams(params: Record<string, unknown>): Record<string, string | number | boolean> {
    const sensitiveKeys = new Set([
      'email',
      'phone',
      'name',
      'transaction_reference',
      'stripe_id',
      'stripe_payment_intent_id',
      'stripe_checkout_session_id',
      'client_secret',
      'amount',
      'search',
      'query',
      'text',
    ]);

    return Object.entries(params).reduce<Record<string, string | number | boolean>>(
      (sanitized, [key, value]) => {
        const normalizedKey = key.trim().toLowerCase();
        if (
          value === undefined ||
          value === null ||
          sensitiveKeys.has(normalizedKey) ||
          normalizedKey.includes('email') ||
          normalizedKey.includes('phone') ||
          normalizedKey.includes('name') ||
          normalizedKey.includes('secret') ||
          normalizedKey.includes('stripe') ||
          normalizedKey.includes('transaction') ||
          normalizedKey.includes('query') ||
          normalizedKey.includes('search')
        ) {
          return sanitized;
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          sanitized[key] = typeof value === 'string' ? value.slice(0, 100) : value;
        }

        return sanitized;
      },
      {}
    );
  }

  async trackEvent(name: AnalyticsEventName, params: Record<string, unknown>): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    await this.initialize();
    if (!this.trackingAllowed) {
      return;
    }

    await FirebaseAnalytics.logEvent({
      name,
      params: this.sanitizeParams(params),
    });
  }

  async trackAppOpened(): Promise<void> {
    if (this.appOpenedTracked) {
      return;
    }
    this.appOpenedTracked = true;
    await this.trackEvent('app_opened', {
      user_type: this.getUserType(),
    });
  }

  async trackGiveNowTapped(ctaType: GiveNowCtaType): Promise<void> {
    await this.trackEvent('give_now_tapped', {
      user_type: this.getUserType(),
      cta_type: ctaType,
    });
  }

  async trackBranchSelected(context: DonationAnalyticsContext): Promise<void> {
    await this.trackEvent('branch_selected', {
      church_id: context.church_id,
      district_id: context.district_id,
      area_id: context.area_id,
      user_type: context.user_type ?? this.getUserType(),
    });
  }

  async trackDonationFormViewed(churchId: number, userType?: AnalyticsUserType): Promise<void> {
    await this.trackEvent('donation_form_viewed', {
      church_id: churchId,
      user_type: userType ?? this.getUserType(),
    });
  }

  async trackDonationCheckoutStarted(context: DonationAnalyticsContext): Promise<void> {
    await this.trackEvent('donation_checkout_started', {
      church_id: context.church_id,
      category: context.category,
      amount_bucket: context.amount_bucket,
      frequency: context.frequency,
      user_type: context.user_type ?? this.getUserType(),
    });
  }

  async trackDonationPaymentSuccess(
    context: DonationAnalyticsContext,
    verificationSource: AnalyticsVerificationSource
  ): Promise<void> {
    await this.trackEvent('donation_payment_success', {
      church_id: context.church_id,
      category: context.category,
      amount_bucket: context.amount_bucket,
      frequency: context.frequency,
      user_type: context.user_type ?? this.getUserType(),
      verification_source: verificationSource,
    });
  }

  async trackDonationPaymentCancelled(context: DonationAnalyticsContext): Promise<void> {
    await this.trackEvent('donation_payment_cancelled', {
      church_id: context.church_id,
      category: context.category,
      amount_bucket: context.amount_bucket,
      frequency: context.frequency,
      user_type: context.user_type ?? this.getUserType(),
    });
  }

  async trackDonationPaymentFailed(
    context: DonationAnalyticsContext,
    failureStage: AnalyticsFailureStage
  ): Promise<void> {
    await this.trackEvent('donation_payment_failed', {
      church_id: context.church_id,
      category: context.category,
      amount_bucket: context.amount_bucket,
      frequency: context.frequency,
      user_type: context.user_type ?? this.getUserType(),
      failure_stage: failureStage,
    });
  }

  async setTrackingEnabled(enabled: boolean): Promise<void> {
    this.trackingAllowed = enabled;
    this.consentState = {
      ...this.consentState,
      analyticsStorage: enabled,
    };
    if (!this.isConfigured()) {
      return;
    }
    await this.initialize();
    await FirebaseAnalytics.setEnabled({ enabled });
    await this.applyConsentState();
  }

  private async applyConsentState(): Promise<void> {
    const mapping: Array<[ConsentType, boolean]> = [
      [ConsentType.AnalyticsStorage, this.consentState.analyticsStorage],
      [ConsentType.AdStorage, this.consentState.adStorage],
      [ConsentType.AdUserData, this.consentState.adUserData],
      [ConsentType.AdPersonalization, this.consentState.adPersonalization],
    ];

    for (const [type, granted] of mapping) {
      await FirebaseAnalytics.setConsent({
        type,
        status: granted ? ConsentStatus.Granted : ConsentStatus.Denied,
      });
    }
  }

  private isConfigured(): boolean {
    return (
      environment.analyticsEnabled &&
      !!this.firebaseConfig?.apiKey &&
      !!this.firebaseConfig?.appId &&
      !!this.firebaseConfig?.projectId
    );
  }

  private isWebPlatform(): boolean {
    return Capacitor.getPlatform() === 'web';
  }
}
