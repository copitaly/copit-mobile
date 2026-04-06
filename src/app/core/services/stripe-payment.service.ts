import { Injectable } from '@angular/core';
import { Stripe, PaymentSheetEventsEnum } from '@capacitor-community/stripe';
import { environment } from '../../../environments/environment';

export type PaymentSheetOutcome = 'completed' | 'canceled' | 'failed';

@Injectable({ providedIn: 'root' })
export class StripePaymentService {
  private initialized = false;

  async presentPaymentSheet(
    clientSecret: string
  ): Promise<{ status: PaymentSheetOutcome; errorMessage?: string }> {
    try {
      await this.init();
      await Stripe.createPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: environment.stripeMerchantDisplayName,
      });
      console.log('[StripePaymentService] PaymentSheet created');
      const { paymentResult } = await Stripe.presentPaymentSheet();
      console.log('[StripePaymentService] PaymentSheet result', paymentResult);
      return {
        status: this.mapResult(paymentResult),
        errorMessage: paymentResult === PaymentSheetEventsEnum.Failed ? 'Payment failed. Please try again.' : undefined,
      };
    } catch (error) {
      console.error('[StripePaymentService] PaymentSheet error', error);
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
    console.log('[StripePaymentService] initialized with publishable key');
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
}
