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
import { AlertController, IonContent, IonInput, IonicModule, ToastController } from '@ionic/angular';
import { Subject, Subscription, firstValueFrom } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';
import { PublicBranch } from '../../core/models/branch.model';
import {
  DonationCategory,
  DonationCheckoutRequest,
  DonationFrequency,
  RecurringDonationCreateRequest,
} from '../../core/models/donation.model';
import { DonationFlowStateService } from '../../core/services/donation-flow-state.service';
import { DonationsService } from '../../core/services/donations.service';
import { AuthService } from '../../core/services/auth.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { PaymentSheetOutcome, StripePaymentService } from '../../core/services/stripe-payment.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DonationAnalyticsContextService } from '../../core/services/donation-analytics-context.service';
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

      <ion-content fullscreen class="donate-content" scrollY="true">
        <div class="surface donate-surface">
          <div class="surface__content">
            <ng-container *ngIf="branch; else missingBranch">
              <div class="donate-form-card">
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
                <div class="section-label">CATEGORY</div>
                <div *ngIf="categoriesLoading" class="grid category-grid category-grid--loading" aria-live="polite">
                  <span *ngFor="let item of categorySkeletonItems" class="chip chip--skeleton"></span>
                </div>
                <div *ngIf="!categoriesLoading && categoriesLoadError" class="category-feedback" role="status">
                  <p>{{ categoriesLoadError }}</p>
                  <ion-button type="button" fill="outline" size="small" (click)="retryCategoryLoad()">
                    Retry
                  </ion-button>
                </div>
                <div
                  *ngIf="!categoriesLoading && !categoriesLoadError && categories.length === 0"
                  class="category-feedback"
                  role="status"
                >
                  <p>No donation categories are available for this branch.</p>
                </div>
                <div
                  *ngIf="!categoriesLoading && !categoriesLoadError && categories.length > 0"
                  class="grid category-grid"
                >
                  <button
                    *ngFor="let option of categories"
                    type="button"
                    class="chip"
                    [class.selected]="isCategory(option.id)"
                    (click)="setCategory(option.id)"
                  >
                    {{ option.name }}
                  </button>
                </div>
                <p *ngIf="categoryRecurringHelperMessage" class="frequency-helper">
                  {{ categoryRecurringHelperMessage }}
                </p>

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

                <div class="frequency-section">
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
                      <span class="frequency-leading" aria-hidden="true">
                        <span class="frequency-radio-indicator"></span>
                      </span>
                      <span class="frequency-copy">
                        <span class="frequency-title">One-time</span>
                        <span class="frequency-subtitle">Pay once</span>
                      </span>
                    </button>

                    <button
                      *ngIf="showMonthlyOption"
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
                        <span class="frequency-radio-indicator"></span>
                      </span>
                      <span class="frequency-copy">
                        <span class="frequency-title">Monthly</span>
                        <span class="frequency-subtitle">
                          {{
                            canUseRecurring
                              ? 'Charged today, then monthly. Cancel anytime.'
                              : monthlyUnavailableMessage
                          }}
                        </span>
                      </span>
                      <span *ngIf="!canUseRecurring" class="frequency-trailing-icon" aria-hidden="true">
                        <ion-icon name="lock-closed"></ion-icon>
                      </span>
                    </button>
                  </div>
                  <button
                    *ngIf="showGuestMonthlyPrompt"
                    type="button"
                    class="monthly-callout"
                    (click)="showMonthlyGivingPrompt()"
                  >
                    <span class="monthly-callout__icon" aria-hidden="true">
                      <ion-icon name="lock-closed"></ion-icon>
                    </span>
                    <span class="monthly-callout__copy">
                      <span class="monthly-callout__title">Monthly giving is available for members.</span>
                      <span class="monthly-callout__link">Sign in →</span>
                    </span>
                  </button>
                </div>
                <p *ngIf="showRecurringDebug" class="recurring-debug">
                  role={{ recurringDebugRole }}, memberLoaded={{ memberProfileLoaded }}, canUseRecurring={{ canUseRecurring }}
                </p>

                <ion-item class="custom-email" fill="solid">
                  <ion-input
                    #emailInput
                    type="email"
                    placeholder="Email (optional)"
                    formControlName="donor_email"
                    (ionInput)="handleEmailInput($event)"
                    (ionFocus)="handleEmailFocus()"
                  ></ion-input>
                </ion-item>

                <ion-text color="danger" *ngIf="errorMessage" class="form-error">
                  {{ errorMessage }}
                </ion-text>

                <p class="recurring-confirmation" *ngIf="showRecurringConfirmation">
                  You will give {{ formattedValidAmount }} every month.
                </p>

                <ion-text color="danger" *ngIf="nativeError" class="form-error">
                  {{ nativeError }}
                </ion-text>
                <div class="cta-shell">
                  <ion-button
                    type="submit"
                    expand="block"
                    class="cta"
                    [class.cta-enabled]="ctaEnabled"
                    [class.cta-monthly]="isMonthlySelected"
                    [disabled]="!ctaEnabled || nativeLoading"
                  >
                    <ion-icon name="lock-closed" slot="start"></ion-icon>
                    <span class="cta-label">{{ ctaLabel }}</span>
                    <ion-spinner *ngIf="nativeLoading" name="crescent" slot="start"></ion-spinner>
                  </ion-button>
                  <p class="trust-text">Payments processed securely via Stripe</p>
                </div>
              </form>
              </div>
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
  readonly categorySkeletonItems = [1, 2, 3, 4, 5, 6];
  categories: DonationCategory[] = [];

  form = this.fb.group({
    categoryId: this.fb.control<number | null>(null, Validators.required),
    amount: this.fb.control<string>('', [amountValidator]),
    donor_email: this.fb.control<string>('', Validators.email),
  });

  loading = false;
  errorMessage?: string;
  categoriesLoading = false;
  categoriesLoadError?: string;
  categoryRecurringHelperMessage?: string;
  nativeLoading = false;
  nativeError?: string;
  branch: PublicBranch | null = null;
  customAmountInputValue = '';
  private selectedFrequencyState: DonationFrequency = 'one_time';

  @ViewChild(IonContent) private content?: IonContent;
  @ViewChild('amountInput') private amountInput?: IonInput;
  @ViewChild('emailInput') private emailInput?: IonInput;

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
  private lastTrackedDonationFormChurchId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly donationsService: DonationsService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly authService: AuthService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router,
    private readonly stripePaymentService: StripePaymentService,
    private readonly toastController: ToastController,
    private readonly alertController: AlertController,
    private readonly sentryTelemetry: SentryTelemetryService,
    private readonly analyticsService: AnalyticsService,
    private readonly donationAnalyticsContext: DonationAnalyticsContextService
  ) {
    this.branchSub = this.selectedBranchService.selectedBranch$.subscribe(branch => {
      this.branch = branch;

      if (!branch) {
        this.hasAutoFocusedAmount = false;
        this.categories = [];
        this.categoriesLoading = false;
        this.categoriesLoadError = undefined;
        this.categoryRecurringHelperMessage = undefined;
        this.form.get('categoryId')?.setValue(null, { emitEvent: false });
        return;
      }

      this.sentryTelemetry.addFeatureBreadcrumb('donations', 'Donation branch selected', {
        branch_id: branch.id,
        branch_name: branch.name,
      });

      this.loadDonationCategories(branch.id);
      this.trackDonationFormViewedIfNeeded();
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
    this.sentryTelemetry.addFeatureBreadcrumb('donations', 'Donation screen opened');
    this.ensureMemberProfileResolved();
    this.prefillDonorEmailOnce();
    if (this.branch && !this.categoriesLoading && this.categories.length === 0 && !this.categoriesLoadError) {
      this.loadDonationCategories(this.branch.id);
    }
    this.trackDonationFormViewedIfNeeded();
    this.tryAutoFocusAmount();
  }

  submit(): void {
    if (!this.readyForPayment()) {
      return;
    }

    this.logCheckoutSubmit('donations/checkout/');
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
    this.logSubmitState('startNativePayment');
    if (this.isMonthlySelected) {
      if (!environment.production) {
        console.log('[DonatePage] monthly branch selected, starting recurring payment');
      }
      void this.startRecurringPayment();
      return;
    }

    if (!this.readyForPayment()) {
      return;
    }

    this.logCheckoutSubmit('donations/mobile/checkout/');
    const payload = this.buildPayload();
    this.nativeLoading = true;
    this.nativeError = undefined;
    this.errorMessage = undefined;
    this.pendingFrequency = 'one_time';
    const analyticsContext = this.buildAnalyticsContext('one_time');
    this.donationAnalyticsContext.setContext(analyticsContext);
    void this.analyticsService.trackDonationCheckoutStarted(analyticsContext);

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
          void this.presentPaymentSheet(response.client_secret);
        },
        error: () => {
          void this.analyticsService.trackDonationPaymentFailed(analyticsContext, 'checkout_create');
          this.donationAnalyticsContext.clearContext();
          this.pendingFrequency = undefined;
          this.nativeError = 'Unable to start native payment. Please try again.';
        },
      });
  }

  submitDonation(): void {
    this.logSubmitState('submitDonation');
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
      const analyticsContext = this.donationAnalyticsContext.peekContext();
      if (analyticsContext) {
        void this.analyticsService.trackDonationPaymentFailed(analyticsContext, 'payment_sheet');
      }
      this.donationAnalyticsContext.clearContext();
      this.pendingFrequency = undefined;
      this.nativeError = result.errorMessage ?? 'Payment failed. Please try again.';
    }
  }

  goToBranches(): void {
    this.router.navigate(['/branches']);
  }

  setCategory(optionId: number): void {
    this.form.get('categoryId')?.setValue(optionId);
    this.errorMessage = undefined;
    this.nativeError = undefined;
    this.ensureRecurringFrequencyAllowed(true);
  }

  setFrequency(frequency: string): void {
    this.selectedFrequencyState = frequency === 'monthly' ? 'monthly' : 'one_time';
    if (!environment.production) {
      console.log('[DonatePage] frequency updated', {
        frequency: this.frequency,
        selectedFrequency: this.selectedFrequency,
        isMonthly: this.isMonthlySelected,
      });
    }
  }

  handleMonthlySelection(): void {
    if (!environment.production) {
      console.log('[DonatePage] monthly card tapped', {
        canUseRecurring: this.canUseRecurring,
        isLoggedIn: this.authService.isAuthenticatedSnapshot,
        hasAccessToken: !!this.authService.accessTokenSnapshot,
        role: this.resolvedUserRole,
      });
    }
    if (!this.canUseRecurring) {
      this.setFrequency('one_time');
      if (this.authService.isAuthenticatedSnapshot) {
        void this.showMonthlyAccessToast();
        return;
      }

      void this.showMonthlyGivingPrompt();
      return;
    }

    if (!this.selectedCategoryAllowsRecurring) {
      this.setFrequency('one_time');
      this.categoryRecurringHelperMessage = 'Recurring giving is not available for this category.';
      return;
    }

    this.setFrequency('monthly');
  }

  handleFrequencyChange(event: CustomEvent): void {
    this.setFrequency(String(event.detail?.value ?? 'one_time'));
  }

  isCategory(optionId: number): boolean {
    return this.form.get('categoryId')?.value === optionId;
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

  handleEmailFocus(): void {
    setTimeout(() => {
      void this.content?.scrollToBottom(250);
    }, 120);
  }

  get ctaEnabled(): boolean {
    return this.form.valid && !this.categoriesLoading && !this.categoriesLoadError && this.categories.length > 0;
  }

  get frequency(): DonationFrequency {
    return this.selectedFrequencyState;
  }

  get selectedFrequency(): DonationFrequency {
    return this.selectedFrequencyState;
  }

  get isMonthlySelected(): boolean {
    return this.selectedFrequency === 'monthly';
  }

  get ctaLabel(): string {
    if (this.nativeLoading) {
      return this.isMonthlySelected ? 'Starting monthly gift...' : 'Processing...';
    }

    if (this.categoriesLoading) {
      return 'Loading categories...';
    }

    if (this.categoriesLoadError) {
      return 'Retry categories to continue';
    }

    if (!this.categories.length) {
      return 'No categories available';
    }

    if (!this.selectedCategory) {
      return 'Choose a category to continue';
    }

    const amountControl = this.form.get('amount');
    if (!amountControl || amountControl.invalid) {
      return 'Enter an amount to continue';
    }

    const amount = Number(amountControl.value);
    return this.isMonthlySelected
      ? `Give ${EURO_SYMBOL}${amount.toFixed(2)} monthly`
      : `Give ${EURO_SYMBOL}${amount.toFixed(2)}`;
  }

  get showRecurringConfirmation(): boolean {
    return this.isMonthlySelected && this.isAmountValid;
  }

  get canUseRecurring(): boolean {
    return this.authService.isAuthenticatedSnapshot && this.resolvedUserRole === 'member';
  }

  get showMonthlyOption(): boolean {
    return this.authService.isAuthenticatedSnapshot && this.selectedCategoryAllowsRecurring;
  }

  get showGuestMonthlyPrompt(): boolean {
    return !this.authService.isAuthenticatedSnapshot && this.selectedCategoryAllowsRecurring;
  }

  get monthlyUnavailableMessage(): string {
    return 'Monthly giving is available for member accounts.';
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
      category_id: formValue.categoryId ?? undefined,
      amount: Number(formValue.amount),
      donor_email: formValue.donor_email || undefined,
    };
  }

  private buildRecurringPayload(): RecurringDonationCreateRequest {
    const formValue = this.form.value;
    return {
      church_id: this.branch!.id,
      category_id: formValue.categoryId ?? undefined,
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
      category: this.selectedCategory?.name,
      amount: payload.amount,
      interval: 'one_time',
    });
  }

  private persistRecurringSummary(
    payload: RecurringDonationCreateRequest,
    recurringDonationId: number,
    subscriptionId?: string
  ): void {
    this.donationFlowState.setSummary({
      branchName: this.branch?.name,
      category: this.selectedCategory?.name,
      amount: payload.amount,
      interval: payload.interval,
      recurringDonationId,
    });
  }

  private readyForPayment(): boolean {
    if (!this.branch) {
      this.errorMessage = 'Please pick a branch first.';
      return false;
    }

    if (this.categoriesLoading) {
      this.errorMessage = 'Donation categories are still loading.';
      return false;
    }

    if (this.categoriesLoadError) {
      this.errorMessage = 'Unable to load donation categories. Please retry.';
      return false;
    }

    if (!this.categories.length) {
      this.errorMessage = 'No donation categories are available for this branch.';
      return false;
    }

    if (!this.selectedCategory) {
      this.errorMessage = 'Please choose a donation category.';
      return false;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill the required fields.';
      return false;
    }

    return true;
  }

  private async startRecurringPayment(): Promise<void> {
    console.log('[monthly] submit started');
    this.logSubmitState('startRecurringPayment');
    if (!this.canUseRecurring) {
      this.pendingRecurringDonationId = undefined;
      this.pendingFrequency = undefined;
      this.selectedFrequencyState = 'one_time';
      this.nativeError = this.authService.isAuthenticatedSnapshot
        ? 'Monthly giving is available for member accounts.'
        : 'Sign in to give monthly.';
      void this.showMonthlyAccessToast();
      return;
    }

    if (!this.selectedCategoryAllowsRecurring) {
      this.pendingRecurringDonationId = undefined;
      this.pendingFrequency = undefined;
      this.selectedFrequencyState = 'one_time';
      this.categoryRecurringHelperMessage = 'Recurring giving is not available for this category.';
      return;
    }

    if (!this.readyForPayment()) {
      return;
    }

    this.logCheckoutSubmit('donations/recurring/create/');
    const payload = this.buildRecurringPayload();
    this.nativeLoading = true;
    this.nativeError = undefined;
    this.errorMessage = undefined;
    this.pendingFrequency = 'monthly';
    const analyticsContext = this.buildAnalyticsContext('monthly');
    this.donationAnalyticsContext.setContext(analyticsContext);
    void this.analyticsService.trackDonationCheckoutStarted(analyticsContext);
    console.log('[monthly] calling recurring create');
    try {
      console.log('[monthly] before await createRecurringDonation');
      const recurringCreate$ = this.donationsService.createRecurringDonation(payload);
      const response = await firstValueFrom(recurringCreate$);
      console.log('[monthly] after await createRecurringDonation', response);
      console.log('[monthly] recurring create returned');
      console.log('[monthly] response', response);
      console.log('[monthly] client_secret exists', !!response?.client_secret);
      console.log('[DonatePage] recurring checkout response', response);
      this.pendingMobileDonationId = undefined;
      this.pendingRecurringDonationId = response.recurring_donation_id;
      this.persistRecurringSummary(payload, response.recurring_donation_id, response.subscription_id);
      if (!response.client_secret?.trim()) {
        this.pendingRecurringDonationId = undefined;
        this.pendingFrequency = undefined;
        this.nativeError = 'Unable to start monthly payment. Please try again.';
        void this.showMonthlyClientSecretErrorToast();
        return;
      }
      console.log('[monthly] presenting PaymentSheet');
      await this.presentPaymentSheet(response.client_secret, true);
    } catch (error) {
      this.logRecurringHttpError(error);
      void this.analyticsService.trackDonationPaymentFailed(analyticsContext, 'checkout_create');
      this.donationAnalyticsContext.clearContext();
      this.pendingRecurringDonationId = undefined;
      this.pendingFrequency = undefined;
      this.nativeError = this.resolveRecurringErrorMessage(error);
      void this.showRecurringCreateErrorToast(this.nativeError);
    } finally {
      this.nativeLoading = false;
      console.log('[monthly] submit finally');
    }
  }

  private async presentPaymentSheet(clientSecret: string, isMonthly = false): Promise<void> {
    const result = await this.stripePaymentService.presentPaymentSheet(
      clientSecret,
      isMonthly ? 'recurring' : 'one_time'
    );
    if (isMonthly) {
      console.log('[monthly] PaymentSheet result', result);
    }
    this.handlePaymentSheetOutcome(result);
  }

  private resolveRecurringErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const extractedError = this.extractApiErrorMessage(error.error);
      if (extractedError) {
        return extractedError;
      }

      if (error.status === 401 || error.status === 403) {
        return 'Sign in to give monthly.';
      }
    }

    return 'Unable to start monthly giving. Please try again.';
  }

  private extractApiErrorMessage(errorBody: unknown): string | null {
    if (!errorBody || typeof errorBody !== 'object') {
      return null;
    }

    const detail = (errorBody as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    for (const value of Object.values(errorBody as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
      if (Array.isArray(value)) {
        const firstString = value.find((item) => typeof item === 'string' && item.trim()) as string | undefined;
        if (firstString) {
          return firstString;
        }
      }
    }

    return null;
  }

  private logRecurringHttpError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      console.error('[monthly] recurring error status=' + error?.status);
      console.error('[monthly] recurring error statusText=' + error?.statusText);
      console.error('[monthly] recurring error url=' + error?.url);
      console.error('[monthly] recurring error message=' + error?.message);
      console.error('[monthly] recurring error body=' + this.safeJsonStringify(error?.error));
      return;
    }

    console.error('[monthly] createRecurringDonation error', error);
  }

  private safeJsonStringify(value: unknown): string {
    if (value == null) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
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

  private ensureRecurringFrequencyAllowed(showCategoryMessage = false): void {
    if (this.selectedCategoryAllowsRecurring) {
      this.categoryRecurringHelperMessage = undefined;
    }

    if (this.isMonthlySelected && !this.canUseRecurring) {
      this.selectedFrequencyState = 'one_time';
      return;
    }

    if (this.isMonthlySelected && !this.selectedCategoryAllowsRecurring) {
      this.selectedFrequencyState = 'one_time';
      if (showCategoryMessage) {
        this.categoryRecurringHelperMessage = 'Recurring giving is not available for this category.';
      }
    }
  }

  private async showMonthlyAccessToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: this.authService.isAuthenticatedSnapshot
        ? 'Monthly giving is available for member accounts.'
        : 'Sign in to give monthly.',
      duration: 2200,
      position: 'bottom',
      color: 'dark',
    });

    await toast.present();
  }

  async showMonthlyGivingPrompt(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Monthly giving',
      message: 'Monthly giving requires a free account so you can manage and cancel your recurring donations.',
      buttons: [
        {
          text: 'Sign in',
          handler: () => {
            void this.router.navigate(['/login']);
          },
        },
        {
          text: 'Create account',
          handler: () => {
            void this.router.navigate(['/register']);
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await alert.present();
  }

  private async showMonthlyClientSecretErrorToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Unable to start monthly payment. Please try again.',
      duration: 2400,
      position: 'bottom',
      color: 'danger',
    });

    await toast.present();
  }

  private async showRecurringCreateErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2600,
      position: 'bottom',
      color: 'danger',
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

  private logCheckoutSubmit(endpoint: string): void {
    if (!environment.production) {
      console.log('[DonatePage] checkout submit', {
        frequency: this.frequency,
        selectedFrequency: this.selectedFrequency,
        isMonthly: this.isMonthlySelected,
        canUseRecurring: this.canUseRecurring,
        amount: this.form.get('amount')?.value,
        selectedChurchId: this.branch?.id ?? null,
        categoryId: this.form.get('categoryId')?.value,
        categorySlug: this.selectedCategory?.slug ?? null,
        isSubmitting: this.loading || this.nativeLoading,
        isLoggedIn: this.authService.isAuthenticatedSnapshot,
        hasAccessToken: !!this.authService.accessTokenSnapshot,
        tokenAttached:
          endpoint === 'donations/recurring/create/' ? !!this.authService.accessTokenSnapshot : undefined,
        endpoint,
      });
    }
  }

  private logSubmitState(source: string): void {
    if (!environment.production) {
      console.log('[DonatePage] submit state', {
        source,
        frequency: this.frequency,
        selectedFrequency: this.selectedFrequency,
        isMonthly: this.isMonthlySelected,
        canUseRecurring: this.canUseRecurring,
        amount: this.form.get('amount')?.value,
        selectedChurchId: this.branch?.id ?? null,
        categoryId: this.form.get('categoryId')?.value,
        categorySlug: this.selectedCategory?.slug ?? null,
        isSubmitting: this.loading || this.nativeLoading,
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

  private buildAnalyticsContext(frequency: 'one_time' | 'monthly') {
    const amount = Number(this.form.get('amount')?.value);
    return {
      church_id: this.branch?.id,
      district_id: this.branch?.district?.id ?? undefined,
      area_id: this.branch?.area?.id ?? undefined,
      category: this.selectedCategory?.slug ?? undefined,
      amount_bucket: this.analyticsService.getAmountBucket(amount),
      frequency,
      user_type: this.analyticsService.getUserType(),
    };
  }

  retryCategoryLoad(): void {
    if (!this.branch) {
      return;
    }

    this.loadDonationCategories(this.branch.id);
  }

  get selectedCategory(): DonationCategory | null {
    const selectedCategoryId = this.form.get('categoryId')?.value;
    if (!selectedCategoryId) {
      return null;
    }

    return this.categories.find((category) => category.id === selectedCategoryId) ?? null;
  }

  get selectedCategoryAllowsRecurring(): boolean {
    return !!this.selectedCategory?.allow_recurring;
  }

  private loadDonationCategories(branchId: number): void {
    const previousCategoryId = this.form.get('categoryId')?.value ?? null;
    this.categoriesLoading = true;
    this.categoriesLoadError = undefined;
    this.categoryRecurringHelperMessage = undefined;
    this.errorMessage = undefined;
    this.nativeError = undefined;
    this.form.get('categoryId')?.setValue(null, { emitEvent: false });

    this.donationsService
      .getPublicDonationCategories(branchId)
      .pipe(finalize(() => (this.categoriesLoading = false)))
      .subscribe({
        next: (categories) => {
          if (this.branch?.id !== branchId) {
            return;
          }

          this.categories = categories ?? [];
          const resolvedCategoryId = this.categories.some((category) => category.id === previousCategoryId)
            ? previousCategoryId
            : (this.categories[0]?.id ?? null);
          this.form.get('categoryId')?.setValue(resolvedCategoryId, { emitEvent: false });
          this.ensureRecurringFrequencyAllowed(this.isMonthlySelected);
        },
        error: () => {
          if (this.branch?.id !== branchId) {
            return;
          }

          this.categories = [];
          this.form.get('categoryId')?.setValue(null, { emitEvent: false });
          this.categoriesLoadError = 'Unable to load donation categories right now.';
          this.ensureRecurringFrequencyAllowed();
        },
      });
  }

  private trackDonationFormViewedIfNeeded(): void {
    const churchId = this.branch?.id;
    if (!churchId || this.lastTrackedDonationFormChurchId === churchId) {
      return;
    }

    this.lastTrackedDonationFormChurchId = churchId;
    void this.analyticsService.trackDonationFormViewed(churchId);
  }
}
