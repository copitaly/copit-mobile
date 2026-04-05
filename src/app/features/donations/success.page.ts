import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DonationFlowStateService, DonationCheckoutSummary } from '../../core/services/donation-flow-state.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate-success',
  template: `
    <ion-page>
      <ion-content fullscreen class="success-content">
        <div class="success-hero">
          <h1>Thank you</h1>
          <p>Your donation was successful</p>
        </div>

        <div class="success-card">
          <ion-icon name="checkmark-circle" class="success-icon" aria-hidden="true"></ion-icon>
          <h2>Your gift has been received</h2>
          <p>We appreciate your support for the local church.</p>
        </div>

        <div class="summary-card" *ngIf="summary; else noSummary">
          <div class="detail">
            <span>Branch</span>
            <strong>{{ summary.branchName ?? 'Details unavailable' }}</strong>
          </div>
          <div class="detail" *ngIf="summary.category">
            <span>Category</span>
            <strong>{{ summary.category }}</strong>
          </div>
          <div class="detail" *ngIf="summary.amount !== undefined">
            <span>Amount</span>
            <strong>{{ formatAmount(summary.amount) }}</strong>
          </div>
          <div class="detail" *ngIf="summary.donorEmail">
            <span>Email</span>
            <strong>{{ summary.donorEmail }}</strong>
          </div>
          <div class="detail" *ngIf="summary.transactionReference">
            <span>Reference</span>
            <strong>{{ summary.transactionReference }}</strong>
          </div>
        </div>

        <ng-template #noSummary>
          <div class="summary-card">
            <p class="muted">
              We couldn't display the donation details right now, but your gift has been processed.
            </p>
          </div>
        </ng-template>

        <div class="actions">
          <ion-button expand="block" class="cta" (click)="goToBranches()">Give again</ion-button>
          <ion-button expand="block" fill="outline" (click)="goHome()">Back home</ion-button>
        </div>

        <p class="footer-note">A confirmation email has been sent if provided.</p>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
        --ion-background-color: #0b1d73;
      }

      .success-content {
        --background: #0b1d73;
        background: #0b1d73;
        color: #fff;
        padding-bottom: 2rem;
      }

      .success-hero {
        padding: 1.2rem 1.25rem 1rem;
        background: linear-gradient(180deg, #081b61, #0b1d73 75%);
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        box-shadow: 0 12px 30px rgba(2, 18, 54, 0.4);
      }

      .success-hero h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 600;
      }

      .success-hero p {
        margin: 0;
        font-size: 0.95rem;
        opacity: 0.9;
      }

      .success-card,
      .summary-card {
        background: #f5f6fa;
        border-radius: 20px;
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.25);
        margin: -1.5rem auto 1.25rem;
        padding: 1.5rem;
        max-width: 520px;
        color: #0b1d73;
      }

      .success-card {
        text-align: center;
      }

      .success-icon {
        font-size: 3rem;
        color: #0b703f;
        margin-bottom: 0.75rem;
      }

      .success-card h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .success-card p {
        margin: 0.25rem 0 0;
        font-size: 0.95rem;
        color: #475467;
      }

      .detail {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid #e2e8f0;
        padding: 0.6rem 0;
        font-size: 0.95rem;
        color: #475467;
      }

      .detail strong {
        color: #0b1a36;
      }

      .detail:last-child {
        border-bottom: none;
      }

      .muted {
        margin: 0;
        color: #475467;
        font-size: 0.95rem;
        text-align: center;
      }

      .actions {
        max-width: 520px;
        margin: 0.5rem auto;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .actions ion-button {
        border-radius: 999px;
        height: 52px;
        font-weight: 600;
      }

      .actions .cta {
        --background: #d9a30a;
        --color: #011b2d;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
      }

      .actions ion-button[fill='outline'] {
        --border-color: #0f2a59;
        --color: #0f2a59;
      }

      .footer-note {
        margin: 1rem auto 0;
        max-width: 520px;
        text-align: center;
        color: #cbd5f5;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class DonateSuccessPage implements OnInit, OnDestroy {
  summary: DonationCheckoutSummary | null = null;
  private sub?: Subscription;

  constructor(
    private readonly donationFlowState: DonationFlowStateService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const stored = this.donationFlowState.getStoredSummary();
    if (stored) {
      this.summary = stored;
      this.donationFlowState.clear();
    } else {
      this.sub = this.donationFlowState.summary$.subscribe(summary => {
        this.summary = summary;
        if (summary) {
          this.donationFlowState.clear();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  formatAmount(amount: number): string {
    return `€${amount.toFixed(2)}`;
  }
}
