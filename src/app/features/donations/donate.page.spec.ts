import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { PublicBranch } from '../../core/models/branch.model';
import { DonationCategory } from '../../core/models/donation.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { DonationAnalyticsContextService } from '../../core/services/donation-analytics-context.service';
import { DonationFlowStateService } from '../../core/services/donation-flow-state.service';
import { DonationsService } from '../../core/services/donations.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { StripePaymentService } from '../../core/services/stripe-payment.service';
import { DonatePage } from './donate.page';

describe('DonatePage', () => {
  let page: DonatePage;
  let donationsService: jasmine.SpyObj<DonationsService>;
  let router: jasmine.SpyObj<Router>;
  let donationFlowState: jasmine.SpyObj<DonationFlowStateService>;
  let stripePaymentService: jasmine.SpyObj<StripePaymentService>;
  let selectedBranch$: BehaviorSubject<PublicBranch | null>;

  const branch: PublicBranch = {
    id: 12,
    name: 'Milan Central',
    branch_code: 'MIL-01',
    level: 'local',
    donations_enabled: true,
    is_active: true,
    district: { id: 4, name: 'Milan' },
    area: { id: 2, name: 'North' },
  };

  const category: DonationCategory = {
    id: 9,
    name: 'Tithe',
    slug: 'tithe',
    scope: 'global',
    church: null,
    description: '',
    is_active: true,
    allow_recurring: true,
    sort_order: 10,
  };

  beforeEach(() => {
    donationsService = jasmine.createSpyObj<DonationsService>('DonationsService', [
      'createCheckout',
      'createMobileCheckout',
      'createRecurringDonation',
      'getPublicDonationCategories',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    donationFlowState = jasmine.createSpyObj<DonationFlowStateService>('DonationFlowStateService', ['setSummary']);
    stripePaymentService = jasmine.createSpyObj<StripePaymentService>('StripePaymentService', ['presentPaymentSheet']);
    selectedBranch$ = new BehaviorSubject<PublicBranch | null>(null);

    donationsService.getPublicDonationCategories.and.returnValue(of([]));
    stripePaymentService.presentPaymentSheet.and.resolveTo({ status: 'completed' });

    page = new DonatePage(
      new FormBuilder(),
      donationsService,
      donationFlowState,
      {
        isAuthenticatedSnapshot: false,
        accessTokenSnapshot: null,
        currentUserSnapshot: null,
        isAuthenticated$: of(false),
        currentUser$: of(null),
        getCurrentUser: jasmine.createSpy().and.returnValue(of(null)),
      } as unknown as AuthService,
      { selectedBranch$ } as unknown as SelectedBranchService,
      router,
      stripePaymentService,
      {} as ToastController,
      {} as AlertController,
      {
        addFeatureBreadcrumb(): void {},
        captureFeatureError(): void {},
      } as unknown as SentryTelemetryService,
      {
        trackDonationCheckoutStarted: jasmine.createSpy().and.resolveTo(),
        trackDonationPaymentFailed: jasmine.createSpy().and.resolveTo(),
        getAmountBucket: jasmine.createSpy().and.returnValue('0-99'),
        getUserType: jasmine.createSpy().and.returnValue('guest'),
      } as unknown as AnalyticsService,
      {
        setContext: jasmine.createSpy(),
        clearContext: jasmine.createSpy(),
        peekContext: jasmine.createSpy().and.returnValue(null),
      } as unknown as DonationAnalyticsContextService
    );

    (page as unknown as { branch: PublicBranch | null }).branch = branch;
    page.categories = [category];
    page.form.patchValue({
      categoryId: category.id,
      amount: '45.00',
      donor_email: 'giver@example.com',
    });
    (page as unknown as { customAmountInputValue: string }).customAmountInputValue = '45.00';
  });

  it('shows inactive-branch validation errors returned by the backend', () => {
    donationsService.createMobileCheckout.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { church_id: ['This branch is currently inactive.'] },
          })
      )
    );

    page.startNativePayment();

    expect(page.nativeError).toBe('This branch is currently inactive.');
  });

  it('shows stripe-not-ready validation errors returned by the backend', () => {
    donationsService.createMobileCheckout.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { category_id: ['This branch is not ready to accept donations yet.'] },
          })
      )
    );

    page.startNativePayment();

    expect(page.nativeError).toBe('This branch is not ready to accept donations yet.');
  });

  it('shows donations-paused validation errors returned by the backend', () => {
    donationsService.createMobileCheckout.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { detail: 'Donations are currently paused for this branch.' },
          })
      )
    );

    page.startNativePayment();

    expect(page.nativeError).toBe('Donations are currently paused for this branch.');
  });

  it('stores and forwards the transaction reference for successful native payments', async () => {
    donationsService.createMobileCheckout.and.returnValue(
      of({
        donation_id: 55,
        transaction_reference: 'TRX-2002',
        client_secret: 'pi_secret_123',
      })
    );

    page.startNativePayment();
    await Promise.resolve();
    await Promise.resolve();

    expect(donationFlowState.setSummary).toHaveBeenCalledWith(
      jasmine.objectContaining({
        branchId: branch.id,
        transactionReference: 'TRX-2002',
        donorEmail: 'giver@example.com',
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/donate/success'], {
      queryParams: {
        donation_id: 55,
        transaction_reference: 'TRX-2002',
      },
    });
  });
});
