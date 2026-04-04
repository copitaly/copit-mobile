import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DonationFlowStateService, DonationCheckoutSummary } from '../../core/services/donation-flow-state.service';

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
              <ng-container *ngIf="summary as current; else fallback">
                <p>Your donation completed successfully.</p>
                <p *ngIf="current.branchName">Branch: {{ current.branchName }}</p>
                <p *ngIf="current.category">Category: {{ current.category }}</p>
                <p *ngIf="current.amount !== undefined">Amount: €{{ current.amount.toFixed(2) }}</p>
                <p *ngIf="current.donorEmail">Email: {{ current.donorEmail }}</p>
                <p *ngIf="current.transactionReference">Reference: {{ current.transactionReference }}</p>
                <p class="small">
                  A confirmation may arrive via email shortly. If you need a receipt, reach out to the team.
                </p>
              </ng-container>
              <ng-template #fallback>
                <p>Your donation completed successfully.</p>
                <p class="small">
                  We couldn’t display the saved summary because this page was loaded directly. Check your email for confirmation.
                </p>
              </ng-template>
              <p class="debug" *ngIf="sessionId">Session ID: {{ sessionId }}</p>
            </ion-card-content>
          </ion-card>
          <ion-button expand="block" (click)="goToBranches()">Give again</ion-button>
          <ion-button expand="block" fill="outline" (click)="goHome()">Back home</ion-button>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      ion-card {
        margin: 0;
        border-radius: 16px;
      }

      .status-page {
        --background: var(--ion-color-step-100, #f7f7f7);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1.5rem;
        min-height: 100vh;
      }

      .panel {
        width: 100%;
        max-width: 480px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .panel ion-card {
        background: #fff;
        padding: 1rem;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.1);
      }

      .panel p {
        color: #111;
        font-size: 1rem;
        margin: 0.25rem 0;
        line-height: 1.5;
      }

      .panel .small {
        font-size: 0.85rem;
        color: #4b5563;
      }

      .panel .debug {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.5rem;
      }

      ion-button[fill='outline'] {
        --border-color: var(--ion-color-primary);
        --color: var(--ion-color-primary);
      }
    `,
  ],
})
export class DonateSuccessPage implements OnInit, OnDestroy {
  summary: DonationCheckoutSummary | null = null;
  sessionId?: string;
  private sub?: Subscription;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly donationFlowState: DonationFlowStateService
  ) {}

  ngOnInit(): void {
    const persisted = this.donationFlowState.getStoredSummary();
    if (persisted) {
      this.summary = persisted;
      this.donationFlowState.clear();
    } else {
      this.sub = this.donationFlowState.summary$.subscribe(summary => {
        this.summary = summary;
      });
    }
    this.route.queryParamMap.subscribe(params => {
      this.sessionId = params.get('session_id') ?? undefined;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }
}
