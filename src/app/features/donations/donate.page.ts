import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { DonationsService } from '../../core/services/donations.service';
import { DonationFlowStateService } from '../../core/services/donation-flow-state.service';
import { PublicBranch } from '../../core/models/branch.model';
import { DonationCheckoutRequest } from '../../core/models/donation.model';
import { PaymentSheetOutcome, StripePaymentService } from '../../core/services/stripe-payment.service';

const AMOUNT_PATTERN = /^\d+(\.\d{0,2})?$/;

function amountValidator(control: AbstractControl): ValidationErrors | null {
  const rawValue = String(control.value ?? '').trim();
  if (!rawValue) {
    return { required: true };
  }

  if (!AMOUNT_PATTERN.test(rawValue)) {
    return { decimalPlaces: true };
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return { greaterThanZero: true };
  }

  return null;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate',
  template: `
    <ion-page>
      <div class="donate-hero app-header app-header--inner">
        <div class="app-header__inner">
          <button class="hero-back app-header__back" (click)="goBack()" type="button">
            <ion-icon class="app-back-icon" name="chevron-back" aria-hidden="true"></ion-icon>
            <span>Back</span>
          </button>
          <div class="app-header__copy">
            <h1 class="app-header__title">Make a Donation</h1>
            <p class="app-header__subtitle">Support your local church safely and securely.</p>
          </div>
        </div>
      </div>

      <ion-content fullscreen class="donate-content">
        <div class="surface donate-surface">
          <div class="surface__content">
            <ng-container *ngIf="branch; else missingBranch">
              <div class="branch-card" (click)="goToBranches()" tabindex="0" role="button">
                <div class="branch-icon">
                  <ion-icon name="location"></ion-icon>
                </div>
                <div class="branch-info">
                  <div class="branch-title-row">
                    <h2>{{ branch.name }}</h2>
                    <span class="change-link" (click)="goToBranches(); $event.stopPropagation()">Change</span>
                  </div>
                  <p *ngIf="branch.district || branch.area">{{ getHierarchy(branch) }}</p>
                </div>
                <div class="branch-code" *ngIf="branch.branch_code">
                  {{ branch.branch_code }}
                </div>
              </div>

              <form [formGroup]="form" (ngSubmit)="startNativePayment()" class="donate-form">
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
                <ion-item class="custom-amount" fill="solid">
                  <span class="amount-prefix" aria-hidden="true">&euro;</span>
                  <ion-input
                    type="text"
                    [value]="customAmountInputValue"
                    placeholder="Enter amount (EUR)"
                    inputmode="decimal"
                    autocomplete="off"
                    enterkeyhint="done"
                    (ionInput)="handleCustomAmountInput($event)"
                    (ionBlur)="handleCustomAmountBlur()"
                  ></ion-input>
                </ion-item>
                <ion-text color="danger" *ngIf="amountValidationMessage" class="form-error amount-error">
                  {{ amountValidationMessage }}
                </ion-text>

                <ion-item class="custom-email" fill="solid">
                  <ion-input type="email" placeholder="Email (optional)" formControlName="donor_email"></ion-input>
                </ion-item>

                <ion-text color="danger" *ngIf="errorMessage" class="form-error">
                  {{ errorMessage }}
                </ion-text>

                <ion-button
                  type="submit"
                  expand="block"
                  class="cta"
                  [disabled]="!ctaEnabled || nativeLoading"
                >
                  <ion-icon name="lock-closed" slot="start"></ion-icon>
                  <span>{{ ctaLabel }}</span>
                  <ion-spinner *ngIf="nativeLoading" name="crescent" slot="start"></ion-spinner>
                </ion-button>
                <p class="trust-text">Payments processed securely via Stripe</p>
                <ion-text color="danger" *ngIf="nativeError" class="form-error">
                  {{ nativeError }}
                </ion-text>
              </form>
            </ng-container>
            <ng-template #missingBranch>
              <div class="empty-state">
                <p>Please choose a branch before continuing.</p>
                <ion-button expand="block" (click)="goToBranches()">Choose a branch</ion-button>
              </div>
            </ng-template>
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

      ion-content.donate-content {
        --background: transparent;
        background: #0b1d73;
      }

      .donate-hero {
        position: relative;
        z-index: 1;
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
        cursor: pointer;
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

      .branch-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
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

      .branch-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }

      .change-link {
        font-size: 0.8rem;
        color: rgba(3, 23, 63, 0.6);
        cursor: pointer;
        white-space: nowrap;
        align-self: center;
      }

      .donate-form {
        display: flex;
        flex-direction: column;
        gap: 0.95rem;
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
        gap: 0.45rem;
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

      .custom-amount {
        --min-height: 62px;
        padding-inline: 0.15rem;
      }

      .amount-prefix {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.15rem;
        margin-left: 0.15rem;
        color: #111b45;
        font-size: 1.05rem;
        font-weight: 700;
      }

      ion-input {
        font-size: 1rem;
        font-weight: 600;
        color: #111b45;
      }

      .custom-amount input {
        text-align: left;
        font-weight: 600;
        -moz-appearance: textfield;
      }

      .custom-amount input::-webkit-outer-spin-button,
      .custom-amount input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .cta {
        --background: #d9a30a;
        --color: #011b2d;
        font-weight: 700;
        border-radius: 999px;
        height: 52px;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
      }

      .cta:disabled {
        --color: rgba(1, 27, 45, 0.7);
      }

      .cta.native {
        --background: transparent;
        --color: #0b1d73;
        --border-width: 1px;
        --border-color: rgba(11, 26, 54, 0.35);
        box-shadow: none;
      }

      .cta ion-icon {
        font-size: 1.1rem;
        margin-right: 0.35rem;
      }

      .trust-text {
        margin: 0.2rem 0 0;
        text-align: center;
        color: #475467;
        font-size: 0.75rem;
      }

      .form-error {
        margin: 0.25rem 0;
        color: #dc2626;
      }

      .amount-error {
        margin-top: -0.45rem;
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
    amount: this.fb.control<string>('', [amountValidator]),
    donor_email: this.fb.control<string>('', Validators.email),
  });

  loading = false;
  errorMessage?: string;
  nativeLoading = false;
  nativeError?: string;
  branch: PublicBranch | null = null;
  customAmountInputValue = '';
  private branchSub: Subscription;
  private pendingMobileDonationId?: number;

  constructor(
    private readonly fb: FormBuilder,
    private readonly donationsService: DonationsService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router,
    private readonly stripePaymentService: StripePaymentService
  ) {
    this.branchSub = this.selectedBranchService.selectedBranch$.subscribe(branch => {
      this.branch = branch;
    });
  }

  submit(): void {
    if (!this.readyForPayment()) {
      return;
    }

    const payload = this.buildPayload();
    this.loading = true;
    this.errorMessage = undefined;
    this.nativeError = undefined;

    this.donationsService
      .createCheckout(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: response => {
          this.persistSummary(payload, response.transaction_reference);
          window.location.href = response.checkout_url;
        },
        error: () => {
          this.errorMessage = 'Unable to start checkout. Please try again.';
        },
      });
  }

  startNativePayment(): void {
    if (!this.readyForPayment()) {
      return;
    }

    const payload = this.buildPayload();
    this.nativeLoading = true;
    this.nativeError = undefined;
    this.errorMessage = undefined;

    this.donationsService
      .createMobileCheckout(payload)
      .pipe(finalize(() => (this.nativeLoading = false)))
      .subscribe({
        next: response => {
          console.log('[DonatePage] mobile checkout response', {
            donationId: response.donation_id,
            transactionReference: response.transaction_reference,
            clientSecretPreview: response.client_secret.slice(0, 8) + '...',
          });
          this.persistSummary(payload, response.transaction_reference);
          this.pendingMobileDonationId = response.donation_id;
          this.stripePaymentService.presentPaymentSheet(response.client_secret).then(result =>
            this.handlePaymentSheetOutcome(result)
          );
        },
        error: () => {
          this.nativeError = 'Unable to start native payment. Please try again.';
        },
      });
  }

  ngOnDestroy(): void {
    this.branchSub.unsubscribe();
  }

  handlePaymentSheetOutcome(result: { status: PaymentSheetOutcome; errorMessage?: string }): void {
    console.log('[DonatePage] PaymentSheet raw result', result);
    if (result.status === 'completed') {
      this.logPaymentOutcome('completed', this.pendingMobileDonationId);
      this.router.navigate(['/donate/success'], {
        queryParams: { donation_id: this.pendingMobileDonationId },
      });
      this.pendingMobileDonationId = undefined;
    } else if (result.status === 'canceled') {
      this.router.navigate(['/donate/cancel']);
    } else {
      this.nativeError = result.errorMessage ?? 'Payment failed. Please try again.';
    }
  }

  private logPaymentOutcome(status: PaymentSheetOutcome, donationId?: number): void {
    console.log('[DonatePage] native PaymentSheet outcome', { status, donationId });
  }

  private readyForPayment(): boolean {
    if (!this.branch) {
      this.errorMessage = 'Please pick a branch first.';
      return false;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill the required fields.';
      return false;
    }
    return true;
  }

  private buildPayload(): DonationCheckoutRequest {
    const formValue = this.form.value;
    return {
      church_id: this.branch!.id,
      category: formValue.category || undefined,
      amount: Number(formValue.amount),
      donor_email: formValue.donor_email || undefined,
    };
  }

  private persistSummary(payload: DonationCheckoutRequest, transactionReference: string): void {
    this.donationFlowState.setSummary({
      branchName: this.branch?.name,
      branchId: this.branch?.id,
      category: payload.category || undefined,
      amount: payload.amount,
      donorEmail: payload.donor_email,
      transactionReference,
      timestamp: Date.now(),
    });
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  goBack(): void {
    this.router.navigate(['/branches']).catch(() => {
      window.location.href = '/branches';
    });
  }

  setCategory(option: string): void {
    this.form.get('category')?.setValue(option);
  }

  isCategory(option: string): boolean {
    return this.form.get('category')?.value === option;
  }

  handleCustomAmountInput(event: CustomEvent): void {
    const inputValue = String(event.detail?.value ?? '');
    this.customAmountInputValue = inputValue;
    this.form.get('amount')?.setValue(inputValue, { emitEvent: false });
    this.form.get('amount')?.markAsDirty();
    this.form.get('amount')?.updateValueAndValidity({ emitEvent: false });
  }

  handleCustomAmountBlur(): void {
    const amountControl = this.form.get('amount');
    if (!amountControl) {
      return;
    }

    amountControl.markAsTouched();

    const rawValue = this.customAmountInputValue.trim();
    if (!rawValue || amountControl.invalid) {
      return;
    }

    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    const normalizedValue = numericValue.toFixed(2);
    this.customAmountInputValue = normalizedValue;
    amountControl.setValue(normalizedValue, { emitEvent: false });
    amountControl.updateValueAndValidity({ emitEvent: false });
  }

  get ctaEnabled(): boolean {
    return this.form.valid;
  }

  get ctaLabel(): string {
    if (this.nativeLoading) {
      return 'Processing...';
    }

    const amountControl = this.form.get('amount');
    if (!amountControl || amountControl.invalid) {
      return 'Enter an amount to continue';
    }

    const amount = Number(amountControl.value);
    return `Give €${amount.toFixed(2)} securely`;
  }

  get amountValidationMessage(): string | null {
    const amountControl = this.form.get('amount');
    if (!amountControl || (!amountControl.touched && !amountControl.dirty)) {
      return null;
    }

    if (amountControl.hasError('required')) {
      return 'Enter an amount to continue';
    }

    if (amountControl.hasError('greaterThanZero')) {
      return 'Amount must be greater than €0';
    }

    if (amountControl.hasError('decimalPlaces')) {
      return 'Use up to 2 decimal places';
    }

    return null;
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
