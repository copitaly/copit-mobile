import { Injectable, Injector } from '@angular/core';
import { Stripe, PaymentSheetEventsEnum } from '@capacitor-community/stripe';
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
      this.sentryTelemetry.addFeatureBreadcrumb('donations', 'PaymentSheet init started', { flow });
      await this.init();
      this.sentryTelemetry.addFeatureBreadcrumb('donations', 'PaymentSheet init succeeded', { flow });
      await Stripe.createPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: environment.stripeMerchantDisplayName,
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
        errorMessage: paymentResult === PaymentSheetEventsEnum.Failed ? 'Payment failed. Please try again.' : undefined,
      };
    } catch (error) {
      this.sentryTelemetry.captureFeatureError('donations', 'PaymentSheet failed', error, { flow });
      return { status: 'failed', errorMessage: 'Payment sheet failed to open.' };
    }
  }

  private async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
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

  private get sentryTelemetry(): SentryTelemetryService {
    return this.injector.get(SentryTelemetryService);
  }
}
