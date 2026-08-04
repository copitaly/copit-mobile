import { Injector } from '@angular/core';
import { PaymentSheetEventsEnum, Stripe } from '@capacitor-community/stripe';

import { environment } from '../../../environments/environment';
import { SentryTelemetryService } from './sentry-telemetry.service';
import { StripePaymentService } from './stripe-payment.service';

describe('StripePaymentService', () => {
  let service: StripePaymentService;
  let injector: jasmine.SpyObj<Injector>;
  let sentryTelemetry: jasmine.SpyObj<SentryTelemetryService>;
  let initializeSpy: jasmine.Spy;
  let createPaymentSheetSpy: jasmine.Spy;
  let presentPaymentSheetSpy: jasmine.Spy;
  let originalPublishableKey: string;

  beforeEach(() => {
    originalPublishableKey = environment.stripePublishableKey;
    sentryTelemetry = jasmine.createSpyObj<SentryTelemetryService>('SentryTelemetryService', [
      'addFeatureBreadcrumb',
      'captureFeatureError',
    ]);
    injector = jasmine.createSpyObj<Injector>('Injector', ['get']);
    injector.get.and.returnValue(sentryTelemetry);

    initializeSpy = spyOn(Stripe, 'initialize').and.resolveTo();
    createPaymentSheetSpy = spyOn(Stripe, 'createPaymentSheet').and.resolveTo();
    presentPaymentSheetSpy = spyOn(Stripe, 'presentPaymentSheet').and.resolveTo({
      paymentResult: PaymentSheetEventsEnum.Completed,
    });

    service = new StripePaymentService(injector);
  });

  afterEach(() => {
    environment.stripePublishableKey = originalPublishableKey;
  });

  it('enables Google Pay and preserves the existing Italy PaymentSheet defaults in test mode', async () => {
    environment.stripePublishableKey = 'pk_test_example';

    await service.presentPaymentSheet('pi_secret_test');

    expect(initializeSpy).toHaveBeenCalledWith({
      publishableKey: 'pk_test_example',
    });
    expect(createPaymentSheetSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        paymentIntentClientSecret: 'pi_secret_test',
        merchantDisplayName: environment.stripeMerchantDisplayName,
        defaultBillingDetails: {
          address: {
            country: 'IT',
          },
        },
        enableGooglePay: true,
        GooglePayIsTesting: true,
        countryCode: 'IT',
        currencyCode: 'EUR',
      })
    );
  });

  it('disables Google Pay test mode for live Stripe publishable keys', async () => {
    environment.stripePublishableKey = 'pk_live_example';

    await service.presentPaymentSheet('pi_secret_live');

    expect(createPaymentSheetSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        enableGooglePay: true,
        GooglePayIsTesting: false,
        countryCode: 'IT',
        currencyCode: 'EUR',
      })
    );
  });

  it('keeps card entry flow behavior and maps completed results unchanged', async () => {
    environment.stripePublishableKey = 'pk_test_card_flow';
    presentPaymentSheetSpy.and.resolveTo({
      paymentResult: PaymentSheetEventsEnum.Completed,
    });

    const result = await service.presentPaymentSheet('pi_secret_card');

    expect(result).toEqual({ status: 'completed', errorMessage: undefined });
    expect(presentPaymentSheetSpy).toHaveBeenCalled();
  });
});
