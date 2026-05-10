import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';

import { RecurringDonationItem } from '../../core/models/donation.model';
import { DonationsService } from '../../core/services/donations.service';
import { AuthService } from '../../core/services/auth.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

type RecurringFilter = 'active' | 'pending' | 'cancelled' | 'all';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-recurring-donations',
  template: `
    <ion-page>
      <ion-content fullscreen class="recurring-content">
        <div class="recurring-hero app-header app-header--inner">
          <app-mobile-header title="Recurring Donations" fallbackRoute="/profile"></app-mobile-header>
        </div>

        <div class="surface recurring-surface">
          <div class="surface__content recurring-surface__content">
            <div *ngIf="!loading && !errorMessage" class="summary-card">
              <p class="summary-card__eyebrow">Monthly support</p>
              <h2>{{ monthlySupportTotal }}</h2>
              <p class="summary-card__meta">{{ monthlySupportCountLabel }}</p>
            </div>

            <div class="filter-group" *ngIf="!loading && !errorMessage">
              <button
                type="button"
                class="filter-chip"
                [class.selected]="selectedFilter === 'active'"
                (click)="setFilter('active')"
              >
                Active
              </button>
              <button
                type="button"
                class="filter-chip"
                [class.selected]="selectedFilter === 'pending'"
                (click)="setFilter('pending')"
              >
                Pending
              </button>
              <button
                type="button"
                class="filter-chip"
                [class.selected]="selectedFilter === 'cancelled'"
                (click)="setFilter('cancelled')"
              >
                Cancelled
              </button>
              <button
                type="button"
                class="filter-chip"
                [class.selected]="selectedFilter === 'all'"
                (click)="setFilter('all')"
              >
                All
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
                <h2>We couldn't load recurring donations</h2>
                <p>{{ errorMessage }}</p>
              </div>
              <ion-button expand="block" class="state-button" (click)="loadRecurringDonations()">Try again</ion-button>
            </div>

            <div *ngIf="!loading && !errorMessage && recurringDonations.length === 0" class="state-card empty-state">
              <div class="state-copy">
                <h2>{{ emptyStateTitle }}</h2>
                <p>{{ emptyStateMessage }}</p>
              </div>
              <ion-button
                *ngIf="showGiveNowButton"
                expand="block"
                class="give-now-button"
                (click)="goToDonationFlow()"
              >
                <ion-icon name="gift-outline" slot="start" aria-hidden="true"></ion-icon>
                <span>Give now</span>
              </ion-button>
            </div>

            <div *ngIf="!loading && !errorMessage && recurringDonations.length > 0" class="recurring-stack">
              <article class="recurring-card" *ngFor="let donation of recurringDonations">
                <div class="recurring-card__top">
                  <div>
                    <p class="recurring-amount">{{ donation.amount }} {{ donation.currency | uppercase }}</p>
                    <h2>{{ donation.church?.name || 'Church donation' }}</h2>
                  </div>
                  <span class="recurring-status" [class]="statusClass(donation.status)">
                    {{ formatStatus(donation.status) }}
                  </span>
                </div>

                <div class="recurring-meta">
                  <div class="meta-row">
                    <span>Category</span>
                    <strong>{{ formatCategory(donation.category) }}</strong>
                  </div>
                  <div class="meta-row">
                    <span>Interval</span>
                    <strong>{{ formatInterval(donation.interval) }}</strong>
                  </div>
                  <div class="meta-row" *ngIf="nextChargeText(donation) as nextCharge">
                    <span>Next charge</span>
                    <strong>{{ nextCharge }}</strong>
                  </div>
                  <div class="meta-row" *ngIf="donation.last_payment_date">
                    <span>Last payment</span>
                    <strong>{{ formatDate(donation.last_payment_date) }}</strong>
                  </div>
                  <div class="meta-row" *ngIf="isCancelled(donation)">
                    <span>Ended on</span>
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
                  <span>{{ cancellingIds.has(donation.id) ? 'Cancelling...' : 'Cancel monthly donation' }}</span>
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
                <span>{{ loadingMore ? 'Loading more...' : 'Load more' }}</span>
              </ion-button>
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
    `,
  ],
})
export class RecurringDonationsPage implements OnInit {
  recurringDonations: RecurringDonationItem[] = [];
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
    private readonly toastController: ToastController
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
    switch (this.selectedFilter) {
      case 'active':
        return 'No active monthly donations';
      case 'pending':
        return 'No pending monthly donations';
      case 'cancelled':
        return 'No cancelled monthly donations';
      default:
        return 'No recurring donations yet';
    }
  }

  get emptyStateMessage(): string {
    switch (this.selectedFilter) {
      case 'active':
        return 'Your active monthly gifts will appear here.';
      case 'pending':
        return 'Pending monthly donations will appear here.';
      case 'cancelled':
        return 'Cancelled monthly donations will appear here.';
      default:
        return 'Start a monthly gift to support your local church.';
    }
  }

  get showGiveNowButton(): boolean {
    return this.selectedFilter !== 'cancelled';
  }

  get monthlySupportTotal(): string {
    const total = this.summaryMonthlyDonations.reduce((sum, donation) => sum + Number(donation.amount || 0), 0);
    return `${this.formatCurrencySymbol('eur')}${total.toFixed(2)}/month`;
  }

  get monthlySupportCountLabel(): string {
    const count = this.summaryMonthlyDonations.length;
    return count > 0 ? `${count} active monthly donation${count === 1 ? '' : 's'}` : 'No active monthly donations';
  }

  private fetchRecurringDonations(): void {
    this.fetchRecurringPage(null, false);
  }

  private fetchRecurringPage(nextPageUrl?: string | null, append = false): void {
    this.donationsService.getRecurringDonations(nextPageUrl, this.apiFilter).subscribe({
      next: (response) => {
        const visibleResults = response.results.filter((item) => this.matchesSelectedFilter(item));
        this.recurringDonations = append
          ? [...this.recurringDonations, ...visibleResults]
          : visibleResults;
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
          this.errorMessage = 'Unable to load more recurring donations right now. Please try again.';
          return;
        }

        this.loading = false;
        this.errorMessage = 'Please check your connection and try again.';
      },
    });
  }

  async confirmCancel(donation: RecurringDonationItem): Promise<void> {
    const isIncomplete = (donation.status || '').toLowerCase() === 'incomplete';
    const alert = await this.alertController.create({
      header: isIncomplete ? 'Cancel monthly setup?' : 'Cancel monthly donation?',
      message: isIncomplete
        ? 'This monthly donation setup will be cancelled before it starts.'
        : `You will stop giving ${this.formatAmountWithCurrency(donation)} every month to ${
            donation.church?.name || 'this church'
          }. You can restart anytime.`,
      buttons: [
        {
          text: isIncomplete ? 'Keep setup' : 'Keep giving',
          role: 'cancel',
        },
        {
          text: isIncomplete ? 'Cancel setup' : 'Cancel donation',
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
        return 'Active';
      case 'past_due':
        return 'Payment issue';
      case 'cancelled':
        return 'Cancelled';
      case 'incomplete':
        return 'Pending setup';
      default:
        return status ? status.replace(/_/g, ' ') : 'Unknown';
    }
  }

  statusHelperText(status: string): string | null {
    switch ((status || '').toLowerCase()) {
      case 'past_due':
        return 'Payment issue. We’ll retry automatically.';
      case 'incomplete':
        return 'Your monthly donation is still being set up.';
      default:
        return null;
    }
  }

  formatInterval(interval: string): string {
    switch ((interval || '').toLowerCase()) {
      case 'monthly':
        return 'Monthly';
      case 'weekly':
        return 'Weekly';
      default:
        return interval ? interval.replace(/_/g, ' ') : 'Not set';
    }
  }

  formatCategory(category: string): string {
    if (!category) {
      return 'General';
    }

    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
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
      return 'Scheduled soon';
    }

    if (status === 'incomplete') {
      return 'After setup completes';
    }

    return 'Scheduled soon';
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

    this.cancellingIds.add(donation.id);
    this.donationsService.cancelRecurringDonation(donation.id).subscribe({
      next: async (updatedDonation) => {
        this.recurringDonations = this.applyCurrentFilter(
          this.recurringDonations.map((item) => (item.id === updatedDonation.id ? updatedDonation : item))
        );
        this.cancellingIds.delete(donation.id);
        const toast = await this.toastController.create({
          message: 'Monthly donation cancelled',
          duration: 2500,
          color: 'success',
          position: 'bottom',
        });
        await toast.present();
      },
      error: async () => {
        this.cancellingIds.delete(donation.id);
        const toast = await this.toastController.create({
          message: 'Unable to cancel the recurring donation right now. Please try again.',
          duration: 3000,
          color: 'danger',
          position: 'bottom',
        });
        await toast.present();
      },
    });
  }

  private formatCurrencySymbol(currency?: string | null): string {
    switch ((currency || '').toLowerCase()) {
      case 'eur':
        return '€';
      case 'usd':
        return '$';
      case 'gbp':
        return '£';
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
