import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DonationFlowStateService, DonationCheckoutSummary } from '../../core/services/donation-flow-state.service';
import { ApiService } from '../../core/services/api.service';

interface VerifyCheckoutSessionResponse {
  verified: boolean;
  payment_status?: string;
  transaction_reference?: string;
  amount?: string;
  currency?: string;
  category?: string;
  donor_email?: string;
  church?: {
    id?: number;
    name?: string;
  };
}

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate-success',
  template: `
    <ion-page>
      <ion-content fullscreen class="success-content">
        <div class="success-hero">
          <ion-icon name="checkmark-circle" class="success-icon" aria-hidden="true"></ion-icon>
          <h1>Thank you</h1>
          <p class="hero-subtitle">Your gift has been received</p>
        </div>

        <div class="success-body">
          <p class="primary-copy">We appreciate your generous support for the local church.</p>
          <p class="fallback-note" *ngIf="!summary">
            We couldn't display the donation details right now, but your gift has been processed.
          </p>

          <div class="summary-card" *ngIf="summary">
            <p class="summary-label" *ngIf="summary.branchName">Branch</p>
            <p class="summary-value" *ngIf="summary.branchName">{{ summary.branchName }}</p>
            <p class="summary-label" *ngIf="summary.category">Category</p>
            <p class="summary-value" *ngIf="summary.category">{{ summary.category }}</p>
            <p class="summary-label" *ngIf="summary.amount !== undefined">Amount</p>
            <p class="summary-value" *ngIf="summary.amount !== undefined">{{ formatAmount(summary.amount) }}</p>
            <p class="summary-label" *ngIf="summary.transactionReference">Reference</p>
            <p class="summary-value" *ngIf="summary.transactionReference">{{ summary.transactionReference }}</p>
          </div>

          <p class="confirmation-note">
            A confirmation email has been sent if provided.
          </p>

          <div class="actions">
            <ion-button expand="block" class="cta" (click)="goToBranches()">Give again</ion-button>
            <ion-button expand="block" fill="outline" class="secondary" (click)="goHome()">Back home</ion-button>
          </div>
        </div>
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
        min-height: 100vh;
        height: 100vh;
        display: flex;
        flex-direction: column;
        --padding-bottom: 0;
      }

      ion-content.success-content::part(scroll) {
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }

      .success-hero {
        padding: 1.9rem 1.5rem 1rem;
        background: linear-gradient(180deg, #071f63, #0b1d73 90%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
      }

      .success-icon {
        font-size: 3.5rem;
        color: #0b703f;
        padding: 0.5rem;
        border-radius: 50%;
        background: rgba(19, 128, 75, 0.15);
        box-shadow: 0 0 12px rgba(5, 70, 33, 0.25);
      }

      .success-hero h1 {
        margin: 0;
        font-size: 1.85rem;
        font-weight: 600;
        color: #fff;
      }

      .hero-subtitle {
        margin: 0;
        font-size: 1rem;
        opacity: 0.88;
        color: #fff;
      }

      .success-body {
        flex: 1 1 auto;
        min-height: 0;
        background: #f5f6fa;
        padding: 2rem 1.5rem 0.8rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        justify-content: flex-start;
      }

      .primary-copy {
        margin: 0;
        font-size: 1rem;
        color: #0b1a36;
        line-height: 1.5;
        text-align: center;
      }

      .fallback-note {
        max-width: 520px;
        margin: 0;
        font-size: 0.85rem;
        color: rgba(11, 26, 54, 0.7);
        text-align: center;
        line-height: 1.4;
        font-weight: 400;
      }

      .summary-card {
        width: 100%;
        max-width: 520px;
        background: #fff;
        border-radius: 18px;
        padding: 1.25rem 1.5rem;
        box-shadow: 0 6px 16px rgba(11, 26, 54, 0.08);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 1rem;
      }

      .summary-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(11, 26, 54, 0.45);
        margin: 0;
      }

      .summary-value {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #0b1a36;
      }

      .actions {
        width: 100%;
        max-width: 520px;
        margin-top: 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .actions ion-button {
        border-radius: 999px;
        height: 52px;
        font-weight: 600;
      }

      .actions .cta {
        --background: #d9a30a;
        --color: #011b2d;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
      }

      .actions .secondary {
        --border-color: rgba(11, 26, 54, 0.25);
        --color: #0b1a36;
        background: transparent;
        border: 1px solid rgba(11, 26, 54, 0.25);
        box-shadow: none;
      }

      .confirmation-note {
        margin: 1.4rem auto 0.6rem;
        align-self: center;
        max-width: 520px;
        text-align: center;
        color: rgba(15, 34, 61, 0.75);
        font-size: 0.85rem;
        line-height: 1.4;
        font-weight: 500;
      }
    `
  ],
})
export class DonateSuccessPage implements OnInit, OnDestroy {
  summary: DonationCheckoutSummary | null = null;
  private verifySub?: Subscription;

  constructor(
    private readonly api: ApiService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.verifySub = this.api
        .get<VerifyCheckoutSessionResponse>('donations/verify-checkout-session/', {
          session_id: sessionId,
        })
        .subscribe({
          next: response => {
            if (response.verified) {
              this.summary = this.mapVerificationResponse(response);
              this.donationFlowState.clear();
            } else {
              this.applyStoredSummary();
            }
          },
          error: () => this.applyStoredSummary(),
        });
    } else {
      this.applyStoredSummary();
    }
  }

  ngOnDestroy(): void {
    this.verifySub?.unsubscribe();
  }

  private applyStoredSummary(): void {
    const stored = this.donationFlowState.getStoredSummary();
    if (stored) {
      this.summary = stored;
      this.donationFlowState.clear();
    }
  }

  private mapVerificationResponse(response: VerifyCheckoutSessionResponse): DonationCheckoutSummary {
    const amount = response.amount ? Number(response.amount) : undefined;
    return {
      branchName: response.church?.name ?? undefined,
      category: response.category ?? undefined,
      amount,
      currency: response.currency,
      donorEmail: response.donor_email ?? undefined,
      transactionReference: response.transaction_reference ?? undefined,
    };
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
