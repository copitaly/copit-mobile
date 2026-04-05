import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IonicModule, ToggleCustomEvent } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { DonationsService } from '../../core/services/donations.service';
import { DonationFlowStateService } from '../../core/services/donation-flow-state.service';
import { PublicBranch } from '../../core/models/branch.model';
import { DonationCheckoutRequest } from '../../core/models/donation.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate',
  template: `
    <ion-page>
      <div class="donate-hero">
        <div class="hero-back" (click)="goBack()">
          <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
          <span>Back</span>
        </div>
        <h1>Make a Donation</h1>
        <p>Support your local church safely and securely.</p>
      </div>

      <ion-content fullscreen class="donate-content">
        <div class="donate-surface">
          <ng-container *ngIf="branch; else missingBranch">
            <div class="branch-card">
              <div class="branch-icon">
                <ion-icon name="location"></ion-icon>
              </div>
              <div class="branch-info">
                <h2>{{ branch.name }}</h2>
                <p *ngIf="branch.district || branch.area">{{ getHierarchy(branch) }}</p>
              </div>
              <div class="branch-code" *ngIf="branch.branch_code">
                {{ branch.branch_code }}
              </div>
            </div>

            <form [formGroup]="form" (ngSubmit)="submit()" class="donate-form">
              <div class="section-label">CATEGORY</div>
              <div class="grid category-grid">
                <button
                  *ngFor="let option of categories"
                  type="button"
                  class="chip"
                  [class.selected]="isCategory(option.value)"
                  (click)="setCategory(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>

              <div class="section-label">AMOUNT (EUR)</div>
              <div class="grid amount-grid">
                <button
                  *ngFor="let option of amountOptions"
                  type="button"
                  class="chip"
                  [class.selected]="isAmount(option)"
                  (click)="setAmount(option)"
                >
                  €{{ option }}
                </button>
              </div>

              <ion-item class="custom-amount" fill="solid">
                <ion-input
                  type="number"
                  formControlName="amount"
                  placeholder="Custom amount"
                  inputmode="decimal"
                ></ion-input>
              </ion-item>

              <ion-item class="custom-email" fill="solid">
                <ion-input type="email" placeholder="Email (optional)" formControlName="donor_email"></ion-input>
              </ion-item>

              <div class="recurring-card">
                <div>
                  <p class="label">Monthly Recurring</p>
                  <p class="hint">Donate every month automatically</p>
                </div>
                <ion-toggle [checked]="recurring" (ionChange)="toggleRecurring($event)"></ion-toggle>
              </div>

              <ion-text color="danger" *ngIf="errorMessage" class="form-error">
                {{ errorMessage }}
              </ion-text>

              <ion-button type="submit" expand="block" class="cta" [disabled]="form.invalid || loading">
                <ion-icon name="lock-closed" slot="start"></ion-icon>
                <span *ngIf="!loading">Give {{ displayAmount() }} Securely</span>
                <ion-spinner *ngIf="loading" name="crescent" slot="start"></ion-spinner>
              </ion-button>
              <p class="trust-text">Payments processed securely via Stripe</p>
            </form>
          </ng-container>

          <ng-template #missingBranch>
            <div class="empty-state">
              <p>Please choose a branch before continuing.</p>
              <ion-button expand="block" (click)="goToBranches()">Choose a branch</ion-button>
            </div>
          </ng-template>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      ion-content.donate-content {
        --background: transparent;
        background: #0b1d73;
      }

      .donate-hero {
        background: linear-gradient(180deg, #081b61, #0b1d73 70%);
        padding: 1.1rem 1.25rem 1rem;
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        box-shadow: 0 18px 45px rgba(2, 18, 54, 0.35);
      }

      .donate-hero h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 600;
      }

      .donate-hero p {
        margin: 0;
        font-size: 0.95rem;
        opacity: 0.85;
      }

      .donate-surface {
        background: #f5f6fa;
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        padding: 1.5rem 1.25rem 2rem;
        min-height: 100vh;
      }

      .branch-card {
        background: #fff;
        border-radius: 18px;
        box-shadow: 0 12px 26px rgba(0, 0, 0, 0.08);
        display: flex;
        align-items: center;
        gap: 0.9rem;
        padding: 1rem;
        margin-bottom: 1rem;
      }

      .branch-icon {
        width: 44px;
        height: 44px;
        border-radius: 18px;
        background: rgba(3, 23, 63, 0.08);
        display: flex;
        justify-content: center;
        align-items: center;
        color: #0b1d73;
        font-size: 1.2rem;
      }

      .branch-info h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
      }

      .branch-info p {
        margin: 0;
        font-size: 0.9rem;
        color: #475467;
      }

      .branch-code {
        margin-left: auto;
        background: rgba(3, 23, 63, 0.08);
        padding: 0.15rem 0.85rem;
        border-radius: 999px;
        font-size: 0.8rem;
        letter-spacing: 0.2em;
      }

      .donate-form {
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
      }

      .section-label {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.25em;
        color: #475467;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.6rem;
      }

      .chip {
        border: 1px solid #d1d5db;
        border-radius: 14px;
        padding: 0.55rem;
        background: #fff;
        font-weight: 600;
        font-size: 0.95rem;
        color: #111b45;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .chip.selected {
        background: #0b1d73;
        color: #fff;
        border-color: transparent;
      }

      .custom-amount,
      .custom-email {
        --background: #fff;
        border-radius: 14px;
        --border-color: transparent;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
      }

      ion-input {
        font-size: 1rem;
        font-weight: 600;
        color: #111b45;
      }

      .recurring-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
        gap: 1rem;
      }

      .recurring-card .label {
        margin: 0;
        font-weight: 600;
        color: #111b45;
      }

      .recurring-card .hint {
        margin: 0.15rem 0 0;
        font-size: 0.85rem;
        color: #475467;
      }

      .cta {
        --background: #d9a30a;
        --color: #011b2d;
        font-weight: 600;
        border-radius: 999px;
        height: 52px;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
      }

      .cta ion-icon {
        font-size: 1.1rem;
      }

      .trust-text {
        margin: 0.45rem 0 0;
        text-align: center;
        color: #475467;
        font-size: 0.75rem;
      }

      .form-error {
        margin: 0.25rem 0;
        color: #dc2626;
      }

      .empty-state {
        text-align: center;
        margin-top: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
    `,
  ],
})
export class DonatePage implements OnDestroy {
  readonly categories = [
    { label: 'Tithe', value: 'tithe' },
    { label: 'Offering', value: 'offering' },
    { label: 'Missions', value: 'missions' },
    { label: 'Thanksgiving', value: 'thanksgiving' },
    { label: 'Other', value: 'other' },
  ];
  form = this.fb.group({
    category: this.fb.control<string>(this.categories[0].value, Validators.required),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    donor_email: this.fb.control<string>('', Validators.email),
  });
  loading = false;
  errorMessage?: string;
  branch: PublicBranch | null = null;
  private branchSub: Subscription;

  recurring = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly donationsService: DonationsService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router
  ) {
    this.branchSub = this.selectedBranchService.selectedBranch$.subscribe(branch => {
      this.branch = branch;
    });
  }

  submit(): void {
    if (!this.branch) {
      this.errorMessage = 'Please pick a branch first.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill the required fields.';
      return;
    }

    const formValue = this.form.value;
    const payload: DonationCheckoutRequest = {
      church_id: this.branch.id,
      category: formValue.category || undefined,
      amount: Number(formValue.amount),
      donor_email: formValue.donor_email || undefined,
    };

    console.log('[DonatePage] checkout payload category', payload.category);

    this.loading = true;
    this.errorMessage = undefined;

    this.donationsService
      .createCheckout(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: response => {
          this.donationFlowState.setSummary({
            branchName: this.branch?.name,
            branchId: this.branch?.id,
            category: formValue.category || undefined,
            amount: payload.amount,
            donorEmail: payload.donor_email,
            transactionReference: response.transaction_reference,
            timestamp: Date.now(),
          });
          window.location.href = response.checkout_url;
        },
        error: () => {
          this.errorMessage = 'Unable to start checkout. Please try again.';
        },
      });
  }

  ngOnDestroy(): void {
    this.branchSub.unsubscribe();
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  goBack(): void {
    this.router.navigate(['/branches']);
  }

  setCategory(option: string): void {
    this.form.get('category')?.setValue(option);
  }

  isCategory(option: string): boolean {
    return this.form.get('category')?.value === option;
  }

  readonly amountOptions = [10, 25, 50, 100, 200, 500];

  setAmount(value: number): void {
    this.form.get('amount')?.setValue(value);
  }

  isAmount(value: number): boolean {
    return Number(this.form.get('amount')?.value ?? 0) === value;
  }

  displayAmount(): string {
    const amt = Number(this.form.get('amount')?.value ?? 0);
    return amt ? `€${amt}` : 'Choose an amount';
  }

  toggleRecurring(event: ToggleCustomEvent): void {
    this.recurring = event.detail.checked ?? false;
  }

  getHierarchy(branch: PublicBranch): string {
    const parts = [];
    if (branch.district?.name) {
      parts.push(`${branch.district.name} District`);
    }
    if (branch.area?.name) {
      parts.push(`${branch.area.name} Area`);
    }
    return parts.join(' • ');
  }
}
