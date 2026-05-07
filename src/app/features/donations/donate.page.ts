import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonInput, IonicModule, ToastController } from '@ionic/angular';
import { Subject, Subscription } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';
import { PublicBranch } from '../../core/models/branch.model';
import {
  DonationCheckoutRequest,
  DonationFrequency,
  RecurringDonationCreateRequest,
} from '../../core/models/donation.model';
import { DonationFlowStateService } from '../../core/services/donation-flow-state.service';
import { DonationsService } from '../../core/services/donations.service';
import { AuthService } from '../../core/services/auth.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { PaymentSheetOutcome, StripePaymentService } from '../../core/services/stripe-payment.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
import { environment } from 'src/environments/environment';

const EURO_SYMBOL = '\u20AC';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate',
  template: `
    <ion-page>
      <div class="donate-hero app-header app-header--inner">
        <app-mobile-header
          title="Make a Donation"
          subtitle="Support your local church safely and securely."
          [centerCopy]="false"
          fallbackRoute="/branches"
        ></app-mobile-header>
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

              <form [formGroup]="form" (ngSubmit)="submitDonation()" class="donate-form">
                <div class="section-label">FREQUENCY</div>
                <div class="frequency-cards" role="radiogroup" aria-label="Donation frequency">
                  <button
                    type="button"
                    class="frequency-card"
                    [class.selected]="frequency === 'one_time'"
                    [attr.aria-checked]="frequency === 'one_time'"
                    aria-label="One-time donation"
                    role="radio"
                    (click)="setFrequency('one_time')"
                  >
                    <span class="frequency-leading" aria-hidden="true"></span>
                    <span class="frequency-copy">
                      <span class="frequency-title">One-time</span>
                      <span class="frequency-subtitle">Pay once</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    class="frequency-card"
                    [class.selected]="frequency === 'monthly'"
                    [class.disabled]="!canUseRecurring"
                    [attr.aria-checked]="frequency === 'monthly'"
                    aria-label="Monthly donation"
                    role="radio"
                    (click)="handleMonthlySelection()"
                  >
                    <span class="frequency-leading" aria-hidden="true">
                      <span class="frequency-icon-indicator">
                      <ion-icon *ngIf="!canUseRecurring" name="lock-closed"></ion-icon>
                      </span>
                    </span>
                    <span class="frequency-copy">
                      <span class="frequency-title">Monthly</span>
                      <span class="frequency-subtitle">
                        {{
                          canUseRecurring
                            ? 'Charged today, then monthly. Cancel anytime.'
                            : 'Sign in to set up monthly giving.'
                        }}
                      </span>
                    </span>
                  </button>
                </div>
                <p *ngIf="showRecurringDebug" class="recurring-debug">
                  role={{ recurringDebugRole }}, memberLoaded={{ memberProfileLoaded }}, canUseRecurring={{ canUseRecurring }}
                </p>

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
                <ion-item class="custom-amount" [class.is-valid]="isAmountValid" fill="solid">
                  <span class="amount-prefix" aria-hidden="true">&euro;</span>
                  <ion-input
                    #amountInput
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
                  <ion-input
                    type="email"
                    placeholder="Email (optional)"
                    formControlName="donor_email"
                    (ionInput)="handleEmailInput($event)"
                  ></ion-input>
                </ion-item>

                <ion-text color="danger" *ngIf="errorMessage" class="form-error">
                  {{ errorMessage }}
                </ion-text>

                <p class="recurring-confirmation" *ngIf="showRecurringConfirmation">
                  You will give {{ formattedValidAmount }} every month.
                </p>

                <ion-button
                  type="submit"
                  expand="block"
                  class="cta"
                  [class.cta-enabled]="ctaEnabled"
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
    `,
  ],
})
export class DonatePage implements AfterViewInit, OnDestroy {
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
  frequency: DonationFrequency = 'one_time';

  @ViewChild('amountInput') private amountInput?: IonInput;

  private branchSub: Subscription;
  private pendingMobileDonationId?: number;
  private pendingRecurringDonationId?: number;
  private pendingFrequency?: DonationFrequency;
  private hasAutoFocusedAmount = false;
  private focusTimeoutId?: ReturnType<typeof setTimeout>;
  private hasPrefilledEmail = false;
  private emailWasAuthPrefilled = false;
  private lastAuthPrefilledEmail = '';
  memberProfileLoaded = !!this.authService.currentUserSnapshot;
  private resolvedUserRole: string | null = this.normalizeRole(this.authService.currentUserSnapshot?.role);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly donationsService: DonationsService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly authService: AuthService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router,
    private readonly stripePaymentService: StripePaymentService,
    private readonly toastController: ToastController
  ) {
    this.branchSub = this.selectedBranchService.selectedBranch$.subscribe(branch => {
      this.branch = branch;

      if (!branch) {
        this.hasAutoFocusedAmount = false;
        return;
      }

      this.tryAutoFocusAmount();
    });

    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated) => {
        this.logRecurringState('auth-state', this.authService.currentUserSnapshot);
        if (!isAuthenticated) {
          this.memberProfileLoaded = false;
          this.resolvedUserRole = null;
          this.ensureRecurringFrequencyAllowed();
          this.clearAuthPrefilledDonorEmail();
          return;
        }

        this.ensureMemberProfileResolved();
        this.ensureRecurringFrequencyAllowed();
        this.prefillDonorEmailOnce();
      });

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.memberProfileLoaded = !!user;
        this.resolvedUserRole = this.normalizeRole(user?.role);
        this.logRecurringState('current-user', user);
        this.ensureRecurringFrequencyAllowed();
      });

    this.ensureMemberProfileResolved();
    this.logRecurringState('init', this.authService.currentUserSnapshot);
    this.prefillDonorEmailOnce();
  }

  ngAfterViewInit(): void {
    this.tryAutoFocusAmount();
  }

  ionViewWillEnter(): void {
    this.ensureMemberProfileResolved();
    this.prefillDonorEmailOnce();
    this.tryAutoFocusAmount();
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
          this.persistOneTimeSummary(payload, response.transaction_reference);
          window.location.href = response.checkout_url;
        },
        error: () => {
          this.errorMessage = 'Unable to start checkout. Please try again.';
        },
      });
  }

  startNativePayment(): void {
    if (this.frequency === 'monthly') {
      this.startRecurringPayment();
      return;
    }

    if (!this.readyForPayment()) {
      return;
    }

    const payload = this.buildPayload();
    this.nativeLoading = true;
    this.nativeError = undefined;
    this.errorMessage = undefined;
    this.pendingFrequency = 'one_time';

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
          this.persistOneTimeSummary(payload, response.transaction_reference);
          this.pendingMobileDonationId = response.donation_id;
          this.pendingRecurringDonationId = undefined;
          this.stripePaymentService.presentPaymentSheet(response.client_secret).then(result =>
            this.handlePaymentSheetOutcome(result)
          );
        },
        error: () => {
          this.pendingFrequency = undefined;
          this.nativeError = 'Unable to start native payment. Please try again.';
        },
      });
  }

  submitDonation(): void {
    this.startNativePayment();
  }

  ngOnDestroy(): void {
    if (this.focusTimeoutId) {
      clearTimeout(this.focusTimeoutId);
    }

    this.destroy$.next();
    this.destroy$.complete();
    this.branchSub.unsubscribe();
  }

  handlePaymentSheetOutcome(result: { status: PaymentSheetOutcome; errorMessage?: string }): void {
    console.log('[DonatePage] PaymentSheet raw result', result);
    if (result.status === 'completed') {
      this.logPaymentOutcome('completed', this.pendingMobileDonationId, this.pendingRecurringDonationId);
      this.router.navigate(['/donate/success'], {
        queryParams:
          this.pendingFrequency === 'monthly'
            ? { recurring_donation_id: this.pendingRecurringDonationId }
            : { donation_id: this.pendingMobileDonationId },
      });
      this.pendingMobileDonationId = undefined;
      this.pendingRecurringDonationId = undefined;
      this.pendingFrequency = undefined;
    } else if (result.status === 'canceled') {
      this.pendingMobileDonationId = undefined;
      this.pendingRecurringDonationId = undefined;
      this.pendingFrequency = undefined;
      this.router.navigate(['/donate/cancel']);
    } else {
      this.pendingFrequency = undefined;
      this.nativeError = result.errorMessage ?? 'Payment failed. Please try again.';
    }
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  setCategory(option: string): void {
    this.form.get('category')?.setValue(option);
  }

  setFrequency(frequency: string): void {
    this.frequency = frequency === 'monthly' ? 'monthly' : 'one_time';
  }

  handleMonthlySelection(): void {
    if (!this.canUseRecurring) {
      this.setFrequency('one_time');
      void this.showMonthlyAccessToast();
      return;
    }

    this.setFrequency('monthly');
  }

  handleFrequencyChange(event: CustomEvent): void {
    this.setFrequency(String(event.detail?.value ?? 'one_time'));
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

  handleEmailInput(event: CustomEvent): void {
    if (!this.emailWasAuthPrefilled) {
      return;
    }

    const inputValue = String(event.detail?.value ?? '').trim();
    if (inputValue !== this.lastAuthPrefilledEmail) {
      this.emailWasAuthPrefilled = false;
    }
  }

  get ctaEnabled(): boolean {
    return this.form.valid;
  }

  get ctaLabel(): string {
    if (this.nativeLoading) {
      return this.frequency === 'monthly' ? 'Starting monthly gift...' : 'Processing...';
    }

    const amountControl = this.form.get('amount');
    if (!amountControl || amountControl.invalid) {
      return 'Enter an amount to continue';
    }

    const amount = Number(amountControl.value);
    return this.frequency === 'monthly'
      ? `Give ${EURO_SYMBOL}${amount.toFixed(2)} monthly`
      : `Give ${EURO_SYMBOL}${amount.toFixed(2)}`;
  }

  get showRecurringConfirmation(): boolean {
    return this.frequency === 'monthly' && this.isAmountValid;
  }

  get canUseRecurring(): boolean {
    return this.authService.isAuthenticatedSnapshot && (this.resolvedUserRole === 'member' || this.memberProfileLoaded);
  }

  get canSelectMonthly(): boolean {
    return this.canUseRecurring;
  }

  get showRecurringDebug(): boolean {
    return !environment.production;
  }

  get recurringDebugRole(): string {
    return this.resolvedUserRole || 'none';
  }

  get formattedValidAmount(): string {
    const amountControl = this.form.get('amount');
    const amount = Number(amountControl?.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      return `${EURO_SYMBOL}0.00`;
    }
    return `${EURO_SYMBOL}${amount.toFixed(2)}`;
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
      return `Amount must be greater than ${EURO_SYMBOL}0`;
    }

    if (amountControl.hasError('decimalPlaces')) {
      return 'Use up to 2 decimal places';
    }

    return null;
  }

  get isAmountValid(): boolean {
    const amountControl = this.form.get('amount');
    return !!amountControl && amountControl.valid && !!this.customAmountInputValue.trim();
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

  private buildPayload(): DonationCheckoutRequest {
    const formValue = this.form.value;
    return {
      church_id: this.branch!.id,
      category: formValue.category || undefined,
      amount: Number(formValue.amount),
      donor_email: formValue.donor_email || undefined,
    };
  }

  private buildRecurringPayload(): RecurringDonationCreateRequest {
    const formValue = this.form.value;
    return {
      church_id: this.branch!.id,
      category: formValue.category || undefined,
      amount: Number(formValue.amount),
      interval: 'monthly',
    };
  }

  private logPaymentOutcome(
    status: PaymentSheetOutcome,
    donationId?: number,
    recurringDonationId?: number
  ): void {
    console.log('[DonatePage] native PaymentSheet outcome', { status, donationId, recurringDonationId });
  }

  private persistOneTimeSummary(payload: DonationCheckoutRequest, transactionReference: string): void {
    this.donationFlowState.setSummary({
      branchName: this.branch?.name,
      branchId: this.branch?.id,
      category: payload.category || undefined,
      amount: payload.amount,
      donorEmail: payload.donor_email,
      interval: 'one_time',
      transactionReference,
      timestamp: Date.now(),
    });
  }

  private persistRecurringSummary(payload: RecurringDonationCreateRequest, recurringDonationId: number): void {
    this.donationFlowState.setSummary({
      branchName: this.branch?.name,
      branchId: this.branch?.id,
      category: payload.category || undefined,
      amount: payload.amount,
      currency: 'eur',
      interval: payload.interval,
      recurringDonationId,
      timestamp: Date.now(),
    });
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

  private startRecurringPayment(): void {
    if (!this.canUseRecurring) {
      this.pendingRecurringDonationId = undefined;
      this.pendingFrequency = undefined;
      this.frequency = 'one_time';
      this.nativeError = 'Please sign in to set up monthly giving.';
      void this.showMonthlyAccessToast();
      return;
    }

    if (!this.readyForPayment()) {
      return;
    }

    const payload = this.buildRecurringPayload();
    this.nativeLoading = true;
    this.nativeError = undefined;
    this.errorMessage = undefined;
    this.pendingFrequency = 'monthly';

    this.donationsService
      .createRecurringCheckout(payload)
      .pipe(finalize(() => (this.nativeLoading = false)))
      .subscribe({
        next: response => {
          this.pendingMobileDonationId = undefined;
          this.pendingRecurringDonationId = response.recurring_donation_id;
          this.persistRecurringSummary(payload, response.recurring_donation_id);
          this.stripePaymentService.presentPaymentSheet(response.client_secret).then(result =>
            this.handlePaymentSheetOutcome(result)
          );
        },
        error: error => {
          this.pendingRecurringDonationId = undefined;
          this.pendingFrequency = undefined;
          this.nativeError = this.resolveRecurringErrorMessage(error);
        },
      });
  }

  private resolveRecurringErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'Please sign in to set up a monthly donation.';
      }

      const detail = this.extractDetailMessage(error.error);
      if (detail) {
        return detail;
      }
    }

    return 'Unable to start monthly giving. Please try again.';
  }

  private extractDetailMessage(errorBody: unknown): string | null {
    if (!errorBody || typeof errorBody !== 'object') {
      return null;
    }

    const detail = (errorBody as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    return null;
  }

  private prefillDonorEmailOnce(): void {
    if (this.hasPrefilledEmail) {
      return;
    }

    if (!this.authService.isAuthenticatedSnapshot) {
      this.clearAuthPrefilledDonorEmail();
      this.hasPrefilledEmail = true;
      return;
    }

    if (!this.canPrefillDonorEmail()) {
      this.hasPrefilledEmail = true;
      return;
    }

    const snapshotEmail = this.authService.currentUserSnapshot?.email?.trim();
    if (snapshotEmail) {
      this.applyPrefilledDonorEmail(snapshotEmail);
      return;
    }

    this.authService.currentUser$
      .pipe(
        filter((user): user is NonNullable<typeof user> => !!user),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe((user) => {
        const email = user.email?.trim();
        if (email) {
          this.applyPrefilledDonorEmail(email);
          return;
        }

        if (!this.canPrefillDonorEmail()) {
          this.hasPrefilledEmail = true;
        }
      });

    if (this.authService.currentUserSnapshot || !this.authService.isAuthenticatedSnapshot) {
      if (!this.authService.isAuthenticatedSnapshot) {
        this.hasPrefilledEmail = true;
      }
      return;
    }

    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (!this.canPrefillDonorEmail()) {
          this.hasPrefilledEmail = true;
          return;
        }

        const userEmail = user?.email?.trim();
        if (userEmail) {
          this.applyPrefilledDonorEmail(userEmail);
          return;
        }

        this.hasPrefilledEmail = true;
      },
      error: () => {
        this.hasPrefilledEmail = true;
      },
    });
  }

  private canPrefillDonorEmail(): boolean {
    const emailControl = this.form.get('donor_email');
    return !!emailControl && !emailControl.dirty && !String(emailControl.value ?? '').trim();
  }

  private applyPrefilledDonorEmail(email: string): void {
    if (!this.canPrefillDonorEmail()) {
      this.hasPrefilledEmail = true;
      return;
    }

    const emailControl = this.form.get('donor_email');
    emailControl?.setValue(email, { emitEvent: false });
    emailControl?.markAsPristine();
    emailControl?.markAsUntouched();
    this.lastAuthPrefilledEmail = email.trim();
    this.emailWasAuthPrefilled = true;
    this.hasPrefilledEmail = true;
  }

  private clearAuthPrefilledDonorEmail(): void {
    if (!this.emailWasAuthPrefilled) {
      return;
    }

    const emailControl = this.form.get('donor_email');
    emailControl?.setValue('', { emitEvent: false });
    emailControl?.markAsPristine();
    emailControl?.markAsUntouched();
    this.emailWasAuthPrefilled = false;
    this.lastAuthPrefilledEmail = '';
    this.hasPrefilledEmail = false;
  }

  private ensureRecurringFrequencyAllowed(): void {
    if (this.frequency === 'monthly' && !this.canUseRecurring) {
      this.frequency = 'one_time';
    }
  }

  private async showMonthlyAccessToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Please sign in to set up monthly giving.',
      duration: 2200,
      position: 'bottom',
      color: 'dark',
    });

    await toast.present();
  }

  private normalizeRole(role: string | null | undefined): string | null {
    return typeof role === 'string' && role.trim() ? role.trim().toLowerCase() : null;
  }

  private ensureMemberProfileResolved(): void {
    if (!this.authService.isAuthenticatedSnapshot) {
      return;
    }

    if (this.memberProfileLoaded && this.resolvedUserRole) {
      return;
    }

    this.authService.getCurrentUser().pipe(take(1), takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.memberProfileLoaded = !!user;
        this.resolvedUserRole = this.normalizeRole(user?.role);
        this.logRecurringState('member-refresh', user);
        this.ensureRecurringFrequencyAllowed();
      },
      error: () => {
        this.logRecurringState('member-refresh-error', this.authService.currentUserSnapshot);
      },
    });
  }

  private logRecurringState(source: string, memberProfile: unknown): void {
    if (!environment.production) {
      console.log('[DonatePage] recurring auth state', {
        source,
        authUserObject: this.authService.currentUserSnapshot,
        memberProfileObject: memberProfile,
        isAuthenticated: this.authService.isAuthenticatedSnapshot,
        role: this.resolvedUserRole,
        memberLoaded: this.memberProfileLoaded,
        canUseRecurring: this.canUseRecurring,
      });
    }
  }

  private tryAutoFocusAmount(): void {
    if (this.hasAutoFocusedAmount || !this.branch || !this.amountInput || this.loading || this.nativeLoading) {
      return;
    }

    if (this.focusTimeoutId) {
      clearTimeout(this.focusTimeoutId);
    }

    this.focusTimeoutId = setTimeout(() => {
      if (this.hasAutoFocusedAmount || !this.branch || !this.amountInput || this.loading || this.nativeLoading) {
        return;
      }

      this.amountInput.setFocus().catch(() => undefined);
      this.hasAutoFocusedAmount = true;
    }, 120);
  }
}
