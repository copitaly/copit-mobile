import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { DonationFlowStateService, DonationCheckoutSummary } from '../../core/services/donation-flow-state.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import {
  DonationAnalyticsContextService,
  DonationAnalyticsContext,
} from '../../core/services/donation-analytics-context.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate-cancel',
  templateUrl: './cancel.page.html',
  styleUrls: ['./cancel.page.scss'],
})
export class DonateCancelPage implements OnInit {
  summary: DonationCheckoutSummary | null = null;

  constructor(
    private readonly router: Router,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly analyticsService: AnalyticsService,
    private readonly donationAnalyticsContext: DonationAnalyticsContextService
  ) {}

  ngOnInit(): void {
    this.summary = this.donationFlowState.consumeStoredSummary();
    const context =
      this.donationAnalyticsContext.consumeContext() ?? this.resolveSummaryAnalyticsContext(this.summary);
    if (context) {
      void this.analyticsService.trackDonationPaymentCancelled(context);
    }
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  private resolveSummaryAnalyticsContext(
    summary: DonationCheckoutSummary | null
  ): DonationAnalyticsContext | null {
    if (!summary) {
      return null;
    }

    return {
      category: summary.category,
      amount_bucket: this.analyticsService.getAmountBucket(summary.amount),
      frequency:
        summary.interval === 'monthly'
          ? 'monthly'
          : summary.interval === 'one_time'
            ? 'one_time'
            : undefined,
      user_type: this.analyticsService.getUserType(),
    };
  }
}
