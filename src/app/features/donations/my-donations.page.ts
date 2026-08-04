import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { AuthService } from '../../core/services/auth.service';
import { MemberRecentDonation } from '../../core/models/user.model';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-my-donations',
  template: `
    <ion-page>
      <ion-content fullscreen class="donations-content cop-content--secondary">
        <div class="donations-shell cop-secondary-shell">
          <header class="donations-header" [attr.aria-label]="'donations.historyTitle' | t">
            <app-mobile-header
              [title]="'donations.historyTitle' | t"
              [subtitle]="'donations.historySubtitle' | t"
              fallbackRoute="/tabs/profile"
              tone="editorial"
            ></app-mobile-header>
          </header>

          <div class="donations-surface">
            <div class="donations-surface__content">
            <div *ngIf="loading" class="skeleton-stack" aria-live="polite">
              <div class="donation-card skeleton" *ngFor="let item of skeletonItems">
                <div class="skeleton-row skeleton-row--amount">
                  <span class="skeleton-pill skeleton-pill--amount"></span>
                </div>
                <span class="skeleton-pill skeleton-pill--status"></span>
                <span class="skeleton-line skeleton-line--title"></span>
                <span class="skeleton-line skeleton-line--meta"></span>
                <span class="skeleton-line skeleton-line--meta short"></span>
              </div>
            </div>

            <div *ngIf="!loading && errorMessage" class="state-card error-state">
              <div class="state-copy">
                <h2>{{ 'donations.historyLoadErrorTitle' | t }}</h2>
                <p>{{ errorMessage }}</p>
              </div>
              <ion-button expand="block" class="state-button" (click)="loadInitialDonations()">{{ 'common.tryAgain' | t }}</ion-button>
            </div>

            <div *ngIf="!loading && !errorMessage && donations.length === 0" class="state-card empty-state">
              <div class="empty-state__icon" aria-hidden="true">Gift</div>
              <div class="state-copy">
                <h2>{{ 'donations.historyEmptyTitle' | t }}</h2>
                <p>{{ 'donations.historyEmptySubtitle' | t }}</p>
              </div>
              <ion-button expand="block" class="give-now-button" (click)="goToDonationFlow()">
                <ion-icon name="gift-outline" slot="start" aria-hidden="true"></ion-icon>
                <span>{{ 'donations.giveNow' | t }}</span>
              </ion-button>
            </div>

            <div *ngIf="!loading && !errorMessage && donations.length > 0" class="donations-stack">
              <article class="donation-card" *ngFor="let donation of donations">
                <div class="donation-card__action" tabindex="0" [attr.aria-label]="localeService.translate('donations.historyCardAria', { church: displayChurchName(donation) })">
                  <div class="donation-card__amount-block">
                    <p class="donation-amount">{{ formatAmount(donation.amount, donation.currency) }}</p>
                    <span class="donation-status" [class]="statusClass(donation.status)">{{ formatStatus(donation.status) }}</span>
                  </div>

                  <div class="donation-card__church">
                    <h2>{{ displayChurchName(donation) }}</h2>
                  </div>

                  <div class="donation-meta">
                    <div class="meta-row">
                      <span>{{ 'donations.historyTypeLabel' | t }}</span>
                      <strong>{{ formatDonationType(donation.category) }}</strong>
                    </div>
                    <div class="meta-row">
                      <span>{{ 'donations.historyDateLabel' | t }}</span>
                      <strong>{{ formatDate(donation.created_at) }}</strong>
                    </div>
                    <div class="meta-row">
                      <span>{{ 'donations.historyReferenceLabel' | t }}</span>
                      <strong class="meta-row__reference">{{ donation.transaction_reference || ('donations.historyReferencePending' | t) }}</strong>
                    </div>
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
                <span>{{ loadingMore ? ('donations.loadingMore' | t) : ('donations.loadMore' | t) }}</span>
              </ion-button>

              <ion-button expand="block" class="give-now-button give-now-button--footer" (click)="goToDonationFlow()">
                <ion-icon name="gift-outline" slot="start" aria-hidden="true"></ion-icon>
                <span>{{ 'donations.giveNow' | t }}</span>
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

      .donations-content {
        --background: var(--cop-color-background-soft);
      }

      .donations-shell {
        gap: 0.95rem;
      }

      .donations-surface {
        width: 100%;
        max-width: 32rem;
        margin: 0 auto;
      }

      .donations-surface__content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: calc(1.1rem + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)));
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
        border-radius: 16px;
        border: 1px solid rgba(8, 31, 92, 0.08);
        box-shadow: 0 10px 22px rgba(7, 24, 69, 0.06);
      }

      .donation-card__action {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        width: 100%;
        padding: 0.95rem 1rem;
        color: inherit;
        outline: none;
      }

      .donation-card__action:focus-visible {
        box-shadow: inset 0 0 0 2px rgba(11, 29, 115, 0.18);
        border-radius: 16px;
      }

      .donation-card__amount-block {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.4rem;
      }

      .donation-amount {
        margin: 0;
        color: #081f5c;
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1.05;
        letter-spacing: -0.02em;
      }

      .donation-card__church h2 {
        margin: 0;
        color: #03173f;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.3;
        text-transform: none;
      }

      .donation-status {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        align-self: flex-start;
        padding: 0.16rem 0;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        background: transparent;
        color: rgba(8, 31, 92, 0.72);
      }

      .donation-status::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.9;
      }

      .donation-status--paid {
        color: #217447;
      }

      .donation-status--pending {
        color: #9a6d06;
      }

      .donation-status--failed,
      .donation-status--cancelled {
        color: #b02f3b;
      }

      .donation-meta {
        display: flex;
        flex-direction: column;
        gap: 0.68rem;
        margin-top: 0.1rem;
        padding-top: 0.82rem;
        border-top: 1px solid rgba(3, 23, 63, 0.08);
      }

      .meta-row {
        display: flex;
        flex-direction: column;
        gap: 0.14rem;
        align-items: flex-start;
      }

      .meta-row span {
        color: rgba(3, 23, 63, 0.58);
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .meta-row strong {
        color: #03173f;
        font-size: 0.92rem;
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      .meta-row__reference {
        user-select: text;
        -webkit-user-select: text;
      }

      .state-card {
        padding: 1.15rem 1rem;
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

      .empty-state__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 58px;
        min-height: 58px;
        padding: 0 0.75rem;
        border-radius: 999px;
        background: rgba(245, 182, 40, 0.12);
        color: #9a6d06;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
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
        gap: 0.8rem;
        margin-bottom: 0.65rem;
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
        width: 92px;
        height: 12px;
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

      @media (max-width: 430px) {
        .donation-card__action {
          padding: 0.92rem 0.92rem 0.95rem;
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

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    readonly localeService: LocaleService
  ) {}

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
        this.errorMessage = this.localeService.translate('donations.historyLoadMoreError');
      },
    });
  }

  formatStatus(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'checkout_created':
      case 'pending':
        return this.localeService.translate('donations.historyStatusPending');
      case 'paid':
        return this.localeService.translate('donations.historyStatusCompleted');
      case 'failed':
        return this.localeService.translate('donations.historyStatusFailed');
      case 'cancelled':
        return this.localeService.translate('donations.historyStatusCancelled');
      default:
        return status ? status.replace(/_/g, ' ') : this.localeService.translate('donations.historyStatusPending');
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

  formatAmount(amount: string, currency: string): string {
    const numericAmount = Number(amount);
    const normalizedCurrency = (currency || 'EUR').toUpperCase();
    if (Number.isFinite(numericAmount)) {
      return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: normalizedCurrency,
      }).format(numericAmount);
    }

    return `${amount} ${normalizedCurrency}`;
  }

  formatDonationType(category: string): string {
    const normalized = `${category || ''}`.trim();
    if (!normalized) {
      return this.localeService.translate('donations.historyTypeFallback');
    }

    return normalized
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  displayChurchName(donation: MemberRecentDonation): string {
    const rawName = donation.church?.name?.trim();
    if (!rawName) {
      return this.localeService.translate('donations.historyChurchFallback');
    }

    const normalized = rawName.toLowerCase();
    return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  goToDonationFlow(): void {
    void this.router.navigate(['/branches']);
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
        this.errorMessage = this.localeService.translate('donations.historyConnectionError');
      },
    });
  }
}
