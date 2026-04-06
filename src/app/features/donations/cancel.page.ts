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
  templateUrl: './cancel.page.html',
  styleUrls: ['./cancel.page.scss'],
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
