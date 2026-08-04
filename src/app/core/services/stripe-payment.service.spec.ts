import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { Stripe, PaymentSheetEventsEnum } from '@capacitor-community/stripe';

import { StripePaymentService } from './stripe-payment.service';
import { LocaleService } from '../localization/locale.service';
import { SentryTelemetryService } from './sentry-telemetry.service';
import { environment } from '../../../environments/environment';

class MockLocaleService {
  translate = jasmine.createSpy().and.callFake((key: string) => key);
}

class MockSentryTelemetryService {
  addFeatureBreadcrumb(): void {}
  captureFeatureError(): void {}
}

describe('StripePaymentService', () => {
  let service: StripePaymentService;
  let originalPublishableKey: string;
  let originalMerchantDisplayName: string;

  beforeEach(() => {
    originalPublishableKey = environment.stripePublishableKey;
    originalMerchantDisplayName = environment.stripeMerchantDisplayName;

    TestBed.configureTestingModule({
      providers: [
        StripePaymentService,
        Injector,
        { provide: LocaleService, useClass: MockLocaleService },
        { provide: SentryTelemetryService, useClass: MockSentryTelemetryService },
      ],
    });

    service = TestBed.inject(StripePaymentService);

    spyOn(Stripe, 'initialize').and.resolveTo();
    spyOn(Stripe, 'createPaymentSheet').and.resolveTo();
    spyOn(Stripe, 'presentPaymentSheet').and.resolveTo({
      paymentResult: PaymentSheetEventsEnum.Completed,
    });
    spyOn(Stripe, 'isGooglePayAvailable').and.resolveTo({
      isGooglePayAvailable: true,
    } as never);
  });

  afterEach(() => {
    environment.stripePublishableKey = originalPublishableKey;
    environment.stripeMerchantDisplayName = originalMerchantDisplayName;
  });

  it('passes Google Pay and Italy/EUR configuration into PaymentSheet', async () => {
    environment.stripePublishableKey = 'pk_test_example';
    environment.stripeMerchantDisplayName = 'COP Italy';

    await service.presentPaymentSheet('pi_test_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        paymentIntentClientSecret: 'pi_test_secret',
        merchantDisplayName: 'COP Italy',
        enableGooglePay: true,
        GooglePayIsTesting: true,
        countryCode: 'IT',
        currencyCode: 'EUR',
        defaultBillingDetails: jasmine.objectContaining({
          address: jasmine.objectContaining({
            country: 'IT',
          }),
        }),
      })
    );
  });

  it('uses Google Pay test mode for test publishable keys', async () => {
    environment.stripePublishableKey = 'pk_test_googlepay';

    await service.presentPaymentSheet('pi_test_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        GooglePayIsTesting: true,
      })
    );
  });

  it('uses Google Pay live mode for live publishable keys', async () => {
    environment.stripePublishableKey = 'pk_live_googlepay';

    await service.presentPaymentSheet('pi_live_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        GooglePayIsTesting: false,
      })
    );
  });
});
