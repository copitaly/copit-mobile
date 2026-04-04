import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  DonationFlowStateService,
  DonationCheckoutSummary,
} from '../../core/services/donation-flow-state.service';
import { DonationsService } from '../../core/services/donations.service';
import { DonationCheckoutVerificationResponse } from '../../core/models/donation.model';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate-success',
  template: `
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Donation complete</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content fullscreen class="status-page">
        <div class="panel">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Thank you!</ion-card-title>
                <ion-card-subtitle>Donation complete</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <div class="summary-copy">
                  <p class="headline">Your donation has been recorded.</p>
                  <p class="muted">
                    A confirmation email may arrive shortly. Reach out to the team if you need an immediate receipt.
                  </p>
                </div>

                <p class="status-line" *ngIf="verifying">Verifying payment details…</p>
                <p class="status-line" *ngIf="verifiedDetails">
                  Payment status: <strong>{{ verifiedDetails.payment_status }}</strong>
                  <span *ngIf="verifiedDetails.verified"> (verified)</span>
                  <span *ngIf="!verifiedDetails.verified"> (pending)</span>
                </p>
                <p class="status-line error" *ngIf="verificationError">{{ verificationError }}</p>

                <ng-container *ngIf="summary as current; else fallback">
                  <div class="detail">
                    <span>Branch</span>
                    <strong>{{ current.branchName ?? 'Unknown branch' }}</strong>
                  </div>
                  <div class="detail" *ngIf="current.category">
                    <span>Category</span>
                    <strong>{{ current.category }}</strong>
                  </div>
                  <div class="detail" *ngIf="current.amount !== undefined">
                    <span>Amount</span>
                    <strong>€{{ current.amount.toFixed(2) }}</strong>
                  </div>
                  <div class="detail" *ngIf="current.transactionReference">
                    <span>Reference</span>
                    <strong>{{ current.transactionReference }}</strong>
                  </div>
                  <div class="detail" *ngIf="current.donorEmail">
                    <span>Email</span>
                    <strong>{{ current.donorEmail }}</strong>
                  </div>
                </ng-container>

                <ng-template #fallback>
                  <p class="muted">
                    We couldn’t display the saved summary because this page was loaded directly. Check your email for confirmation.
                  </p>
                </ng-template>

                <p class="session" *ngIf="sessionId">Session ID: {{ sessionId }}</p>
              </ion-card-content>
            </ion-card>
          <div class="actions">
            <ion-button expand="block" (click)="goToBranches()">Give again</ion-button>
            <ion-button expand="block" fill="outline" (click)="goHome()">Back home</ion-button>
          </div>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        --ion-background-color: #f9fbff;
      }

      ion-card {
        margin: 0;
        border-radius: 20px;
      }

      .status-page {
        --background: #f5f7fb;
        background: radial-gradient(circle at top, #ffffff 0%, #f0f4ff 55%, #dfe7f6 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1.5rem;
        min-height: 100vh;
      }

      .panel {
        width: 100%;
        max-width: 540px;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .panel ion-card {
        background: #ffffff;
        padding: 1.5rem;
        box-shadow: 0 30px 60px rgba(15, 23, 42, 0.12);
      }

      .summary-copy {
        margin-bottom: 1rem;
      }

      .summary-copy .headline {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0;
        color: #101828;
      }

      .summary-copy .muted {
        margin: 0.25rem 0 0;
        color: #475467;
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .status-line {
        font-size: 0.92rem;
        margin-bottom: 0.35rem;
        color: #475467;
      }

      .status-line.error {
        color: #b91c1c;
      }

      .detail {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid #e5e7eb;
        padding: 0.5rem 0;
        font-size: 0.95rem;
        color: #475467;
      }

      .detail strong {
        color: #0b1a36;
      }

      .detail:last-child {
        border-bottom: none;
      }

      .actions ion-button {
        font-weight: 600;
        border-radius: 12px;
        height: 48px;
      }

      .actions ion-button[fill='outline'] {
        --border-color: #0f2a59;
        --color: #0f2a59;
      }

      .session {
        margin-top: 0.75rem;
        font-size: 0.7rem;
        color: #475467;
        text-align: right;
      }

      @media (max-width: 600px) {
        .panel {
          gap: 0.85rem;
        }

        .panel ion-card {
          padding: 1.25rem;
        }
      }
    `,
  ],
})
export class DonateSuccessPage implements OnInit, OnDestroy {
  summary: DonationCheckoutSummary | null = null;
  sessionId?: string;
  verifying = false;
  verifiedDetails?: DonationCheckoutVerificationResponse;
  verificationError?: string;
  private sub?: Subscription;
  private verificationSub?: Subscription;
  private querySub?: Subscription;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly donationsService: DonationsService
  ) {}

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe(params => {
      const sessionId = params.get('session_id');
      this.sessionId = sessionId ?? undefined;
      if (sessionId) {
        this.startVerification(sessionId);
      } else {
        this.loadSessionSummary();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.querySub?.unsubscribe();
    this.verificationSub?.unsubscribe();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  private startVerification(sessionId: string): void {
    this.verificationError = undefined;
    this.verifiedDetails = undefined;
    this.verifying = true;
    this.verificationSub?.unsubscribe();
    this.sub?.unsubscribe();
    this.verificationSub = this.donationsService
      .verifyCheckoutSession(sessionId)
      .pipe(finalize(() => (this.verifying = false)))
      .subscribe({
        next: response => {
          this.verifiedDetails = response;
          if (response.verified) {
            this.summary = {
              branchName: response.church?.name ?? this.summary?.branchName,
              category: response.category ?? this.summary?.category,
              amount: response.amount ? Number(response.amount) : this.summary?.amount,
              donorEmail: response.donor_email ?? this.summary?.donorEmail,
              transactionReference:
                response.transaction_reference ?? this.summary?.transactionReference,
            };
            this.donationFlowState.clear();
          } else {
            this.verificationError = 'This checkout session could not be verified.';
            this.loadSessionSummary();
          }
        },
        error: () => {
          this.verificationError = 'Unable to verify this checkout session.';
          this.loadSessionSummary();
        },
    });
  }

  private loadSessionSummary(): void {
    this.sub?.unsubscribe();
    const persisted = this.donationFlowState.getStoredSummary();
    if (persisted) {
      this.summary = persisted;
      this.donationFlowState.clear();
    } else {
      this.sub = this.donationFlowState.summary$.subscribe(summary => {
        this.summary = summary;
      });
    }
  }
}
