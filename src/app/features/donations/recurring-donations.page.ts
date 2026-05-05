import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';

import { RecurringDonationItem } from '../../core/models/donation.model';
import { DonationsService } from '../../core/services/donations.service';
import { AuthService } from '../../core/services/auth.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

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
                <h2>No recurring donations yet</h2>
                <p>Start a monthly gift to support your local church.</p>
              </div>
              <ion-button expand="block" class="give-now-button" (click)="goToDonationFlow()">
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
                  <div class="meta-row">
                    <span>Next payment</span>
                    <strong>{{ donation.next_payment_date ? formatDate(donation.next_payment_date) : 'Not scheduled' }}</strong>
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

      ion-page {
        background: #0b1d73;
      }

      ion-content.recurring-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        --background: #0b1d73;
      }

      ion-content.recurring-content::part(scroll) {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 100%;
      }

      .recurring-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .recurring-hero {
        width: 100%;
        padding-bottom: 2rem;
      }

      .recurring-surface {
        margin-top: -0.08rem;
        padding-top: 1.25rem;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -6px 22px rgba(2, 18, 54, 0.08);
      }

      .recurring-surface__content {
        width: 100%;
        max-width: 440px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: calc(1.2rem + env(safe-area-inset-bottom));
      }

      .recurring-stack,
      .skeleton-stack {
        display: flex;
        flex-direction: column;
        gap: 0.95rem;
      }

      .recurring-card,
      .state-card {
        background: #ffffff;
        border-radius: 22px;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1);
      }

      .recurring-card {
        padding: 0.95rem 1.05rem;
      }

      .recurring-card__top {
        display: flex;
        justify-content: space-between;
        gap: 0.9rem;
      }

      .recurring-amount {
        margin: 0 0 0.3rem;
        color: #b98710;
        font-size: 1.04rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .recurring-card h2 {
        margin: 0;
        color: #03173f;
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1.25;
      }

      .recurring-status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        align-self: flex-start;
        min-width: 86px;
        padding: 0.35rem 0.65rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: #eef2fd;
        color: #425ea6;
      }

      .recurring-status--active {
        background: rgba(45, 166, 95, 0.12);
        color: #217447;
      }

      .recurring-status--past_due {
        background: rgba(245, 182, 40, 0.16);
        color: #9a6d06;
      }

      .recurring-status--incomplete {
        background: rgba(66, 94, 166, 0.12);
        color: #425ea6;
      }

      .recurring-status--cancelled {
        background: rgba(107, 114, 128, 0.14);
        color: #5b6473;
      }

      .recurring-meta {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        margin-top: 0.8rem;
        padding-top: 0.8rem;
        border-top: 1px solid rgba(3, 23, 63, 0.08);
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: baseline;
      }

      .meta-row span {
        color: rgba(3, 23, 63, 0.58);
        font-size: 0.82rem;
      }

      .meta-row strong {
        color: #03173f;
        font-size: 0.92rem;
        font-weight: 600;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .status-helper {
        margin: 0.8rem 0 0;
        padding: 0.75rem 0.9rem;
        border-radius: 14px;
        background: #f5f7fb;
        color: #475467;
        font-size: 0.88rem;
        line-height: 1.45;
      }

      .cancel-button,
      .load-more-button,
      .state-button {
        --background: transparent;
        --color: #0b1d73;
        --border-color: rgba(11, 29, 115, 0.14);
        --border-radius: 16px;
        --box-shadow: none;
        margin-top: 0.9rem;
        font-weight: 600;
      }

      .cancel-button {
        --color: #b02f3b;
        --border-color: rgba(176, 47, 59, 0.18);
      }

      .state-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.8rem;
      }

      .state-copy {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      .state-copy h2,
      .state-copy p {
        margin: 0;
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

      .state-button {
        --background: #0b1d73;
        --background-hover: #0b1d73;
        --background-activated: #09175c;
        --border-radius: 16px;
        --box-shadow: 0 12px 22px rgba(11, 29, 115, 0.2);
        --color: #ffffff;
      }

      .give-now-button {
        --background: #f5b628;
        --background-hover: #f5b628;
        --background-activated: #d79d1f;
        --border-radius: 999px;
        --box-shadow: 0 10px 22px rgba(245, 182, 40, 0.24);
        --color: #0b1d73;
        min-height: 52px;
        font-weight: 700;
      }

      .skeleton {
        animation: pulse 1.2s infinite ease-in-out;
      }

      .skeleton-row {
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        margin-bottom: 0.85rem;
      }

      .skeleton-pill,
      .skeleton-line {
        display: block;
        background: rgba(11, 26, 115, 0.08);
        border-radius: 999px;
      }

      .skeleton-pill {
        width: 86px;
        height: 22px;
      }

      .skeleton-line--title {
        width: 62%;
        height: 16px;
        margin-bottom: 0.7rem;
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
        0% {
          opacity: 1;
        }
        50% {
          opacity: 0.6;
        }
        100% {
          opacity: 1;
        }
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
    this.donationsService.getRecurringDonations(this.nextPageUrl).subscribe({
      next: (response) => {
        this.recurringDonations = [...this.recurringDonations, ...response.results];
        this.nextPageUrl = response.next;
        this.loadingMore = false;
      },
      error: () => {
        this.loadingMore = false;
        this.errorMessage = 'Unable to load more recurring donations right now. Please try again.';
      },
    });
  }

  async confirmCancel(donation: RecurringDonationItem): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cancel monthly donation?',
      message: `You will stop giving ${this.formatAmountWithCurrency(donation)} every month to ${
        donation.church?.name || 'this church'
      }. You can restart anytime.`,
      buttons: [
        {
          text: 'Keep giving',
          role: 'cancel',
        },
        {
          text: 'Cancel donation',
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
    return (donation.status || '').toLowerCase() === 'active';
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

  private fetchRecurringDonations(): void {
    this.donationsService.getRecurringDonations().subscribe({
      next: (response) => {
        this.recurringDonations = response.results;
        this.nextPageUrl = response.next;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Please check your connection and try again.';
      },
    });
  }

  private async cancelDonation(donation: RecurringDonationItem): Promise<void> {
    if (this.cancellingIds.has(donation.id)) {
      return;
    }

    this.cancellingIds.add(donation.id);
    this.donationsService.cancelRecurringDonation(donation.id).subscribe({
      next: async (updatedDonation) => {
        this.recurringDonations = this.recurringDonations.map((item) =>
          item.id === updatedDonation.id ? updatedDonation : item
        );
        this.cancellingIds.delete(donation.id);
        const toast = await this.toastController.create({
          message: 'Recurring donation cancelled successfully.',
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
}
