import { Injectable, Injector } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Stripe, PaymentSheetEventsEnum } from '@capacitor-community/stripe';
import { LocaleService } from '../localization/locale.service';
import { environment } from '../../../environments/environment';
import { SentryTelemetryService } from './sentry-telemetry.service';

export type PaymentSheetOutcome = 'completed' | 'canceled' | 'failed';

const DEFAULT_BILLING_COUNTRY = 'IT';
const DEFAULT_CURRENCY_CODE = 'EUR';

@Injectable({ providedIn: 'root' })
export class StripePaymentService {
  private initialized = false;
  constructor(private readonly injector: Injector) {}

  async presentPaymentSheet(
    clientSecret: string,
    flow: 'one_time' | 'recurring' = 'one_time'
  ): Promise<{ status: PaymentSheetOutcome; errorMessage?: string }> {
    try {
      const googlePayEnabled = true;
      const googlePayIsTesting = this.isStripeTestMode();
      const platform = Capacitor.getPlatform();
      const googlePayAvailability =
        Capacitor.isNativePlatform() && platform === 'android'
          ? await this.getGooglePayAvailability()
          : null;

      this.logDiagnostics('PaymentSheet configuration prepared', {
        flow,
        platform,
        isNativePlatform: Capacitor.isNativePlatform(),
        connectedAccountMode: 'destination_charge',
        connectedAccountIdSuffix: null,
        googlePayEnabled,
        googlePayIsTesting,
        countryCode: DEFAULT_BILLING_COUNTRY,
        currencyCode: DEFAULT_CURRENCY_CODE,
        googlePayAvailable: googlePayAvailability,
      });

      this.sentryTelemetry.addFeatureBreadcrumb('donations', 'PaymentSheet init started', { flow });
      await this.init();
      this.sentryTelemetry.addFeatureBreadcrumb('donations', 'PaymentSheet init succeeded', { flow });
      await Stripe.createPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: environment.stripeMerchantDisplayName,
        enableGooglePay: googlePayEnabled,
        GooglePayIsTesting: googlePayIsTesting,
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
        googlePayEnabled: true,
        googlePayIsTesting: this.isStripeTestMode(),
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
