import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { Capacitor } from '@capacitor/core';
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
  let originalApplePayMerchantId: string | undefined;
  let consoleInfoSpy: jasmine.Spy;

  beforeEach(() => {
    originalPublishableKey = environment.stripePublishableKey;
    originalMerchantDisplayName = environment.stripeMerchantDisplayName;
    originalApplePayMerchantId = environment.stripeApplePayMerchantId;

    TestBed.configureTestingModule({
      providers: [
        StripePaymentService,
        Injector,
        { provide: LocaleService, useClass: MockLocaleService },
        { provide: SentryTelemetryService, useClass: MockSentryTelemetryService },
      ],
    });

    service = TestBed.inject(StripePaymentService);
    consoleInfoSpy = spyOn(console, 'info');

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
    environment.stripeApplePayMerchantId = originalApplePayMerchantId ?? '';
  });

  it('passes Google Pay and Italy/EUR configuration into PaymentSheet on native Android', async () => {
    environment.stripePublishableKey = 'pk_test_example';
    environment.stripeMerchantDisplayName = 'COP Italy';
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    await service.presentPaymentSheet('pi_test_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        paymentIntentClientSecret: 'pi_test_secret',
        merchantDisplayName: 'COP Italy',
        enableGooglePay: true,
        GooglePayIsTesting: true,
        enableApplePay: false,
        applePayMerchantId: undefined,
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
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    await service.presentPaymentSheet('pi_test_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        GooglePayIsTesting: true,
      })
    );
  });

  it('uses Google Pay live mode for live publishable keys', async () => {
    environment.stripePublishableKey = 'pk_live_googlepay';
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    await service.presentPaymentSheet('pi_live_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        GooglePayIsTesting: false,
      })
    );
  });

  it('enables Apple Pay on native iOS when a merchant identifier is configured', async () => {
    environment.stripePublishableKey = 'pk_live_applepay';
    environment.stripeApplePayMerchantId = 'merchant.org.copitaly.copit';
    spyOn(Capacitor, 'getPlatform').and.returnValue('ios');
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    spyOn(Stripe, 'isApplePayAvailable').and.resolveTo();

    await service.presentPaymentSheet('pi_live_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        enableApplePay: true,
        applePayMerchantId: 'merchant.org.copitaly.copit',
        enableGooglePay: false,
        countryCode: 'IT',
        currencyCode: 'EUR',
      })
    );
  });

  it('disables Apple Pay on native iOS when the merchant identifier is missing', async () => {
    environment.stripePublishableKey = 'pk_live_applepay';
    environment.stripeApplePayMerchantId = '';
    spyOn(Capacitor, 'getPlatform').and.returnValue('ios');
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    await service.presentPaymentSheet('pi_live_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        enableApplePay: false,
        applePayMerchantId: undefined,
        enableGooglePay: false,
      })
    );
  });

  it('disables Apple Pay on native iOS when the configured value is not a valid merchant identifier', async () => {
    environment.stripePublishableKey = 'pk_live_applepay';
    environment.stripeMerchantDisplayName = 'COP Italy';
    environment.stripeApplePayMerchantId = 'COP Italy';
    spyOn(Capacitor, 'getPlatform').and.returnValue('ios');
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    await service.presentPaymentSheet('pi_live_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        merchantDisplayName: 'COP Italy',
        enableApplePay: false,
        applePayMerchantId: undefined,
      })
    );
  });

  it('does not pass native wallet options on web', async () => {
    environment.stripePublishableKey = 'pk_test_example';
    environment.stripeApplePayMerchantId = 'merchant.org.copitaly.copit';
    spyOn(Capacitor, 'getPlatform').and.returnValue('web');
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);

    await service.presentPaymentSheet('pi_test_secret');

    expect(Stripe.createPaymentSheet).toHaveBeenCalledWith(
      jasmine.objectContaining({
        enableGooglePay: false,
        enableApplePay: false,
        applePayMerchantId: undefined,
      })
    );
  });

  it('treats missing Apple Pay availability support as non-fatal', async () => {
    environment.stripeApplePayMerchantId = 'merchant.org.copitaly.copit';
    spyOn(Capacitor, 'getPlatform').and.returnValue('ios');
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    Object.defineProperty(Stripe, 'isApplePayAvailable', {
      value: undefined,
      configurable: true,
    });

    await expectAsync(service.presentPaymentSheet('pi_live_secret')).toBeResolvedTo({ status: 'completed', errorMessage: undefined });
    expect(Stripe.createPaymentSheet).toHaveBeenCalled();
  });

  it('does not log full client secrets in diagnostics', async () => {
    environment.stripePublishableKey = 'pk_test_example';
    spyOn(Capacitor, 'getPlatform').and.returnValue('android');
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    await service.presentPaymentSheet('pi_test_secret_sensitive');

    const loggedOutput = ([] as unknown[]).concat(...consoleInfoSpy.calls.allArgs()).join(' ');
    expect(loggedOutput).not.toContain('pi_test_secret_sensitive');
  });
});
