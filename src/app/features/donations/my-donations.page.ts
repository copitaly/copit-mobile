import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { MemberRecentDonation } from '../../core/models/user.model';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-my-donations',
  template: `
    <ion-page>
      <ion-content fullscreen class="donations-content">
        <div class="donations-hero app-header app-header--inner">
          <div class="app-header__inner">
            <button class="donations-back app-header__back" type="button" aria-label="Back" (click)="goBack()">
              <ion-icon class="app-back-icon" name="arrow-back" aria-hidden="true"></ion-icon>
            </button>
            <div class="app-header__copy donations-hero__copy">
              <h1 class="app-header__title">My Donations</h1>
            </div>
          </div>
        </div>

        <div class="surface donations-surface">
          <div class="surface__content donations-surface__content">
            <div *ngIf="loading" class="skeleton-stack" aria-live="polite">
              <div class="donation-card skeleton" *ngFor="let item of skeletonItems">
                <div class="skeleton-row skeleton-row--top">
                  <span class="skeleton-pill skeleton-pill--amount"></span>
                  <span class="skeleton-pill skeleton-pill--status"></span>
                </div>
                <span class="skeleton-line skeleton-line--title"></span>
                <span class="skeleton-line skeleton-line--meta"></span>
                <span class="skeleton-line skeleton-line--meta short"></span>
              </div>
            </div>

            <div *ngIf="!loading && errorMessage" class="state-card error-state">
              <div class="state-copy">
                <h2>We couldn't load your donations</h2>
                <p>{{ errorMessage }}</p>
              </div>
              <ion-button expand="block" class="state-button" (click)="loadInitialDonations()">Try again</ion-button>
            </div>

            <div *ngIf="!loading && !errorMessage && donations.length === 0" class="state-card empty-state">
              <div class="state-copy">
                <h2>No donations yet</h2>
                <p>Start giving to support your church</p>
              </div>
              <ion-button expand="block" class="give-now-button" (click)="goToDonationFlow()">
                <ion-icon name="gift-outline" slot="start" aria-hidden="true"></ion-icon>
                <span>Give now</span>
              </ion-button>
            </div>

            <div *ngIf="!loading && !errorMessage && donations.length > 0" class="donations-stack">
              <article class="donation-card" *ngFor="let donation of donations">
                <div class="donation-card__top">
                  <div>
                    <p class="donation-amount">{{ donation.amount }} {{ donation.currency | uppercase }}</p>
                    <h2>{{ donation.church?.name || 'Church donation' }}</h2>
                  </div>
                  <span class="donation-status" [class]="statusClass(donation.status)">{{ formatStatus(donation.status) }}</span>
                </div>

                <div class="donation-meta">
                  <div class="meta-row">
                    <span>Category</span>
                    <strong>{{ donation.category || 'General' }}</strong>
                  </div>
                  <div class="meta-row">
                    <span>Date</span>
                    <strong>{{ formatDate(donation.created_at) }}</strong>
                  </div>
                  <div class="meta-row">
                    <span>Reference</span>
                    <strong>{{ donation.transaction_reference || 'Pending' }}</strong>
                  </div>
                </div>
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

              <ion-button expand="block" class="give-now-button give-now-button--footer" (click)="goToDonationFlow()">
                <ion-icon name="gift-outline" slot="start" aria-hidden="true"></ion-icon>
                <span>Give now</span>
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

      ion-content.donations-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        --background: #0b1d73;
      }

      ion-content.donations-content::part(scroll) {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 100%;
      }

      .donations-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .donations-hero {
        width: 100%;
        padding-bottom: 2rem;
      }

      .donations-back {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(6px);
        justify-content: center;
        padding: 0;
        min-height: 40px;
      }

      .donations-back ion-icon {
        font-size: 1.1rem;
      }

      .donations-hero__copy {
        text-align: center;
        align-items: center;
      }

      .donations-surface {
        margin-top: -0.08rem;
        padding-top: 1.25rem;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -6px 22px rgba(2, 18, 54, 0.08);
      }

      .donations-surface__content {
        width: 100%;
        max-width: 440px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: calc(1.2rem + env(safe-area-inset-bottom));
      }

      .donations-stack,
      .skeleton-stack {
        display: flex;
        flex-direction: column;
        gap: 0.95rem;
      }

      .donation-card,
      .state-card {
        background: #ffffff;
        border-radius: 22px;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1);
      }

      .donation-card {
        padding: 0.95rem 1.05rem;
      }

      .donation-card__top {
        display: flex;
        justify-content: space-between;
        gap: 0.9rem;
      }

      .donation-amount {
        margin: 0 0 0.3rem;
        color: #b98710;
        font-size: 1.04rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .donation-card h2 {
        margin: 0;
        color: #03173f;
        font-size: 1.05rem;
        font-weight: 700;
        line-height: 1.25;
      }

      .donation-status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        align-self: flex-start;
        min-width: 72px;
        padding: 0.35rem 0.65rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: #eef2fd;
        color: #425ea6;
      }

      .donation-status--paid {
        background: rgba(45, 166, 95, 0.12);
        color: #217447;
      }

      .donation-status--pending {
        background: rgba(245, 182, 40, 0.16);
        color: #9a6d06;
      }

      .donation-status--failed,
      .donation-status--cancelled {
        background: rgba(220, 53, 69, 0.12);
        color: #b02f3b;
      }

      .donation-meta {
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

      .state-button,
      .load-more-button {
        --background: #0b1d73;
        --background-hover: #0b1d73;
        --background-activated: #09175c;
        --border-radius: 16px;
        --box-shadow: 0 12px 22px rgba(11, 29, 115, 0.2);
        font-weight: 600;
      }

      .load-more-button {
        --background: transparent;
        --color: #0b1d73;
        --border-color: rgba(11, 29, 115, 0.14);
        --box-shadow: none;
        margin-top: 0.15rem;
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

      .give-now-button--footer {
        margin-top: 0.55rem;
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

      .skeleton-pill--amount {
        width: 120px;
        height: 14px;
      }

      .skeleton-pill--status {
        width: 74px;
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

      @media (max-height: 760px) {
        .donations-hero {
          padding-bottom: 1.8rem;
        }

        .donations-surface {
          padding-top: 1.1rem;
        }
      }
    `,
  ],
})
export class MyDonationsPage implements OnInit {
  donations: MemberRecentDonation[] = [];
  loading = true;
  loadingMore = false;
  errorMessage = '';
  nextPageUrl: string | null = null;
  readonly skeletonItems = [1, 2, 3];

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  ngOnInit(): void {
    this.loadInitialDonations();
  }

  loadInitialDonations(): void {
    this.loading = true;
    this.errorMessage = '';
    this.donations = [];
    this.nextPageUrl = null;

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        if (!profile) {
          void this.router.navigate(['/login']);
          return;
        }

        this.fetchDonations();
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
    this.authService.getMemberDonations(this.nextPageUrl).subscribe({
      next: (response) => {
        this.donations = [...this.donations, ...response.results];
        this.nextPageUrl = response.next;
        this.loadingMore = false;
      },
      error: () => {
        this.loadingMore = false;
        this.errorMessage = 'Unable to load more donations right now. Please try again.';
      },
    });
  }

  formatStatus(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'checkout_created':
      case 'pending':
        return 'Pending';
      case 'paid':
        return 'Completed';
      case 'failed':
      case 'cancelled':
        return 'Failed';
      default:
        return status ? status.replace(/_/g, ' ') : 'Pending';
    }
  }

  statusClass(status: string): string {
    return `donation-status--${(status || 'pending').toLowerCase()}`;
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

  goToDonationFlow(): void {
    void this.router.navigate(['/branches']);
  }

  goBack(): void {
    void this.router.navigate(['/profile']);
  }

  private fetchDonations(): void {
    this.authService.getMemberDonations().subscribe({
      next: (response) => {
        this.donations = response.results;
        this.nextPageUrl = response.next;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Please check your connection and try again.';
      },
    });
  }
}
