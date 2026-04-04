import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { DonationFlowStateService, DonationCheckoutSummary } from '../../core/services/donation-flow-state.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate-cancel',
  template: `
    <ion-page>
      <ion-header>
        <ion-toolbar>
          <ion-title>Donation canceled</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content fullscreen class="status-page">
        <div class="panel">
          <ion-card>
            <ion-card-header>
              <ion-card-title>Payment not completed</ion-card-title>
              <ion-card-subtitle>Donation canceled</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <p>No payment was processed. Feel free to select another branch or try again later.</p>
              <ng-container *ngIf="summary">
                <p *ngIf="summary.branchName">Branch: {{ summary.branchName }}</p>
                <p *ngIf="summary.category">Category: {{ summary.category }}</p>
                <p *ngIf="summary.amount !== undefined">Amount: €{{ summary.amount.toFixed(2) }}</p>
              </ng-container>
            </ion-card-content>
          </ion-card>
          <ion-button expand="block" (click)="goToBranches()">Try again</ion-button>
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
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.08);
      }

      .panel p {
        color: #111;
        font-size: 1rem;
        margin: 0;
      }

      ion-button {
        font-weight: 600;
      }
    `,
  ],
})
export class DonateCancelPage implements OnInit {
  summary: DonationCheckoutSummary | null = null;

  constructor(
    private readonly router: Router,
    private readonly donationFlowState: DonationFlowStateService
  ) {}

  ngOnInit(): void {
    this.summary = this.donationFlowState.getStoredSummary();
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
