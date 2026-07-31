import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

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
import { SavedChurch } from '../../core/models/user.model';
import { DonatePage } from './donate.page';

describe('DonatePage', () => {
  let page: DonatePage;
  let donationsService: jasmine.SpyObj<DonationsService>;
  let router: jasmine.SpyObj<Router>;
  let donationFlowState: jasmine.SpyObj<DonationFlowStateService>;
  let stripePaymentService: jasmine.SpyObj<StripePaymentService>;
  let toastController: jasmine.SpyObj<ToastController>;
  let toastElement: { present: jasmine.Spy };
  let selectedBranch$: BehaviorSubject<PublicBranch | null>;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let authServiceMock: {
    isAuthenticatedSnapshot: boolean;
    accessTokenSnapshot: string | null;
    currentUserSnapshot: { recent_donations?: Array<{ church: { id: number; name: string } | null }> } | null;
    isAuthenticated$: unknown;
    currentUser$: unknown;
    getCurrentUser: jasmine.Spy;
    getSavedChurches: jasmine.Spy;
  };
  let selectedBranchServiceMock: {
    selectedBranch$: BehaviorSubject<PublicBranch | null>;
    setBranch: jasmine.Spy;
  };

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

  const toSavedChurch = (
    churchOverrides: Partial<PublicBranch> & Pick<PublicBranch, 'id' | 'name'>,
    createdAt = '2026-07-30T08:00:00Z'
  ): SavedChurch => ({
    id: churchOverrides.id + 100,
    created_at: createdAt,
    church: {
      id: churchOverrides.id,
      name: churchOverrides.name,
      branch_code: churchOverrides.branch_code ?? '',
      district: churchOverrides.district ?? null,
      area: churchOverrides.area ?? null,
      donations_enabled: churchOverrides.donations_enabled ?? true,
      is_active: churchOverrides.is_active ?? true,
    },
  });

  beforeEach(() => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
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
    toastElement = { present: jasmine.createSpy('present').and.resolveTo() };
    toastController = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastController.create.and.resolveTo(toastElement as never);
    selectedBranch$ = new BehaviorSubject<PublicBranch | null>(null);
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    authServiceMock = {
      isAuthenticatedSnapshot: false,
      accessTokenSnapshot: null,
      currentUserSnapshot: null,
      isAuthenticated$: of(false),
      currentUser$: of(null),
      getCurrentUser: jasmine.createSpy().and.returnValue(of(null)),
      getSavedChurches: jasmine.createSpy().and.returnValue(of([])),
    };
    selectedBranchServiceMock = {
      selectedBranch$,
      setBranch: jasmine.createSpy().and.returnValue(true),
    };

    donationsService.getPublicDonationCategories.and.returnValue(of([]));
    stripePaymentService.presentPaymentSheet.and.resolveTo({ status: 'completed' });

    page = new DonatePage(
      new FormBuilder(),
      donationsService,
      donationFlowState,
      authServiceMock as unknown as AuthService,
      selectedBranchServiceMock as unknown as SelectedBranchService,
      { queryParamMap: queryParamMap$.asObservable() } as unknown as ActivatedRoute,
      router,
      stripePaymentService,
      toastController,
      {} as AlertController,
      {
        addFeatureBreadcrumb(): void {},
        captureFeatureError(): void {},
      } as unknown as SentryTelemetryService,
      {
        trackDonationCheckoutStarted: jasmine.createSpy().and.resolveTo(),
        trackDonationPaymentFailed: jasmine.createSpy().and.resolveTo(),
        trackBranchSelected: jasmine.createSpy().and.resolveTo(),
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

  it('routes submitDonation through the native one-time payment path on native runtimes', () => {
    donationsService.createMobileCheckout.and.returnValue(
      of({
        donation_id: 55,
        transaction_reference: 'TRX-NATIVE-1',
        client_secret: 'pi_secret_native_123',
      })
    );

    page.submitDonation();

    expect(donationsService.createMobileCheckout).toHaveBeenCalledWith(
      jasmine.objectContaining({
        church_id: branch.id,
        category_id: category.id,
        amount: 45,
      })
    );
    expect(donationsService.createCheckout).not.toHaveBeenCalled();
  });

  it('uses hosted checkout on browser runtimes only when the native payment sheet is unavailable', () => {
    (Capacitor.isNativePlatform as jasmine.Spy).and.returnValue(false);
    donationsService.createCheckout.and.returnValue(
      of({
        checkout_url: 'https://example.com/checkout',
        donation_id: 77,
        transaction_reference: 'TRX-WEB-1',
      })
    );

    page.startNativePayment();

    expect(donationsService.createCheckout).toHaveBeenCalledWith(
      jasmine.objectContaining({
        church_id: branch.id,
        category_id: category.id,
        amount: 45,
      })
    );
    expect(donationsService.createMobileCheckout).not.toHaveBeenCalled();
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

  it('rejects incomplete decimal amounts before payment initiation', () => {
    page.form.patchValue({ amount: '12.' });
    (page as unknown as { customAmountInputValue: string }).customAmountInputValue = '12.';
    page.form.get('amount')?.markAsTouched();

    page.startNativePayment();

    expect(page.amountValidationMessage).toBe('Complete the amount before continuing');
    expect(donationsService.createMobileCheckout).not.toHaveBeenCalled();
  });

  it('rejects malformed negative amounts before payment initiation', () => {
    page.form.patchValue({ amount: '-5' });
    (page as unknown as { customAmountInputValue: string }).customAmountInputValue = '-5';
    page.form.get('amount')?.markAsTouched();

    page.startNativePayment();

    expect(page.amountValidationMessage).toBe('Enter a valid amount in euros');
    expect(donationsService.createMobileCheckout).not.toHaveBeenCalled();
  });

  it('prevents duplicate native checkout requests while one is in flight', () => {
    const response$ = new Subject<{ donation_id: number; transaction_reference: string; client_secret: string }>();
    donationsService.createMobileCheckout.and.returnValue(response$.asObservable());

    page.startNativePayment();
    page.startNativePayment();

    expect(donationsService.createMobileCheckout.calls.count()).toBe(1);
  });

  it('shows an offline message for native checkout failures', () => {
    donationsService.createMobileCheckout.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 }))
    );

    page.startNativePayment();

    expect(page.nativeError).toBe("You're offline. Check your connection and try again.");
  });

  it('shows a timeout message for native checkout failures', () => {
    donationsService.createMobileCheckout.and.returnValue(
      throwError(() => ({ name: 'TimeoutError' }))
    );

    page.startNativePayment();

    expect(page.nativeError).toBe('The payment request timed out. Please try again.');
  });

  it('routes Stripe cancellations to the cancel page', async () => {
    donationsService.createMobileCheckout.and.returnValue(
      of({
        donation_id: 55,
        transaction_reference: 'TRX-2002',
        client_secret: 'pi_secret_123',
      })
    );
    stripePaymentService.presentPaymentSheet.and.resolveTo({ status: 'canceled' });

    page.startNativePayment();
    await Promise.resolve();
    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledWith(['/donate/cancel']);
  });

  it('keeps the form recoverable after payment-sheet failure', async () => {
    donationsService.createMobileCheckout.and.returnValue(
      of({
        donation_id: 55,
        transaction_reference: 'TRX-2002',
        client_secret: 'pi_secret_123',
      })
    );
    stripePaymentService.presentPaymentSheet.and.resolveTo({ status: 'failed', errorMessage: 'Payment failed. Please try again.' });

    page.startNativePayment();
    await Promise.resolve();
    await Promise.resolve();

    expect(page.nativeError).toBe('Payment failed. Please try again.');
    expect(page.nativeLoading).toBeFalse();
    expect(toastController.create).toHaveBeenCalled();
    expect(toastElement.present).toHaveBeenCalled();
  });

  it('opens the church selector by adding the selector query param', () => {
    page.openChurchSelector();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: jasmine.anything(),
      queryParams: { churchSelector: '1' },
      queryParamsHandling: 'merge',
    });
  });

  it('closes the selector and updates the selected branch when a church is chosen', () => {
    page.handleBranchSelected(branch);

    expect(selectedBranchServiceMock.setBranch).toHaveBeenCalledWith(branch);
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: jasmine.anything(),
      queryParams: { churchSelector: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('does not prefill when no saved branches exist', () => {
    (page as unknown as { branch: PublicBranch | null }).branch = null;
    authServiceMock.isAuthenticatedSnapshot = true;
    authServiceMock.getSavedChurches.and.returnValue(of([]));

    page.ionViewWillEnter();

    expect(authServiceMock.getSavedChurches).toHaveBeenCalled();
    expect(selectedBranchServiceMock.setBranch).not.toHaveBeenCalled();
  });

  it('prefills the only saved branch when no donation branch is selected', () => {
    (page as unknown as { branch: PublicBranch | null }).branch = null;
    authServiceMock.isAuthenticatedSnapshot = true;
    authServiceMock.getSavedChurches.and.returnValue(of([toSavedChurch(branch)]));

    page.ionViewWillEnter();

    expect(selectedBranchServiceMock.setBranch).toHaveBeenCalledWith(jasmine.objectContaining({ id: branch.id, name: branch.name }));
  });

  it('prefers the most recently used saved branch when recent donation metadata exists', () => {
    const otherBranch: PublicBranch = {
      id: 33,
      name: 'Turin North',
      branch_code: 'TOR-02',
      level: 'local',
      donations_enabled: true,
      is_active: true,
      district: { id: 6, name: 'Turin' },
      area: { id: 3, name: 'Northwest' },
    };
    (page as unknown as { branch: PublicBranch | null }).branch = null;
    authServiceMock.isAuthenticatedSnapshot = true;
    authServiceMock.currentUserSnapshot = {
      recent_donations: [{ church: { id: otherBranch.id, name: otherBranch.name } }],
    };
    authServiceMock.getSavedChurches.and.returnValue(of([toSavedChurch(branch), toSavedChurch(otherBranch)]));

    page.ionViewWillEnter();

    expect(selectedBranchServiceMock.setBranch).toHaveBeenCalledWith(jasmine.objectContaining({ id: otherBranch.id }));
  });

  it('keeps an existing explicit donation selection instead of pre-filling from saved branches', () => {
    authServiceMock.isAuthenticatedSnapshot = true;
    authServiceMock.getSavedChurches.and.returnValue(of([toSavedChurch(branch)]));

    page.ionViewWillEnter();

    expect(authServiceMock.getSavedChurches).not.toHaveBeenCalled();
    expect(selectedBranchServiceMock.setBranch).not.toHaveBeenCalled();
  });

  it('falls back to the next valid saved branch when the first entry is invalid', () => {
    const validBranch: PublicBranch = {
      id: 44,
      name: 'Vicenza Central',
      branch_code: 'VIC-01',
      level: 'local',
      donations_enabled: true,
      is_active: true,
      district: { id: 7, name: 'Vicenza' },
      area: { id: 8, name: 'Veneto' },
    };
    (page as unknown as { branch: PublicBranch | null }).branch = null;
    authServiceMock.isAuthenticatedSnapshot = true;
    authServiceMock.getSavedChurches.and.returnValue(
      of([
        toSavedChurch({ id: 0, name: '' } as PublicBranch),
        toSavedChurch({ ...branch, id: 99, name: 'Inactive', is_active: false }),
        toSavedChurch(validBranch),
      ])
    );

    page.ionViewWillEnter();

    expect(selectedBranchServiceMock.setBranch).toHaveBeenCalledWith(jasmine.objectContaining({ id: validBranch.id }));
  });

  it('allows a user-selected church to replace the prefilled branch for the current donation flow', () => {
    const prefilledBranch: PublicBranch = {
      id: 66,
      name: 'Brescia East',
      branch_code: 'BRE-02',
      level: 'local',
      donations_enabled: true,
      is_active: true,
      district: { id: 9, name: 'Brescia' },
      area: { id: 10, name: 'Lombardy' },
    };
    authServiceMock.isAuthenticatedSnapshot = true;
    authServiceMock.getSavedChurches.and.returnValue(of([toSavedChurch(prefilledBranch)]));
    (page as unknown as { branch: PublicBranch | null }).branch = null;

    page.ionViewWillEnter();
    page.handleBranchSelected(branch);

    expect(selectedBranchServiceMock.setBranch.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({ id: prefilledBranch.id }));
    expect(selectedBranchServiceMock.setBranch.calls.argsFor(1)[0]).toBe(branch);
  });
});
