import { Injectable, Injector } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Stripe, PaymentSheetEventsEnum } from '@capacitor-community/stripe';
import { LocaleService } from '../localization/locale.service';
import { environment } from '../../../environments/environment';
import { SentryTelemetryService } from './sentry-telemetry.service';

export type PaymentSheetOutcome = 'completed' | 'canceled' | 'failed';

const DEFAULT_BILLING_COUNTRY = 'IT';
const DEFAULT_CURRENCY_CODE = 'EUR';
const APPLE_PAY_MERCHANT_ID_PATTERN = /^merchant\.[A-Za-z0-9.-]+$/;

@Injectable({ providedIn: 'root' })
export class StripePaymentService {
  private initialized = false;
  constructor(private readonly injector: Injector) {}

  async presentPaymentSheet(
    clientSecret: string,
    flow: 'one_time' | 'recurring' = 'one_time'
  ): Promise<{ status: PaymentSheetOutcome; errorMessage?: string }> {
    try {
      const platform = Capacitor.getPlatform();
      const walletConfiguration = await this.getWalletConfiguration(platform);

      this.logDiagnostics('PaymentSheet configuration prepared', {
        flow,
        platform,
        isNativePlatform: Capacitor.isNativePlatform(),
        connectedAccountMode: 'destination_charge',
        connectedAccountIdSuffix: null,
        googlePayEnabled: walletConfiguration.googlePayEnabled,
        googlePayIsTesting: walletConfiguration.googlePayIsTesting,
        applePayEnabled: walletConfiguration.applePayEnabled,
        applePayMerchantConfigured: walletConfiguration.applePayMerchantConfigured,
        applePayMerchantValid: walletConfiguration.applePayMerchantValid,
        applePayAvailable: walletConfiguration.applePayAvailable,
        countryCode: DEFAULT_BILLING_COUNTRY,
        currencyCode: DEFAULT_CURRENCY_CODE,
        googlePayAvailable: walletConfiguration.googlePayAvailable,
      });

      this.sentryTelemetry.addFeatureBreadcrumb('donations', 'PaymentSheet init started', { flow });
      await this.init();
      this.sentryTelemetry.addFeatureBreadcrumb('donations', 'PaymentSheet init succeeded', { flow });
      await Stripe.createPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: environment.stripeMerchantDisplayName,
        enableGooglePay: walletConfiguration.googlePayEnabled,
        GooglePayIsTesting: walletConfiguration.googlePayIsTesting,
        enableApplePay: walletConfiguration.applePayEnabled,
        applePayMerchantId: walletConfiguration.applePayMerchantId || undefined,
        defaultBillingDetails: {
          address: {
            country: DEFAULT_BILLING_COUNTRY,
          },
        },
        countryCode: DEFAULT_BILLING_COUNTRY,
        currencyCode: DEFAULT_CURRENCY_CODE,
      });
      this.sentryTelemetry.addFeatureBreadcrumb('donations', 'PaymentSheet opened', { flow });
      const { paymentResult } = await Stripe.presentPaymentSheet();
      const status = this.mapResult(paymentResult);
      this.sentryTelemetry.addFeatureBreadcrumb(
        'donations',
        status === 'completed'
          ? 'PaymentSheet succeeded'
          : status === 'canceled'
            ? 'PaymentSheet canceled'
            : 'PaymentSheet failed',
        { flow }
      );
      return {
        status,
        errorMessage:
          paymentResult === PaymentSheetEventsEnum.Failed
            ? this.localeService.translate('donations.paymentFailed')
            : undefined,
      };
    } catch (error) {
      this.logDiagnostics('PaymentSheet initialization failure', {
        flow,
        platform: Capacitor.getPlatform(),
        isNativePlatform: Capacitor.isNativePlatform(),
        connectedAccountMode: 'destination_charge',
        connectedAccountIdSuffix: null,
        googlePayEnabled: Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
        googlePayIsTesting: this.isStripeTestMode(),
        applePayEnabled: this.isApplePayEnabledForPlatform(Capacitor.getPlatform()),
        applePayMerchantConfigured: this.getRawApplePayMerchantId().length > 0,
        applePayMerchantValid: this.getApplePayMerchantId().length > 0,
        countryCode: DEFAULT_BILLING_COUNTRY,
        currencyCode: DEFAULT_CURRENCY_CODE,
        error: this.describeError(error),
      });
      this.sentryTelemetry.captureFeatureError('donations', 'PaymentSheet failed', error, { flow });
      return { status: 'failed', errorMessage: this.localeService.translate('donations.failed.sheetOpenError') };
    }
  }

  private async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.logDiagnostics('Stripe.initialize called', {
      publishableKeyMode: this.isStripeTestMode() ? 'test' : 'live',
      stripeAccountConfigured: false,
      applePayMerchantConfigured: this.getRawApplePayMerchantId().length > 0,
      applePayMerchantValid: this.getApplePayMerchantId().length > 0,
    });
    await Stripe.initialize({
      publishableKey: environment.stripePublishableKey,
    });
    this.initialized = true;
  }

  private mapResult(result: PaymentSheetEventsEnum): PaymentSheetOutcome {
    switch (result) {
      case PaymentSheetEventsEnum.Completed:
        return 'completed';
      case PaymentSheetEventsEnum.Canceled:
        return 'canceled';
      default:
        return 'failed';
    }
  }

  private isStripeTestMode(): boolean {
    return environment.stripePublishableKey.trim().startsWith('pk_test_');
  }

  private async getWalletConfiguration(platform: string): Promise<{
    googlePayEnabled: boolean;
    googlePayIsTesting: boolean;
    googlePayAvailable: boolean | null;
    applePayEnabled: boolean;
    applePayMerchantId: string;
    applePayMerchantConfigured: boolean;
    applePayMerchantValid: boolean;
    applePayAvailable: boolean | null;
  }> {
    const googlePayEnabled = Capacitor.isNativePlatform() && platform === 'android';
    const googlePayIsTesting = this.isStripeTestMode();
    const rawApplePayMerchantId = this.getRawApplePayMerchantId();
    const applePayMerchantId = this.getApplePayMerchantId();
    const applePayMerchantConfigured = rawApplePayMerchantId.length > 0;
    const applePayMerchantValid = applePayMerchantId.length > 0;
    const applePayEnabled = Capacitor.isNativePlatform() && platform === 'ios' && applePayMerchantValid;
    const googlePayAvailable = googlePayEnabled ? await this.getGooglePayAvailability() : null;
    const applePayAvailable =
      Capacitor.isNativePlatform() && platform === 'ios' && applePayMerchantConfigured
        ? await this.getApplePayAvailability()
        : null;

    if (Capacitor.isNativePlatform() && platform === 'ios' && applePayMerchantConfigured && !applePayMerchantValid) {
      this.logDiagnostics('Apple Pay merchant identifier is configured but invalid', {
        expectedFormat: 'merchant.<reverse-domain-name>',
      });
    }

    return {
      googlePayEnabled,
      googlePayIsTesting,
      googlePayAvailable,
      applePayEnabled,
      applePayMerchantId,
      applePayMerchantConfigured,
      applePayMerchantValid,
      applePayAvailable,
    };
  }

  private isApplePayEnabledForPlatform(platform: string): boolean {
    return Capacitor.isNativePlatform() && platform === 'ios' && this.getApplePayMerchantId().length > 0;
  }

  private getRawApplePayMerchantId(): string {
    return environment.stripeApplePayMerchantId.trim();
  }

  private getApplePayMerchantId(): string {
    const merchantId = this.getRawApplePayMerchantId();
    return APPLE_PAY_MERCHANT_ID_PATTERN.test(merchantId) ? merchantId : '';
  }

  private async getGooglePayAvailability(): Promise<boolean | null> {
    try {
      const availability = (await Stripe.isGooglePayAvailable()) as unknown;
      if (typeof availability === 'boolean') {
        return availability;
      }

      if (
        availability !== null &&
        availability !== undefined &&
        typeof availability === 'object' &&
        'isGooglePayAvailable' in availability &&
        typeof (availability as { isGooglePayAvailable?: unknown }).isGooglePayAvailable === 'boolean'
      ) {
        return (availability as { isGooglePayAvailable: boolean }).isGooglePayAvailable;
      }

      return null;
    } catch (error) {
      this.logDiagnostics('Stripe.isGooglePayAvailable failed', {
        error: this.describeError(error),
      });
      return null;
    }
  }

  private async getApplePayAvailability(): Promise<boolean | null> {
    if (!('isApplePayAvailable' in Stripe) || typeof Stripe.isApplePayAvailable !== 'function') {
      this.logDiagnostics('Stripe.isApplePayAvailable unavailable in installed plugin', {});
      return null;
    }

    try {
      const availability = (await Stripe.isApplePayAvailable()) as unknown;

      if (typeof availability === 'boolean') {
        return availability;
      }

      return true;
    } catch (error) {
      this.logDiagnostics('Stripe.isApplePayAvailable failed', {
        error: this.describeError(error),
      });
      return false;
    }
  }

  private logDiagnostics(message: string, details: Record<string, unknown>): void {
    if (!environment.production) {
      console.info('[StripePaymentService]', message, details);
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private get sentryTelemetry(): SentryTelemetryService {
    return this.injector.get(SentryTelemetryService);
  }

  private get localeService(): LocaleService {
    return this.injector.get(LocaleService);
  }
}
