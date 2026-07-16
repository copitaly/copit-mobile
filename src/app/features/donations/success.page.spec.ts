import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DonationAnalyticsContextService } from '../../core/services/donation-analytics-context.service';
import { DonationFlowStateService } from '../../core/services/donation-flow-state.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { DonateSuccessPage } from './success.page';

describe('DonateSuccessPage', () => {
  function createPage(queryParams: Record<string, string | null>, storedSummary?: unknown) {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    const donationFlowState = jasmine.createSpyObj<DonationFlowStateService>('DonationFlowStateService', [
      'getStoredSummary',
      'consumeStoredSummary',
      'clear',
    ]);
    donationFlowState.getStoredSummary.and.returnValue((storedSummary ?? null) as never);
    donationFlowState.consumeStoredSummary.and.returnValue((storedSummary ?? null) as never);

    const page = new DonateSuccessPage(
      api,
      donationFlowState,
      jasmine.createSpyObj<Router>('Router', ['navigate']),
      {
        snapshot: {
          queryParamMap: convertToParamMap(queryParams),
        },
      } as ActivatedRoute,
      {
        captureFeatureError(): void {},
      } as unknown as SentryTelemetryService,
      {
        trackDonationPaymentSuccess: jasmine.createSpy().and.resolveTo(),
      } as unknown as AnalyticsService,
      {
        clearContext: jasmine.createSpy(),
        peekContext: jasmine.createSpy().and.returnValue(null),
      } as unknown as DonationAnalyticsContextService
    );

    return { page, api, donationFlowState };
  }

  it('verifies mobile payments with donation_id and transaction_reference', () => {
    const { page, api } = createPage({
      donation_id: '42',
      transaction_reference: 'TRX-5001',
    });

    api.get.and.returnValue(
      of({
        verified: true,
        donation_id: 42,
        transaction_reference: 'TRX-5001',
      })
    );

    page.ngOnInit();

    expect(api.get).toHaveBeenCalledWith('donations/verify-mobile-payment/', {
      donation_id: 42,
      transaction_reference: 'TRX-5001',
    });
  });

  it('falls back to stored summary when transaction_reference is missing', () => {
    const storedSummary = {
      branchName: 'Turin Assembly',
      transactionReference: 'TRX-STORED',
    };
    const { page, api, donationFlowState } = createPage(
      {
        donation_id: '42',
      },
      storedSummary
    );

    page.ngOnInit();

    expect(api.get).not.toHaveBeenCalled();
    expect(donationFlowState.consumeStoredSummary).toHaveBeenCalled();
    expect(page.summary).toEqual(storedSummary);
  });
});
