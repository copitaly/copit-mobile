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
      console.log('[StripePaymentService] presentPaymentSheet start', {
        clientSecretPreview: clientSecret?.slice(0, 8) + (clientSecret?.length ? '...' : ''),
      });
      await this.init();
      console.log('[StripePaymentService] createPaymentSheet start');
      await Stripe.createPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: environment.stripeMerchantDisplayName,
      });
      console.log('[StripePaymentService] createPaymentSheet succeeded');
      console.log('[StripePaymentService] PaymentSheet created');
      console.log('[StripePaymentService] presentPaymentSheet begin');
      const { paymentResult } = await Stripe.presentPaymentSheet();
      console.log('[StripePaymentService] presentPaymentSheet result', paymentResult);
      console.log('[StripePaymentService] PaymentSheet result', paymentResult);
      return {
        status: this.mapResult(paymentResult),
        errorMessage: paymentResult === PaymentSheetEventsEnum.Failed ? 'Payment failed. Please try again.' : undefined,
      };
    } catch (error) {
      console.log('[StripePaymentService] PaymentSheet error'); 
      console.dir(error, { depth: 3 });
      return { status: 'failed', errorMessage: 'Payment sheet failed to open.' };
    }
  }

  private async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    console.log('[StripePaymentService] initializing Stripe plugin');
    await Stripe.initialize({
      publishableKey: environment.stripePublishableKey,
    });
    this.initialized = true;
    console.log('[StripePaymentService] Stripe initialized with publishable key');
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
