import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';

import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { RecurringDonationItem } from '../../core/models/donation.model';
import { AppToastService } from '../../core/services/app-toast.service';
import { AuthService } from '../../core/services/auth.service';
import { DonationsService } from '../../core/services/donations.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

type RecurringFilter = 'active' | 'pending' | 'cancelled' | 'all';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-recurring-donations',
  template: `
    <ion-page>
      <ion-content fullscreen class="recurring-content cop-content--secondary">
        <div class="recurring-shell cop-secondary-shell">
          <header class="recurring-header" [attr.aria-label]="'donations.recurringTitle' | t">
            <app-mobile-header
              [title]="'donations.recurringTitle' | t"
              [subtitle]="'donations.recurringSubtitle' | t"
              fallbackRoute="/tabs/profile"
              tone="editorial"
            ></app-mobile-header>
          </header>

          <div class="recurring-surface">
            <div class="recurring-surface__content">
              <div *ngIf="!loading && !errorMessage && hasAnyRecurringHistory" class="summary-card">
                <p class="summary-card__eyebrow">{{ 'donations.recurringSummaryEyebrow' | t }}</p>
                <h2>{{ monthlySupportTotal }}</h2>
                <p class="summary-card__meta">{{ monthlySupportCountLabel }}</p>
              </div>

              <div class="filter-group" *ngIf="!loading && !errorMessage && hasAnyRecurringHistory">
                <button
                  type="button"
                  class="filter-chip"
                  [class.selected]="selectedFilter === 'active'"
                  (click)="setFilter('active')"
                >
                  {{ 'donations.recurringFilterActive' | t }}
                </button>
                <button
                  type="button"
                  class="filter-chip"
                  [class.selected]="selectedFilter === 'pending'"
                  (click)="setFilter('pending')"
                >
                  {{ 'donations.recurringFilterPending' | t }}
                </button>
                <button
                  type="button"
                  class="filter-chip"
                  [class.selected]="selectedFilter === 'cancelled'"
                  (click)="setFilter('cancelled')"
                >
                  {{ 'donations.recurringFilterCancelled' | t }}
                </button>
                <button
                  type="button"
                  class="filter-chip"
                  [class.selected]="selectedFilter === 'all'"
                  (click)="setFilter('all')"
                >
                  {{ 'donations.recurringFilterAll' | t }}
                </button>
              </div>

              <div *ngIf="loading" class="skeleton-stack" aria-live="polite">
                <div class="recurring-card skeleton" *ngFor="let item of skeletonItems">
                  <div class="skeleton-row skeleton-row--top">
                    <span class="skeleton-line skeleton-line--title"></span>
                    <span class="skeleton-pill"></span>
                  </div>
                  <span class="skeleton-line skeleton-line--meta"></span>
                  <span class="skeleton-line skeleton-line--meta short"></span>
                  <span class="skeleton-line skeleton-line--meta"></span>
                </div>
              </div>

              <div *ngIf="!loading && errorMessage" class="state-card error-state">
                <div class="state-copy">
                  <h2>{{ 'donations.recurringLoadErrorTitle' | t }}</h2>
                  <p>{{ errorMessage }}</p>
                </div>
                <ion-button expand="block" class="state-button" (click)="loadRecurringDonations()">{{ 'common.tryAgain' | t }}</ion-button>
              </div>

              <div *ngIf="!loading && !errorMessage && recurringDonations.length === 0" class="state-card empty-state">
                <div class="state-copy">
                  <h2>{{ emptyStateTitle }}</h2>
                  <p>{{ emptyStateMessage }}</p>
                </div>
                <ion-button
                  *ngIf="showStartMonthlyGivingButton"
                  expand="block"
                  class="give-now-button"
                  (click)="goToDonationFlow()"
                >
                  <ion-icon name="gift-outline" slot="start" aria-hidden="true"></ion-icon>
                  <span>{{ 'donations.recurringStartMonthlyGiving' | t }}</span>
                </ion-button>
              </div>

              <div *ngIf="!loading && !errorMessage && recurringDonations.length > 0" class="recurring-stack">
                <article class="recurring-card" *ngFor="let donation of recurringDonations">
                  <div class="recurring-card__top">
                    <div>
                      <p class="recurring-amount">{{ donation.amount }} {{ donation.currency | uppercase }}</p>
                      <h2>{{ donation.church?.name || localeService.translate('donations.recurringChurchFallback') }}</h2>
                    </div>
                    <span class="recurring-status" [class]="statusClass(donation.status)">
                      {{ formatStatus(donation.status) }}
                    </span>
                  </div>

                  <div class="recurring-meta">
                    <div class="meta-row">
                      <span>{{ 'donations.recurringCategoryLabel' | t }}</span>
                      <strong>{{ formatCategory(donation.category) }}</strong>
                    </div>
                    <div class="meta-row">
                      <span>{{ 'donations.recurringIntervalLabel' | t }}</span>
                      <strong>{{ formatInterval(donation.interval) }}</strong>
                    </div>
                    <div class="meta-row" *ngIf="nextChargeText(donation) as nextCharge">
                      <span>{{ 'donations.recurringNextChargeLabel' | t }}</span>
                      <strong>{{ nextCharge }}</strong>
                    </div>
                    <div class="meta-row" *ngIf="donation.last_payment_date">
                      <span>{{ 'donations.recurringLastPaymentLabel' | t }}</span>
                      <strong>{{ formatDate(donation.last_payment_date) }}</strong>
                    </div>
                    <div class="meta-row" *ngIf="isCancelled(donation)">
                      <span>{{ 'donations.recurringEndedOnLabel' | t }}</span>
                      <strong>{{ formatCancelledDate(donation) }}</strong>
                    </div>
                  </div>

                  <p class="status-helper" *ngIf="statusHelperText(donation.status) as helperText">
                    {{ helperText }}
                  </p>

                  <ion-button
                    *ngIf="canCancel(donation)"
                    expand="block"
                    fill="outline"
                    class="cancel-button"
                    [disabled]="cancellingIds.has(donation.id)"
                    (click)="confirmCancel(donation)"
                  >
                    <ion-spinner *ngIf="cancellingIds.has(donation.id)" slot="start" name="crescent"></ion-spinner>
                    <span>{{ cancellingIds.has(donation.id) ? ('donations.recurringCancellingAction' | t) : ('donations.recurringCancelAction' | t) }}</span>
                  </ion-button>
                </article>

                <ion-button
                  *ngIf="nextPageUrl"
                  expand="block"
                  fill="outline"
                  class="load-more-button"
                  [disabled]="loadingMore"
                  (click)="loadMore()"
                >
                  <ion-spinner *ngIf="loadingMore" slot="start" name="crescent"></ion-spinner>
                  <span>{{ loadingMore ? ('donations.loadingMore' | t) : ('donations.loadMore' | t) }}</span>
                </ion-button>
              </div>
            </div>
          </div>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .recurring-content {
        --background: var(--cop-color-background-soft);
      }

      .recurring-shell {
        gap: 0.95rem;
      }

      .recurring-surface {
        width: 100%;
        max-width: 32rem;
        margin: 0 auto;
      }

      .recurring-surface__content,
      .recurring-stack,
      .skeleton-stack,
      .state-copy {
        display: flex;
        flex-direction: column;
      }

      .recurring-surface__content {
        gap: 0.9rem;
        padding-bottom: calc(1.1rem + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)));
      }

      .summary-card,
      .recurring-card,
      .state-card {
        background: #fff;
        border: 1px solid rgba(8, 31, 92, 0.08);
        border-radius: 16px;
        box-shadow: 0 10px 22px rgba(7, 24, 69, 0.06);
      }

      .summary-card {
        padding: 1rem;
      }

      .summary-card__eyebrow,
      .status-helper,
      .meta-row span {
        color: rgba(8, 31, 92, 0.58);
      }

      .summary-card__eyebrow {
        margin: 0 0 0.32rem;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .summary-card h2,
      .summary-card__meta,
      .state-copy h2,
      .state-copy p,
      .recurring-card h2,
      .recurring-amount {
        margin: 0;
      }

      .summary-card h2 {
        color: #081f5c;
        font-size: 1.5rem;
        line-height: 1.1;
        letter-spacing: -0.02em;
      }

      .summary-card__meta {
        margin-top: 0.32rem;
        color: rgba(8, 31, 92, 0.68);
        font-size: 0.88rem;
      }

      .filter-group {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
      }

      .filter-chip {
        min-height: 42px;
        padding: 0.68rem 0.9rem;
        border: 1px solid var(--cop-color-border-field);
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 6px 16px rgba(7, 24, 69, 0.05);
        color: rgba(8, 31, 92, 0.72);
        font-size: 0.85rem;
        font-weight: 600;
      }

      .filter-chip.selected {
        border-color: rgba(11, 29, 115, 0.12);
        background: rgba(11, 29, 115, 0.06);
        color: #081f5c;
      }

      .recurring-stack,
      .skeleton-stack {
        gap: 0.85rem;
      }

      .recurring-card {
        padding: 0.95rem 1rem;
      }

      .recurring-card__top,
      .meta-row,
      .skeleton-row {
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
      }

      .recurring-card__top {
        align-items: flex-start;
      }

      .recurring-amount {
        color: #081f5c;
        font-size: 1.08rem;
        font-weight: 700;
        line-height: 1.15;
      }

      .recurring-card h2 {
        margin-top: 0.28rem;
        color: #03173f;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.3;
      }

      .recurring-status {
        display: inline-flex;
        align-items: center;
        align-self: flex-start;
        min-height: 24px;
        padding: 0.22rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        background: rgba(8, 31, 92, 0.08);
        color: rgba(8, 31, 92, 0.72);
      }

      .recurring-status--active {
        background: rgba(78, 142, 100, 0.14);
        color: #356947;
      }

      .recurring-status--past_due,
      .recurring-status--incomplete {
        background: rgba(213, 166, 47, 0.16);
        color: #8f6910;
      }

      .recurring-status--cancelled {
        background: rgba(198, 62, 81, 0.12);
        color: #a6293a;
      }

      .recurring-meta {
        display: flex;
        flex-direction: column;
        gap: 0.48rem;
        margin-top: 0.82rem;
        padding-top: 0.82rem;
        border-top: 1px solid rgba(3, 23, 63, 0.08);
      }

      .meta-row {
        align-items: baseline;
      }

      .meta-row span {
        font-size: 0.8rem;
      }

      .meta-row strong {
        color: #03173f;
        font-size: 0.9rem;
        font-weight: 600;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .status-helper {
        margin: 0.75rem 0 0;
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .cancel-button,
      .load-more-button,
      .state-button {
        --border-radius: 16px;
        font-weight: 600;
      }

      .cancel-button,
      .load-more-button {
        --background: transparent;
        --color: #0b1d73;
        --border-color: rgba(11, 29, 115, 0.14);
        --box-shadow: none;
        margin-top: 0.85rem;
      }

      .state-card {
        padding: 1.15rem 1rem;
        align-items: center;
        text-align: center;
        gap: 0.85rem;
      }

      .state-copy {
        gap: 0.32rem;
      }

      .state-copy h2 {
        color: #03173f;
        font-size: 1.05rem;
        font-weight: 700;
      }

      .state-copy p {
        color: rgba(3, 23, 63, 0.65);
        font-size: 0.92rem;
        line-height: 1.45;
      }

      .empty-state {
        justify-content: center;
        min-height: min(55vh, 28rem);
      }

      .state-button {
        --background: #0b1d73;
        --background-activated: #09175c;
        --box-shadow: 0 12px 22px rgba(11, 29, 115, 0.2);
      }

      .give-now-button {
        --background: #f5b628;
        --background-activated: #d79d1f;
        --border-radius: 999px;
        --box-shadow: 0 10px 22px rgba(245, 182, 40, 0.24);
        --color: #0b1d73;
        min-height: 52px;
        font-weight: 700;
      }

      .skeleton {
        padding: 0.95rem 1rem;
        animation: pulse 1.2s infinite ease-in-out;
      }

      .skeleton-row {
        margin-bottom: 0.72rem;
      }

      .skeleton-pill,
      .skeleton-line {
        display: block;
        background: rgba(11, 26, 115, 0.08);
        border-radius: 999px;
      }

      .skeleton-pill {
        width: 72px;
        height: 22px;
      }

      .skeleton-line--title {
        width: 58%;
        height: 16px;
        margin-bottom: 0.68rem;
      }

      .skeleton-line--meta {
        width: 100%;
        height: 12px;
        margin-bottom: 0.45rem;
      }

      .skeleton-line--meta.short {
        width: 72%;
        margin-bottom: 0;
      }

      @keyframes pulse {
        50% {
          opacity: 0.6;
        }
      }
    `,
  ],
})
export class RecurringDonationsPage implements OnInit {
  recurringDonations: RecurringDonationItem[] = [];
  hasAnyRecurringHistory = false;
  loading = true;
  loadingMore = false;
  errorMessage = '';
  nextPageUrl: string | null = null;
  selectedFilter: RecurringFilter = 'active';
  readonly skeletonItems = [1, 2, 3];
  readonly cancellingIds = new Set<number>();

  constructor(
    private readonly authService: AuthService,
    private readonly donationsService: DonationsService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly appToast: AppToastService,
    private readonly sentryTelemetry: SentryTelemetryService,
    readonly localeService: LocaleService
  ) {}

  ngOnInit(): void {
    this.loadRecurringDonations();
  }

  setFilter(filter: RecurringFilter): void {
    if (this.selectedFilter === filter) {
      return;
    }

    this.selectedFilter = filter;
    this.loadRecurringDonations();
  }

  loadRecurringDonations(): void {
    this.sentryTelemetry.addFeatureBreadcrumb('donations', 'Recurring donations list load started', {
      filter: this.selectedFilter,
    });
    this.loading = true;
    this.errorMessage = '';
    this.recurringDonations = [];
    this.nextPageUrl = null;

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        if (!profile) {
          void this.router.navigate(['/login']);
          return;
        }

        this.fetchRecurringDonations();
      },
      error: () => {
        this.sentryTelemetry.addFeatureBreadcrumb(
          'donations',
          'Recurring donations list load failed',
          { filter: this.selectedFilter },
          'error'
        );
        void this.router.navigate(['/login']);
      },
    });
  }

  loadMore(): void {
    if (!this.nextPageUrl || this.loadingMore) {
      return;
    }

    this.loadingMore = true;
    this.fetchRecurringPage(this.nextPageUrl, true);
  }

  get emptyStateTitle(): string {
    if (!this.hasAnyRecurringHistory) {
      return this.localeService.translate('donations.recurringEmptyNoneTitle');
    }

    switch (this.selectedFilter) {
      case 'active':
        return this.localeService.translate('donations.recurringEmptyActiveTitle');
      case 'pending':
        return this.localeService.translate('donations.recurringEmptyPendingTitle');
      case 'cancelled':
        return this.localeService.translate('donations.recurringEmptyCancelledTitle');
      default:
        return this.localeService.translate('donations.recurringEmptyNoneTitle');
    }
  }

  get emptyStateMessage(): string {
    if (!this.hasAnyRecurringHistory) {
      return this.localeService.translate('donations.recurringEmptyNoneMessage');
    }

    switch (this.selectedFilter) {
      case 'active':
        return this.localeService.translate('donations.recurringEmptyActiveMessage');
      case 'pending':
        return this.localeService.translate('donations.recurringEmptyPendingMessage');
      case 'cancelled':
        return this.localeService.translate('donations.recurringEmptyCancelledMessage');
      default:
        return this.localeService.translate('donations.recurringEmptyFallbackMessage');
    }
  }

  get showStartMonthlyGivingButton(): boolean {
    return !this.hasAnyRecurringHistory;
  }

  get monthlySupportTotal(): string {
    const total = this.summaryMonthlyDonations.reduce((sum, donation) => sum + Number(donation.amount || 0), 0);
    return `${this.formatCurrencySymbol('eur')}${total.toFixed(2)}/month`;
  }

  get monthlySupportCountLabel(): string {
    const count = this.summaryMonthlyDonations.length;
    if (count === 0) {
      return this.localeService.translate('donations.recurringMonthlySupportCountNone');
    }

    return this.localeService.translate(
      count === 1 ? 'donations.recurringMonthlySupportCountOne' : 'donations.recurringMonthlySupportCountOther',
      { count }
    );
  }

  private fetchRecurringDonations(): void {
    this.fetchRecurringPage(null, false);
  }

  private fetchRecurringPage(nextPageUrl?: string | null, append = false): void {
    this.donationsService.getRecurringDonations(nextPageUrl, this.apiFilter).subscribe({
      next: (response) => {
        if (!append && this.selectedFilter !== 'cancelled') {
          this.hasAnyRecurringHistory = response.count > 0;
        }

        const visibleResults = response.results.filter((item) => this.matchesSelectedFilter(item));
        this.recurringDonations = append ? [...this.recurringDonations, ...visibleResults] : visibleResults;
        this.nextPageUrl = response.next;

        if (append) {
          if (visibleResults.length === 0 && response.next) {
            this.fetchRecurringPage(response.next, true);
            return;
          }

          this.loadingMore = false;
          return;
        }

        if (visibleResults.length === 0 && response.next) {
          this.fetchRecurringPage(response.next, false);
          return;
        }

        this.loading = false;
      },
      error: () => {
        if (append) {
          this.loadingMore = false;
          this.errorMessage = this.localeService.translate('donations.recurringLoadMoreError');
          return;
        }

        this.loading = false;
        this.errorMessage = this.localeService.translate('donations.historyConnectionError');
      },
    });
  }

  async confirmCancel(donation: RecurringDonationItem): Promise<void> {
    const isIncomplete = (donation.status || '').toLowerCase() === 'incomplete';
    const alert = await this.alertController.create({
      header: isIncomplete
        ? this.localeService.translate('donations.recurringCancelSetupTitle')
        : this.localeService.translate('donations.recurringCancelPromptTitle'),
      message: isIncomplete
        ? this.localeService.translate('donations.recurringCancelSetupMessage')
        : this.localeService.translate('donations.recurringCancelPromptMessage', {
            amount: this.formatAmountWithCurrency(donation),
            church: donation.church?.name || this.localeService.translate('donations.recurringChurchFallback'),
          }),
      buttons: [
        {
          text: isIncomplete
            ? this.localeService.translate('donations.recurringKeepSetup')
            : this.localeService.translate('donations.recurringKeepGiving'),
          role: 'cancel',
        },
        {
          text: isIncomplete
            ? this.localeService.translate('donations.recurringCancelSetupAction')
            : this.localeService.translate('donations.recurringCancelDonationAction'),
          role: 'destructive',
          handler: () => {
            void this.cancelDonation(donation);
          },
        },
      ],
    });

    await alert.present();
  }

  canCancel(donation: RecurringDonationItem): boolean {
    return (donation.status || '').toLowerCase() !== 'cancelled';
  }

  isCancelled(donation: RecurringDonationItem): boolean {
    return (donation.status || '').toLowerCase() === 'cancelled';
  }

  formatStatus(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return this.localeService.translate('donations.recurringStatusActive');
      case 'past_due':
        return this.localeService.translate('donations.recurringStatusPaymentIssue');
      case 'cancelled':
        return this.localeService.translate('donations.recurringStatusCancelled');
      case 'incomplete':
        return this.localeService.translate('donations.recurringStatusPendingSetup');
      default:
        return status ? status.replace(/_/g, ' ') : this.localeService.translate('donations.recurringStatusUnknown');
    }
  }

  statusHelperText(status: string): string | null {
    switch ((status || '').toLowerCase()) {
      case 'past_due':
        return this.localeService.translate('donations.recurringHelperPaymentIssue');
      case 'incomplete':
        return this.localeService.translate('donations.recurringHelperPendingSetup');
      default:
        return null;
    }
  }

  formatInterval(interval: string): string {
    switch ((interval || '').toLowerCase()) {
      case 'monthly':
        return this.localeService.translate('donations.recurringIntervalMonthly');
      case 'weekly':
        return this.localeService.translate('donations.recurringIntervalWeekly');
      default:
        return interval ? interval.replace(/_/g, ' ') : this.localeService.translate('donations.recurringIntervalNotSet');
    }
  }

  formatCategory(category: string): string {
    if (!category) {
      return this.localeService.translate('donations.recurringCategoryFallback');
    }

    return category.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  nextChargeText(donation: RecurringDonationItem): string | null {
    const status = (donation.status || '').toLowerCase();
    if (status === 'cancelled') {
      return null;
    }

    if (donation.next_payment_date) {
      return this.formatDate(donation.next_payment_date);
    }

    if (status === 'active') {
      return this.localeService.translate('donations.recurringNextChargeSoon');
    }

    if (status === 'incomplete') {
      return this.localeService.translate('donations.recurringNextChargeAfterSetup');
    }

    return this.localeService.translate('donations.recurringNextChargeSoon');
  }

  formatCancelledDate(donation: RecurringDonationItem): string {
    return this.formatDate(donation.cancelled_at || new Date().toISOString());
  }

  formatAmountWithCurrency(donation: RecurringDonationItem): string {
    return `${this.formatCurrencySymbol(donation.currency)}${Number(donation.amount).toFixed(2)}`;
  }

  statusClass(status: string): string {
    return `recurring-status--${(status || 'incomplete').toLowerCase()}`;
  }

  goToDonationFlow(): void {
    void this.router.navigate(['/branches']);
  }

  private async cancelDonation(donation: RecurringDonationItem): Promise<void> {
    if (this.cancellingIds.has(donation.id)) {
      return;
    }

    this.sentryTelemetry.addFeatureBreadcrumb('donations', 'Recurring donation cancel started', {
      recurring_donation_id: donation.id,
    });
    this.cancellingIds.add(donation.id);
    this.donationsService.cancelRecurringDonation(donation.id).subscribe({
      next: async (updatedDonation) => {
        this.recurringDonations = this.applyCurrentFilter(
          this.recurringDonations.map((item) => (item.id === updatedDonation.id ? updatedDonation : item))
        );
        this.cancellingIds.delete(donation.id);
        await this.appToast.success(this.localeService.translate('donations.recurringCancelledSuccess'));
      },
      error: async () => {
        this.cancellingIds.delete(donation.id);
        await this.appToast.error(this.localeService.translate('donations.recurringCancelError'));
      },
    });
  }

  private formatCurrencySymbol(currency?: string | null): string {
    switch ((currency || '').toLowerCase()) {
      case 'eur':
        return 'EUR ';
      case 'usd':
        return '$';
      case 'gbp':
        return 'GBP ';
      default:
        return currency ? `${currency.toUpperCase()} ` : '';
    }
  }

  private get apiFilter(): { status?: string } | undefined {
    if (this.selectedFilter === 'cancelled') {
      return { status: 'cancelled' };
    }

    return undefined;
  }

  private matchesSelectedFilter(donation: RecurringDonationItem): boolean {
    const status = (donation.status || '').toLowerCase();

    switch (this.selectedFilter) {
      case 'active':
        return status === 'active';
      case 'pending':
        return status === 'incomplete' || status === 'past_due';
      case 'cancelled':
        return status === 'cancelled';
      default:
        return true;
    }
  }

  private applyCurrentFilter(donations: RecurringDonationItem[]): RecurringDonationItem[] {
    return donations.filter((donation) => this.matchesSelectedFilter(donation));
  }

  private get summaryMonthlyDonations(): RecurringDonationItem[] {
    return this.recurringDonations.filter((donation) => {
      const status = (donation.status || '').toLowerCase();
      const interval = (donation.interval || '').toLowerCase();
      return interval === 'monthly' && status === 'active';
    });
  }
}
