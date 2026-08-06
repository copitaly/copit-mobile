import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonContent, IonInput, IonicModule } from '@ionic/angular';
import { Subject, Subscription, firstValueFrom } from 'rxjs';
import { filter, finalize, take, takeUntil, timeout } from 'rxjs/operators';
import { canUseMemberApp } from '../../core/auth/member-app-access';
import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { normalizePreferredLanguage } from '../../core/utils/language-preference';
import { PublicBranch } from '../../core/models/branch.model';
import { AppToastService } from '../../core/services/app-toast.service';
import {
  DonationCategory,
  DonationCheckoutRequest,
  DonationFrequency,
  DonationHostedCheckoutRequest,
  RecurringDonationCreateRequest,
} from '../../core/models/donation.model';
import { MemberRecentDonation, SavedChurch } from '../../core/models/user.model';
import { DonationFlowStateService } from '../../core/services/donation-flow-state.service';
import { DonationsService } from '../../core/services/donations.service';
import { AuthService } from '../../core/services/auth.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { PaymentSheetOutcome, StripePaymentService } from '../../core/services/stripe-payment.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { DonationAnalyticsContextService } from '../../core/services/donation-analytics-context.service';
import { HardwareBackCoordinatorService } from '../../core/services/hardware-back-coordinator.service';
import { OverlayDiagnosticsService } from '../../core/services/overlay-diagnostics.service';
import { DonateBranchSheetComponent } from './donate-branch-sheet.component';
import { OverlayStateController } from '../../core/utils/overlay-state.controller';

const EURO_SYMBOL = '\u20AC';
const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;
const CHECKOUT_TIMEOUT_MS = 15000;

function amountValidator(control: AbstractControl): ValidationErrors | null {
  const rawValue = String(control.value ?? '').trim();
  if (!rawValue) {
    return { required: true };
  }

  if (rawValue.endsWith('.')) {
    return { incompleteAmount: true };
  }

  if (!AMOUNT_PATTERN.test(rawValue)) {
    return { invalidAmount: true };
  }

  const decimalPart = rawValue.split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, DonateBranchSheetComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-donate',
  template: `
    <ion-page>
      <ion-content fullscreen class="donate-content cop-content--tabs" scrollY="true">
        <div class="donate-shell">
        <header class="cop-page-header donate-page-header" [attr.aria-label]="'donations.title' | t">
          <h1 class="cop-page-header__title">{{ 'donations.title' | t }}</h1>
          <p class="cop-page-header__subtitle">{{ 'donations.subtitle' | t }}</p>
        </header>

        <div class="surface donate-surface">
          <div class="surface__content">
              <div class="donate-form-card cop-card cop-card--soft">
              <section class="donate-branch-summary" aria-label="Selected church">
                <div class="donate-branch-summary__top" *ngIf="branch; else chooseChurchField">
                  <div class="donate-branch-summary__copy">
                    <p class="section-label donate-branch-summary__eyebrow">{{ 'donations.givingTo' | t }}</p>
                    <h2>{{ branch.name }}</h2>
                    <p class="donate-branch-summary__meta" *ngIf="branch.district || branch.area">
                      <ng-container *ngIf="branch.district?.name">
                        {{ branch.district?.name }} {{ 'donations.districtSuffix' | t }}
                      </ng-container>
                      <ng-container *ngIf="branch.district?.name && branch.area?.name">
                        <span aria-hidden="true">·</span>
                      </ng-container>
                      <ng-container *ngIf="branch.area?.name">
                        {{ branch.area?.name }} {{ 'donations.areaSuffix' | t }}
                      </ng-container>
                    </p>
                  </div>
                  <button
                    #churchSelectorTrigger
                    type="button"
                    class="donate-branch-summary__change"
                    [attr.aria-label]="'donations.changeChurchAria' | t"
                    (click)="openChurchSelector()"
                  >
                    {{ 'donations.changeChurch' | t }}
                  </button>
                </div>

                <ng-template #chooseChurchField>
                  <button
                    #churchSelectorTrigger
                    type="button"
                    class="donate-branch-selector"
                    [class.is-loading]="branchPrefillLoading"
                    [attr.aria-label]="'donations.openChurchSelectorAria' | t"
                    (click)="openChurchSelector()"
                  >
                    <span class="donate-branch-selector__icon" aria-hidden="true">
                      <ion-icon name="location-outline"></ion-icon>
                    </span>
                    <span class="donate-branch-selector__copy">
                      <span class="section-label donate-branch-summary__eyebrow">{{ 'donations.givingTo' | t }}</span>
                      <strong>{{ branchPrefillLoading ? ('donations.loadingChurches' | t) : ('donations.chooseChurch' | t) }}</strong>
                    </span>
                    <span class="donate-branch-selector__chevron" aria-hidden="true">
                      <ion-icon name="chevron-forward"></ion-icon>
                    </span>
                  </button>
                </ng-template>
              </section>

              <form [formGroup]="form" (ngSubmit)="submitDonation()" class="donate-form">
                <section *ngIf="branch" class="donate-form__section donate-form__section--donation-type donate-form__section--revealed">
                  <div class="section-label">{{ 'donations.donationType' | t }}</div>
                  <div *ngIf="categoriesLoading" class="category-chip-list category-chip-list--loading" aria-live="polite">
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
                    <p>{{ 'donations.noDonationTypes' | t }}</p>
                  </div>
                  <div
                    *ngIf="!categoriesLoading && !categoriesLoadError && categories.length > 0"
                    class="category-chip-list"
                    role="group"
                    [attr.aria-label]="'donations.donationTypeAria' | t"
                  >
                    <button
                      *ngFor="let option of categories"
                      type="button"
                      class="chip"
                      [class.selected]="isCategory(option.id)"
                      [attr.aria-pressed]="isCategory(option.id)"
                      [attr.aria-label]="('donations.donationType' | t) + ' ' + option.name"
                      (click)="setCategory(option.id)"
                    >
                      {{ option.name }}
                    </button>
                  </div>
                  <p *ngIf="categoryRecurringHelperMessage" class="frequency-helper">
                    {{ categoryRecurringHelperMessage }}
                  </p>
                </section>

                <section class="donate-form__section donate-form__section--amount">
                  <div class="section-label">{{ 'donations.amountLabel' | t }}</div>
                  <ion-item class="custom-amount" [class.is-valid]="isAmountValid" fill="solid">
                    <span class="amount-prefix" aria-hidden="true">&euro;</span>
                    <ion-input
                      #amountInput
                      type="text"
                      [value]="customAmountInputValue"
                      [placeholder]="'donations.amountPlaceholder' | t"
                      [attr.aria-label]="'donations.amountAria' | t"
                      inputmode="decimal"
                      autocomplete="off"
                      autocapitalize="off"
                      autocorrect="off"
                      spellcheck="false"
                      enterkeyhint="done"
                      (ionInput)="handleCustomAmountInput($event)"
                      (ionBlur)="handleCustomAmountBlur()"
                    ></ion-input>
                  </ion-item>
                  <ion-text color="danger" *ngIf="amountValidationMessage" class="form-error amount-error" role="alert">
                    {{ amountValidationMessage }}
                  </ion-text>
                </section>

                <section class="donate-form__section frequency-section">
                  <div class="section-label">{{ 'donations.frequencyLabel' | t }}</div>
                  <div class="frequency-cards" role="radiogroup" [attr.aria-label]="'donations.frequencyAria' | t">
                    <button
                      type="button"
                      class="frequency-card"
                      [class.selected]="frequency === 'one_time'"
                      [attr.aria-checked]="frequency === 'one_time'"
                      [attr.aria-label]="'donations.oneTime' | t"
                      role="radio"
                      (click)="setFrequency('one_time')"
                    >
                      <span class="frequency-leading" aria-hidden="true">
                        <span class="frequency-radio-indicator"></span>
                      </span>
                      <span class="frequency-copy">
                        <span class="frequency-title">{{ 'donations.oneTime' | t }}</span>
                        <span class="frequency-subtitle">{{ 'donations.oneTimeSubtitle' | t }}</span>
                      </span>
                    </button>

                    <button
                      *ngIf="showMonthlyOption"
                      type="button"
                      class="frequency-card"
                      [class.selected]="frequency === 'monthly'"
                      [class.disabled]="!canUseRecurring"
                      [attr.aria-checked]="frequency === 'monthly'"
                      [attr.aria-label]="'donations.monthly' | t"
                      role="radio"
                      (click)="handleMonthlySelection()"
                    >
                      <span class="frequency-leading" aria-hidden="true">
                        <span class="frequency-radio-indicator"></span>
                      </span>
                      <span class="frequency-copy">
                        <span class="frequency-title">{{ 'donations.monthly' | t }}</span>
                        <span class="frequency-subtitle">
                          {{
                            canUseRecurring
                              ? ('donations.monthlySubtitle' | t)
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
                      <span class="monthly-callout__title">{{ 'donations.monthlyMembersOnly' | t }}</span>
                      <span class="monthly-callout__link">{{ 'donations.monthlyPromptSignIn' | t }} →</span>
                    </span>
                  </button>
                </section>
                <section class="donate-form__section">
                  <div class="section-label">{{ 'donations.emailLabel' | t }}</div>
                <ion-item class="custom-email" fill="solid">
                  <ion-input
                    #emailInput
                    type="email"
                    [placeholder]="'donations.emailPlaceholder' | t"
                    [attr.aria-label]="'donations.emailAria' | t"
                    formControlName="donor_email"
                    inputmode="email"
                    autocomplete="email"
                    autocapitalize="off"
                    autocorrect="off"
                    spellcheck="false"
                    (ionInput)="handleEmailInput($event)"
                    (ionFocus)="handleEmailFocus()"
                  ></ion-input>
                </ion-item>
                </section>

                <ion-text color="danger" *ngIf="errorMessage" class="form-error" role="alert">
                  {{ errorMessage }}
                </ion-text>

                <p class="recurring-confirmation" *ngIf="showRecurringConfirmation">
                  {{ 'donations.recurringConfirmation' | t:{ amount: formattedValidAmount } }}
                </p>

                <ion-text color="danger" *ngIf="nativeError" class="form-error" role="alert">
                  {{ nativeError }}
                </ion-text>
                <div class="cta-shell">
                  <ion-button
                    type="submit"
                    expand="block"
                    class="cta"
                    [class.cta-enabled]="ctaEnabled"
                    [class.cta-monthly]="isMonthlySelected"
                    [disabled]="!ctaEnabled || nativeLoading || loading"
                  >
                    <ion-icon name="lock-closed" slot="start"></ion-icon>
                    <span class="cta-label">{{ ctaLabel }}</span>
                    <ion-spinner *ngIf="nativeLoading || loading" name="crescent" slot="start"></ion-spinner>
                  </ion-button>
                  <p class="trust-text">{{ 'donations.securePayment' | t }}</p>
                </div>
              </form>
              </div>
          </div>
        </div>
        </div>
      </ion-content>

      <app-donate-branch-sheet
        [isOpen]="isBranchSheetOpen"
        mode="donate"
        [savedBranches]="savedBranchesForSelector"
        [selectedBranchId]="branch?.id ?? null"
        (closeRequested)="handleBranchSheetCloseRequested()"
        (dismissed)="handleBranchSheetDismissed()"
        (branchSelected)="handleBranchSelected($event)"
      ></app-donate-branch-sheet>
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
  private readonly branchSheetState = new OverlayStateController();

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
  savedBranchesForSelector: PublicBranch[] = [];
  branchPrefillLoading = false;
  customAmountInputValue = '';
  private selectedFrequencyState: DonationFrequency = 'one_time';

  @ViewChild(IonContent) private content?: IonContent;
  @ViewChild('amountInput') private amountInput?: IonInput;
  @ViewChild('emailInput') private emailInput?: IonInput;
  @ViewChild('churchSelectorTrigger', { read: ElementRef })
  private churchSelectorTrigger?: ElementRef<HTMLElement>;
  @ViewChild(DonateBranchSheetComponent)
  private donateBranchSheet?: DonateBranchSheetComponent;

  private branchSub: Subscription;
  private readonly churchSelectorQueryParam = 'churchSelector';
  private pendingMobileDonationId?: number;
  private pendingRecurringDonationId?: number;
  private pendingTransactionReference?: string;
  private pendingFrequency?: DonationFrequency;
  private hasAutoFocusedAmount = false;
  private focusTimeoutId?: ReturnType<typeof setTimeout>;
  private hasPrefilledEmail = false;
  private emailWasAuthPrefilled = false;
  private lastAuthPrefilledEmail = '';
  memberProfileLoaded = !!this.authService.currentUserSnapshot;
  private resolvedMemberAppCapability = canUseMemberApp(this.authService.currentUserSnapshot);
  private readonly destroy$ = new Subject<void>();
  private lastTrackedDonationFormChurchId: number | null = null;
  private shouldRestoreChurchSelectorFocus = false;
  private savedBranchPrefillAttempted = false;
  private savedBranchPrefillInFlight = false;
  private unregisterHardwareBackSelector?: () => void;

  get isBranchSheetOpen(): boolean {
    return this.branchSheetState.isOpen;
  }

  set isBranchSheetOpen(value: boolean) {
    this.branchSheetState.sync(value);
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly donationsService: DonationsService,
    private readonly donationFlowState: DonationFlowStateService,
    private readonly authService: AuthService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly stripePaymentService: StripePaymentService,
    private readonly appToast: AppToastService,
    private readonly localeService: LocaleService,
    private readonly alertController: AlertController,
    private readonly sentryTelemetry: SentryTelemetryService,
    private readonly analyticsService: AnalyticsService,
    private readonly donationAnalyticsContext: DonationAnalyticsContextService,
    private readonly hardwareBackCoordinator: HardwareBackCoordinatorService,
    private readonly overlayDiagnostics: OverlayDiagnosticsService
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
        this.tryPrefillSavedBranch();
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
          if (!isAuthenticated) {
            this.memberProfileLoaded = false;
            this.resolvedMemberAppCapability = false;
            this.savedBranchPrefillAttempted = false;
            this.savedBranchPrefillInFlight = false;
            this.savedBranchesForSelector = [];
          this.branchPrefillLoading = false;
          this.ensureRecurringFrequencyAllowed();
          this.clearAuthPrefilledDonorEmail();
          return;
        }

        this.ensureMemberProfileResolved();
        this.ensureRecurringFrequencyAllowed();
        this.prefillDonorEmailOnce();
        this.tryPrefillSavedBranch();
      });

      this.authService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe((user) => {
          this.memberProfileLoaded = !!user;
          this.resolvedMemberAppCapability = canUseMemberApp(user);
          this.ensureRecurringFrequencyAllowed();
        });

    this.ensureMemberProfileResolved();
    this.prefillDonorEmailOnce();

    this.activatedRoute.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const shouldOpen = params.get(this.churchSelectorQueryParam) === '1';
      const changed = this.branchSheetState.sync(shouldOpen);
      if (changed) {
        this.overlayDiagnostics.capture('donate.church-selector.route-sync', { shouldOpen });
      }
    });
  }

  ngAfterViewInit(): void {
    this.unregisterHardwareBackSelector = this.hardwareBackCoordinator.registerSelectorHandler({
      isOpen: () => this.isBranchSheetOpen,
      handleBack: async () => this.donateBranchSheet?.handleHardwareBack() ?? false,
    });
    this.tryAutoFocusAmount();
  }

  ionViewWillEnter(): void {
    this.sentryTelemetry.addFeatureBreadcrumb('donations', 'Donation screen opened');
    this.ensureMemberProfileResolved();
    this.prefillDonorEmailOnce();
    this.tryPrefillSavedBranch();
    if (this.branch && !this.categoriesLoading && this.categories.length === 0 && !this.categoriesLoadError) {
      this.loadDonationCategories(this.branch.id);
    }
    this.trackDonationFormViewedIfNeeded();
    this.tryAutoFocusAmount();
  }

  submit(): void {
    if (this.loading || this.nativeLoading || !this.readyForPayment()) {
      return;
    }

    const payload = this.buildHostedCheckoutPayload();
    this.loading = true;
    this.errorMessage = undefined;
    this.nativeError = undefined;

    this.donationsService
      .createCheckout(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: response => {
          console.info('[DonatePage] Hosted checkout ready', {
            hasCheckoutUrl: !!response.checkout_url,
            transactionReference: response.transaction_reference,
          });
          this.persistOneTimeSummary(payload, response.transaction_reference);
          window.location.href = response.checkout_url;
        },
        error: error => {
          this.clearPendingPaymentState();
          this.errorMessage = this.resolveCheckoutErrorMessage(error, 'Unable to start checkout. Please try again.');
        },
      });
  }

  startNativePayment(): void {
    if (this.isMonthlySelected) {
      void this.startRecurringPayment();
      return;
    }

    if (this.shouldUseHostedCheckoutFallback()) {
      console.info('[DonatePage] PaymentSheet unavailable in browser runtime, using hosted checkout fallback');
      this.submit();
      return;
    }

    if (this.nativeLoading || this.loading || !this.readyForPayment()) {
      return;
    }

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
      .pipe(timeout(CHECKOUT_TIMEOUT_MS))
      .subscribe({
        next: async response => {
          console.info('[DonatePage] Native checkout created', {
            donationId: response.donation_id,
            hasClientSecret: !!response.client_secret?.trim(),
            transactionReference: response.transaction_reference,
            churchId: payload.church_id,
            categoryId: payload.category_id,
          });
          if (!response.client_secret?.trim()) {
            this.nativeLoading = false;
            this.clearPendingPaymentState();
            this.nativeError = this.localeService.translate('donations.failed.nativeStartError');
            return;
          }
          this.persistOneTimeSummary(payload, response.transaction_reference);
          this.pendingMobileDonationId = response.donation_id;
          this.pendingRecurringDonationId = undefined;
          this.pendingTransactionReference = response.transaction_reference;
          await this.presentPaymentSheet(response.client_secret);
        },
        error: error => {
          console.warn('[DonatePage] Native checkout failed', {
            churchId: payload.church_id,
            categoryId: payload.category_id,
            status: error instanceof HttpErrorResponse ? error.status : undefined,
          });
          void this.analyticsService.trackDonationPaymentFailed(analyticsContext, 'checkout_create');
          this.donationAnalyticsContext.clearContext();
          this.nativeLoading = false;
          this.clearPendingPaymentState();
          this.nativeError = this.resolveCheckoutErrorMessage(
            error,
            this.localeService.translate('donations.failed.nativeStartError')
          );
          void this.showPaymentFailureToast(this.nativeError);
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

    this.unregisterHardwareBackSelector?.();
    this.destroy$.next();
    this.destroy$.complete();
    this.branchSub.unsubscribe();
  }

  handlePaymentSheetOutcome(result: { status: PaymentSheetOutcome; errorMessage?: string }): void {
    if (result.status === 'completed') {
      const queryParams =
        this.pendingFrequency === 'monthly'
          ? { recurring_donation_id: this.pendingRecurringDonationId }
          : this.pendingMobileDonationId && this.pendingTransactionReference
            ? {
                donation_id: this.pendingMobileDonationId,
                transaction_reference: this.pendingTransactionReference,
              }
            : null;

      if (!queryParams) {
        this.nativeLoading = false;
        this.clearPendingPaymentState();
        this.nativeError = this.localeService.translate('donations.processing.handoffUnconfirmed');
        return;
      }

      void this.router.navigate(['/tabs/donate/success'], { queryParams, replaceUrl: true }).finally(() => {
        this.nativeLoading = false;
        this.clearPendingPaymentState();
      });
    } else if (result.status === 'canceled') {
      void this.router.navigate(['/tabs/donate/cancel'], { replaceUrl: true }).finally(() => {
        this.nativeLoading = false;
        this.clearPendingPaymentState();
      });
    } else {
      const analyticsContext = this.donationAnalyticsContext.peekContext();
      if (analyticsContext) {
        void this.analyticsService.trackDonationPaymentFailed(analyticsContext, 'payment_sheet');
      }
      this.donationAnalyticsContext.clearContext();
      this.nativeLoading = false;
      this.clearPendingPaymentState();
      this.nativeError = result.errorMessage ?? this.localeService.translate('donations.paymentFailed');
    }
  }

  goToBranches(): void {
    this.openChurchSelector();
  }

  openChurchSelector(): void {
    this.shouldRestoreChurchSelectorFocus = true;
    this.branchSheetState.openOverlay();
    this.overlayDiagnostics.capture('donate.church-selector.open');
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [this.churchSelectorQueryParam]: '1' },
      queryParamsHandling: 'merge',
    });
  }

  handleBranchSheetCloseRequested(): void {
    void this.closeChurchSelector();
  }

  handleBranchSheetDismissed(): void {
    this.branchSheetState.handleDidDismiss();
    this.overlayDiagnostics.capture('donate.church-selector.did-dismiss');
    this.restoreChurchSelectorFocusIfNeeded();
  }

  handleBranchSelected(branch: PublicBranch): void {
    if (this.branch?.id === branch.id) {
      this.closeChurchSelector();
      return;
    }

    if (!this.selectedBranchService.setBranch(branch)) {
      return;
    }

    void this.analyticsService.trackBranchSelected({
      church_id: branch.id,
      district_id: branch.district?.id ?? undefined,
      area_id: branch.area?.id ?? undefined,
      user_type: this.analyticsService.getUserType(),
    });

    this.closeChurchSelector();
  }

  setCategory(optionId: number): void {
    if (!this.categories.some((category) => category.id === optionId)) {
      return;
    }

    this.form.get('categoryId')?.setValue(optionId);
    this.errorMessage = undefined;
    this.nativeError = undefined;
    this.ensureRecurringFrequencyAllowed(true);
  }

  setFrequency(frequency: string): void {
    this.selectedFrequencyState = frequency === 'monthly' ? 'monthly' : 'one_time';
  }

  handleMonthlySelection(): void {
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

  private tryPrefillSavedBranch(): void {
    if (this.savedBranchPrefillAttempted || this.savedBranchPrefillInFlight || this.branch) {
      return;
    }

    if (!this.authService.isAuthenticatedSnapshot) {
      this.savedBranchPrefillAttempted = true;
      this.branchPrefillLoading = false;
      return;
    }

    this.savedBranchPrefillInFlight = true;
    this.branchPrefillLoading = true;

    this.authService.getSavedChurches().pipe(take(1), takeUntil(this.destroy$)).subscribe({
      next: (savedChurches) => {
        this.savedBranchPrefillAttempted = true;
        this.savedBranchPrefillInFlight = false;
        this.branchPrefillLoading = false;
        this.savedBranchesForSelector = this.resolveValidSavedBranches(savedChurches);

        if (this.branch) {
          return;
        }

        const resolvedBranch = this.resolveSavedBranchPrefill(savedChurches);
        if (resolvedBranch) {
          this.selectedBranchService.setBranch(resolvedBranch);
        }
      },
      error: () => {
        this.savedBranchPrefillAttempted = true;
        this.savedBranchPrefillInFlight = false;
        this.savedBranchesForSelector = [];
        this.branchPrefillLoading = false;
      },
    });
  }

  get ctaEnabled(): boolean {
    return !!this.branch && this.form.valid && !this.categoriesLoading && !this.categoriesLoadError && this.categories.length > 0;
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
    if (this.nativeLoading || this.loading) {
      return this.isMonthlySelected
        ? this.localeService.translate('donations.startingMonthlyGift')
        : this.localeService.translate('donations.ctaProcessing');
    }

    if (!this.branch) {
      return this.localeService.translate('donations.chooseChurchToContinue');
    }

    if (this.categoriesLoading) {
      return this.localeService.translate('donations.loadingCategories');
    }

    if (this.categoriesLoadError) {
      return this.localeService.translate('donations.retryCategoriesToContinue');
    }

    if (!this.categories.length) {
      return this.localeService.translate('donations.noCategoriesAvailableCta');
    }

    if (!this.selectedCategory) {
      return this.localeService.translate('donations.chooseTypeToContinue');
    }

    const amountControl = this.form.get('amount');
    if (!amountControl || amountControl.invalid) {
      return this.localeService.translate('donations.enterAmountToContinue');
    }

    const amount = Number(amountControl.value);
    return this.isMonthlySelected
      ? this.localeService.translate('donations.giveAmountMonthly', { amount: `${EURO_SYMBOL}${amount.toFixed(2)}` })
      : this.localeService.translate('donations.giveAmount', { amount: `${EURO_SYMBOL}${amount.toFixed(2)}` });
  }

  get showRecurringConfirmation(): boolean {
    return this.isMonthlySelected && this.isAmountValid;
  }

  get canUseRecurring(): boolean {
    return this.authService.isAuthenticatedSnapshot && this.resolvedMemberAppCapability;
  }

  get showMonthlyOption(): boolean {
    return this.authService.isAuthenticatedSnapshot && this.selectedCategoryAllowsRecurring;
  }

  get showGuestMonthlyPrompt(): boolean {
    return !this.authService.isAuthenticatedSnapshot && this.selectedCategoryAllowsRecurring;
  }

  get monthlyUnavailableMessage(): string {
    return this.localeService.translate('donations.monthlyMemberError');
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
      return this.localeService.translate('donations.enterAmountToContinue');
    }

    if (amountControl.hasError('greaterThanZero')) {
      return this.localeService.translate('donations.amountGreaterThanZero', { amount: `${EURO_SYMBOL}0` });
    }

    if (amountControl.hasError('incompleteAmount')) {
      return this.localeService.translate('donations.completeAmount');
    }

    if (amountControl.hasError('decimalPlaces')) {
      return this.localeService.translate('donations.twoDecimalPlaces');
    }

    if (amountControl.hasError('invalidAmount')) {
      return this.localeService.translate('donations.validEuroAmount');
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
      parts.push(`${branch.district.name} ${this.localeService.translate('donations.districtSuffix')}`);
    }
    if (branch.area?.name) {
      parts.push(`${branch.area.name} ${this.localeService.translate('donations.areaSuffix')}`);
    }
    return parts.join(' · ');
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

  private buildHostedCheckoutPayload(): DonationHostedCheckoutRequest {
    return {
      ...this.buildPayload(),
      locale: normalizePreferredLanguage(this.localeService.getCurrentLocale()),
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

  private persistOneTimeSummary(payload: DonationCheckoutRequest, transactionReference: string): void {
    this.donationFlowState.setSummary({
      branchName: this.branch?.name,
      branchId: this.branch?.id,
      category: this.selectedCategory?.name,
      amount: payload.amount,
      currency: 'EUR',
      donorEmail: payload.donor_email,
      transactionReference,
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
      branchId: this.branch?.id,
      category: this.selectedCategory?.name,
      amount: payload.amount,
      currency: 'EUR',
      interval: payload.interval,
      recurringDonationId,
      subscriptionId,
    });
  }

  private readyForPayment(): boolean {
    if (!this.branch) {
      this.errorMessage = this.localeService.translate('donations.chooseBranchError');
      return false;
    }

    if (!this.branch.is_active || !this.branch.donations_enabled) {
      this.errorMessage = this.localeService.translate('donations.branchUnavailableError');
      return false;
    }

    if (this.categoriesLoading) {
      this.errorMessage = this.localeService.translate('donations.typesLoadingError');
      return false;
    }

    if (this.categoriesLoadError) {
      this.errorMessage = this.localeService.translate('donations.typesRetryError');
      return false;
    }

    if (!this.categories.length) {
      this.errorMessage = this.localeService.translate('donations.typesMissingError');
      return false;
    }

    if (!this.selectedCategory) {
      this.errorMessage = this.localeService.translate('donations.chooseTypeError');
      return false;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = this.localeService.translate('donations.requiredFieldsError');
      return false;
    }

    return true;
  }

  private async startRecurringPayment(): Promise<void> {
    if (this.nativeLoading || this.loading) {
      return;
    }

    if (!this.canUseRecurring) {
      this.clearPendingPaymentState();
      this.selectedFrequencyState = 'one_time';
      this.nativeError = this.authService.isAuthenticatedSnapshot
        ? this.localeService.translate('donations.monthlyMemberError')
        : this.localeService.translate('donations.monthlySignInPrompt');
      void this.showMonthlyAccessToast();
      return;
    }

    if (!this.selectedCategoryAllowsRecurring) {
      this.clearPendingPaymentState();
      this.selectedFrequencyState = 'one_time';
      this.categoryRecurringHelperMessage = this.localeService.translate('donations.categoryRecurringUnavailable');
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
    const analyticsContext = this.buildAnalyticsContext('monthly');
    this.donationAnalyticsContext.setContext(analyticsContext);
    void this.analyticsService.trackDonationCheckoutStarted(analyticsContext);
    try {
      const recurringCreate$ = this.donationsService.createRecurringDonation(payload).pipe(timeout(CHECKOUT_TIMEOUT_MS));
      const response = await firstValueFrom(recurringCreate$);
      console.info('[DonatePage] Recurring checkout created', {
        recurringDonationId: response.recurring_donation_id,
        hasClientSecret: !!response.client_secret?.trim(),
        subscriptionId: !!response.subscription_id,
        churchId: payload.church_id,
        categoryId: payload.category_id,
      });
      this.pendingMobileDonationId = undefined;
      this.pendingRecurringDonationId = response.recurring_donation_id;
      this.persistRecurringSummary(payload, response.recurring_donation_id, response.subscription_id);
      if (!response.client_secret?.trim()) {
        this.clearPendingPaymentState();
        this.nativeLoading = false;
        this.nativeError = this.localeService.translate('donations.monthlyPaymentStartError');
        void this.showMonthlyClientSecretErrorToast();
        return;
      }
      await this.presentPaymentSheet(response.client_secret, true);
    } catch (error) {
      console.warn('[DonatePage] Recurring checkout failed', {
        churchId: payload.church_id,
        categoryId: payload.category_id,
        status: error instanceof HttpErrorResponse ? error.status : undefined,
      });
      void this.analyticsService.trackDonationPaymentFailed(analyticsContext, 'checkout_create');
      this.donationAnalyticsContext.clearContext();
      this.clearPendingPaymentState();
      this.nativeLoading = false;
      this.nativeError = this.resolveRecurringErrorMessage(error);
      void this.showRecurringCreateErrorToast(this.nativeError);
    }
  }

  private async presentPaymentSheet(clientSecret: string, isMonthly = false): Promise<void> {
    await this.ensureChurchSelectorClosed();
    console.info('[DonatePage] Presenting payment sheet', {
      flow: isMonthly ? 'monthly' : 'one_time',
    });
    const result = await this.stripePaymentService.presentPaymentSheet(
      clientSecret,
      isMonthly ? 'recurring' : 'one_time'
    );
    this.handlePaymentSheetOutcome(result);
  }

  private resolveRecurringErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const extractedError = this.extractApiErrorMessage(error.error);
      if (extractedError) {
        return extractedError;
      }

      if (error.status === 401) {
        return this.localeService.translate('donations.monthlySignInPrompt');
      }

      if (error.status === 403) {
        return extractedError ?? 'You do not have permission to use monthly giving for this account.';
      }

      if (error.status === 0) {
        return this.localeService.translate('donations.offlineError');
      }
    }

    if (this.isTimeoutError(error)) {
      return this.localeService.translate('donations.timeoutError');
    }

    return this.localeService.translate('donations.monthlyStartError');
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
        this.categoryRecurringHelperMessage = this.localeService.translate('donations.categoryRecurringUnavailable');
      }
    }
  }

  private async showMonthlyAccessToast(): Promise<void> {
    await this.appToast.warning(
      this.authService.isAuthenticatedSnapshot
        ? this.localeService.translate('donations.monthlyMemberError')
        : this.localeService.translate('donations.monthlySignInPrompt')
    );
  }

  async showMonthlyGivingPrompt(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.localeService.translate('donations.monthlyPromptTitle'),
      message: this.localeService.translate('donations.monthlyPromptMessage'),
      buttons: [
        {
          text: this.localeService.translate('donations.monthlyPromptSignIn'),
          handler: () => {
            void this.router.navigate(['/login']);
          },
        },
        {
          text: this.localeService.translate('donations.monthlyPromptCreateAccount'),
          handler: () => {
            void this.router.navigate(['/register']);
          },
        },
        {
          text: this.localeService.translate('common.cancel'),
          role: 'cancel',
        },
      ],
    });

    await alert.present();
  }

  private async showMonthlyClientSecretErrorToast(): Promise<void> {
    await this.appToast.error(this.localeService.translate('donations.monthlyPaymentStartError'));
  }

  private async showRecurringCreateErrorToast(message: string): Promise<void> {
    await this.appToast.error(message);
  }

  private ensureMemberProfileResolved(): void {
    if (!this.authService.isAuthenticatedSnapshot) {
      return;
    }

    if (this.memberProfileLoaded && this.resolvedMemberAppCapability) {
      return;
    }

    this.authService.getCurrentUser().pipe(take(1), takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        this.memberProfileLoaded = !!user;
        this.resolvedMemberAppCapability = canUseMemberApp(user);
        this.ensureRecurringFrequencyAllowed();
      },
      error: () => undefined,
    });
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

          this.categories = (categories ?? [])
            .filter((category) => !!category?.id && !!category?.name?.trim() && category.is_active !== false)
            .sort((left, right) =>
              left.sort_order === right.sort_order
                ? left.name.localeCompare(right.name)
                : left.sort_order - right.sort_order
            );
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

  private clearPendingPaymentState(): void {
    this.pendingMobileDonationId = undefined;
    this.pendingRecurringDonationId = undefined;
    this.pendingTransactionReference = undefined;
    this.pendingFrequency = undefined;
  }

  private resolveCheckoutErrorMessage(error: unknown, fallbackMessage: string): string {
    if (this.isTimeoutError(error)) {
      return this.localeService.translate('donations.timeoutError');
    }

    if (error instanceof HttpErrorResponse) {
      const extractedError = this.extractApiErrorMessage(error.error);
      if (extractedError) {
        return extractedError;
      }

      if (error.status === 0) {
        return this.localeService.translate('donations.offlineError');
      }
    }

    return fallbackMessage;
  }

  private isTimeoutError(error: unknown): boolean {
    return !!error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'TimeoutError';
  }

  private closeChurchSelector(): void {
    this.branchSheetState.closeOverlay();
    this.overlayDiagnostics.capture('donate.church-selector.close-requested');
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [this.churchSelectorQueryParam]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private async ensureChurchSelectorClosed(): Promise<void> {
    if (!this.isBranchSheetOpen) {
      return;
    }

    this.branchSheetState.closeOverlay();
    this.overlayDiagnostics.capture('donate.church-selector.ensure-closed');
    await this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [this.churchSelectorQueryParam]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private isNativePaymentSheetRuntime(): boolean {
    return Capacitor.isNativePlatform();
  }

  private shouldUseHostedCheckoutFallback(): boolean {
    return !this.isNativePaymentSheetRuntime() && !this.isMonthlySelected;
  }

  private async showPaymentFailureToast(message: string): Promise<void> {
    await this.appToast.error(message);
  }

  private restoreChurchSelectorFocusIfNeeded(): void {
    if (!this.shouldRestoreChurchSelectorFocus) {
      return;
    }

    this.shouldRestoreChurchSelectorFocus = false;
    setTimeout(() => {
      this.churchSelectorTrigger?.nativeElement.focus();
    }, 50);
  }

  private resolveSavedBranchPrefill(savedChurches: SavedChurch[]): PublicBranch | null {
    const validSavedBranches = this.resolveValidSavedBranches(savedChurches);

    if (!validSavedBranches.length) {
      return null;
    }

    const recentDonationBranch = this.resolveRecentDonationBranch(validSavedBranches);
    if (recentDonationBranch) {
      return recentDonationBranch;
    }

    return validSavedBranches[0];
  }

  private resolveValidSavedBranches(savedChurches: SavedChurch[]): PublicBranch[] {
    return (Array.isArray(savedChurches) ? savedChurches : [])
      .map((savedChurch) => this.toValidPublicBranch(savedChurch))
      .filter((branch): branch is PublicBranch => !!branch);
  }

  private resolveRecentDonationBranch(savedBranches: PublicBranch[]): PublicBranch | null {
    const recentDonations = Array.isArray(this.authService.currentUserSnapshot?.recent_donations)
      ? this.authService.currentUserSnapshot?.recent_donations ?? []
      : [];
    const recentDonationChurchId = recentDonations.find((donation) => donation.church?.id)?.church?.id;

    if (!recentDonationChurchId) {
      return null;
    }

    return savedBranches.find((branch) => branch.id === recentDonationChurchId) ?? null;
  }

  private toValidPublicBranch(savedChurch: SavedChurch | null | undefined): PublicBranch | null {
    const church = savedChurch?.church;
    if (!church?.id || !church.name?.trim()) {
      return null;
    }

    if (!church.is_active || !church.donations_enabled) {
      return null;
    }

    return {
      id: church.id,
      name: church.name.trim(),
      branch_code: church.branch_code || '',
      level: 'local',
      district: church.district ?? null,
      area: church.area ?? null,
      donations_enabled: church.donations_enabled,
      is_active: church.is_active,
    };
  }
}
