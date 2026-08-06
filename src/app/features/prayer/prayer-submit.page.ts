import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';

import { canUseMemberApp } from '../../core/auth/member-app-access';
import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import {
  PublicChurchHierarchy,
  PrayerCategory,
  PrayerRequestSubmissionPayload,
  PrayerScope,
  PrayerVisibility,
} from '../../core/models/prayer.model';
import { MemberProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { HardwareBackCoordinatorService } from '../../core/services/hardware-back-coordinator.service';
import { PrayerService } from '../../core/services/prayer.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

function requiredTrimmedValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const value = String(control.value ?? '').trim();
    return value ? null : { requiredTrimmed: true };
  };
}

function trimmedMaxLengthValidator(maxLength: number): ValidatorFn {
  return (control: AbstractControl) => {
    const value = String(control.value ?? '').trim();
    return value.length > maxLength
      ? { maxlength: { requiredLength: maxLength, actualLength: value.length } }
      : null;
  };
}

type FieldErrorMap = Record<string, string[]>;

const MAX_TITLE_LENGTH = 255;
const MAX_SUBMITTER_NAME_LENGTH = 255;
const SUBMISSION_TIMEOUT_MS = 15000;

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, MobileHeaderComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-prayer-submit',
  templateUrl: './prayer-submit.page.html',
  styleUrls: ['./prayer-submit.page.scss'],
})
export class PrayerSubmitPage implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly prayerService = inject(PrayerService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly hardwareBackCoordinator = inject(HardwareBackCoordinatorService);
  private readonly localeService = inject(LocaleService);

  readonly categoryOptions: Array<{ label: string; value: PrayerCategory }> = [
    { label: 'prayer.personal', value: 'personal' },
    { label: 'prayer.family', value: 'family' },
    { label: 'prayer.health', value: 'health' },
    { label: 'prayer.spiritual', value: 'spiritual' },
    { label: 'prayer.work', value: 'work' },
    { label: 'prayer.thanksgiving', value: 'thanksgiving' },
    { label: 'prayer.other', value: 'other' },
  ];

  readonly scopeOptions: Array<{ label: string; value: PrayerScope; helper: string }> = [
    { label: 'prayer.everyone', value: 'global', helper: 'prayer.copItaly' },
    { label: 'prayer.myArea', value: 'area', helper: 'prayer.area' },
    { label: 'prayer.myDistrict', value: 'district', helper: 'prayer.district' },
    { label: 'prayer.myLocalChurch', value: 'local', helper: 'prayer.local' },
  ];

  readonly visibilityOptions: Array<{ label: string; value: PrayerVisibility; helper: string }> = [
    {
      label: 'prayer.visibilityPrivate',
      value: 'private',
      helper: 'prayer.visibilityPrivateHelp',
    },
    {
      label: 'prayer.visibilityPublic',
      value: 'public',
      helper: 'prayer.visibilityPublicHelp',
    },
  ];

  readonly maxTitleLength = MAX_TITLE_LENGTH;
  readonly maxSubmitterNameLength = MAX_SUBMITTER_NAME_LENGTH;

  readonly form = this.formBuilder.group({
    request_text: ['', [requiredTrimmedValidator()]],
    title: ['', [trimmedMaxLengthValidator(MAX_TITLE_LENGTH)]],
    category: ['', [Validators.required]],
    scope: ['', [Validators.required]],
    selected_area_id: [null as number | null],
    selected_district_id: [null as number | null],
    selected_local_church_id: [null as number | null],
    visibility: ['private' as PrayerVisibility, [Validators.required]],
    is_anonymous_publicly: [true],
    submitter_name: ['', [trimmedMaxLengthValidator(MAX_SUBMITTER_NAME_LENGTH)]],
  });

  isSubmitting = false;
  showSuccessState = false;
  genericErrorMessage = '';
  fieldErrors: FieldErrorMap = {};
  lastSubmittedVisibility: PrayerVisibility = 'private';
  isAuthenticatedUser = false;
  currentUserRole: string | null = null;
  areas: PublicChurchHierarchy[] = [];
  districts: PublicChurchHierarchy[] = [];
  localChurches: PublicChurchHierarchy[] = [];
  isAreasLoading = false;
  isDistrictsLoading = false;
  isLocalChurchesLoading = false;
  areaLoadError = '';
  districtLoadError = '';
  localChurchLoadError = '';
  private districtsRequestId = 0;
  private localChurchesRequestId = 0;
  private readonly destroy$ = new Subject<void>();
  private unregisterUnsavedChangesHandler?: () => void;

  ngOnInit(): void {
    this.unregisterUnsavedChangesHandler = this.hardwareBackCoordinator.registerUnsavedChangesHandler({
      isDirty: () => this.form.dirty && !this.showSuccessState && !this.isSubmitting,
    });
    this.configureScopeValidators();
    this.configureSubmitterValidators();
    this.loadAreas();

    combineLatest([this.authService.isAuthenticated$, this.authService.currentUser$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([isAuthenticated, user]) => {
        this.isAuthenticatedUser = !!isAuthenticated;
        this.currentUserRole = user?.role ?? null;
        if (this.isAuthenticatedMemberAppUser && this.isNamedSubmission && !this.form.controls.submitter_name.value) {
          this.form.controls.submitter_name.setValue(this.memberDisplayName);
        }
      });

    this.form.controls.scope.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((scope) => {
      this.handleScopeChange(scope as PrayerScope | '');
    });

    this.form.controls.is_anonymous_publicly.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.configureSubmitterValidators();
    });
  }

  ngOnDestroy(): void {
    this.unregisterUnsavedChangesHandler?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isAuthenticatedMemberAppUser(): boolean {
    return this.isAuthenticatedUser && canUseMemberApp(this.authService.currentUserSnapshot);
  }

  get isNamedSubmission(): boolean {
    return !this.form.controls.is_anonymous_publicly.value;
  }

  get selectedScope(): PrayerScope | '' {
    return (this.form.controls.scope.value as PrayerScope | '') ?? '';
  }

  get submitButtonLabel(): string {
    return this.isSubmitting
      ? this.localeService.translate('prayer.submittingButton')
      : this.localeService.translate('prayer.submitButton');
  }

  get canSubmit(): boolean {
    return !this.isSubmitting && !this.showSuccessState;
  }

  get showAreaSelector(): boolean {
    return this.selectedScope === 'area' || this.selectedScope === 'district' || this.selectedScope === 'local';
  }

  get showDistrictSelector(): boolean {
    return this.selectedScope === 'district' || this.selectedScope === 'local';
  }

  get showLocalChurchSelector(): boolean {
    return this.selectedScope === 'local';
  }

  get selectedAreaId(): number | null {
    return this.form.controls.selected_area_id.value;
  }

  get selectedDistrictId(): number | null {
    return this.form.controls.selected_district_id.value;
  }

  get successMessage(): string {
    if (this.lastSubmittedVisibility === 'public') {
      return this.localeService.translate('prayer.successPublicMessage');
    }

    return this.localeService.translate('prayer.successPrivateMessage');
  }

  get memberDisplayName(): string {
    return this.resolveProfileDisplayName(this.authService.currentUserSnapshot);
  }

  onFieldInput(field: string): void {
    delete this.fieldErrors[field];
    if (field === 'request_text' || field === 'submitter_name' || field === 'title') {
      this.form.controls[field as 'request_text' | 'submitter_name' | 'title'].updateValueAndValidity({ emitEvent: false });
    }
    if (field === 'scope') {
      delete this.fieldErrors['selected_area_id'];
      delete this.fieldErrors['selected_district_id'];
      delete this.fieldErrors['selected_local_church_id'];
    }
    if (field === 'selected_area_id' || field === 'selected_district_id' || field === 'selected_local_church_id') {
      delete this.fieldErrors[field];
    }
    if (!Object.keys(this.fieldErrors).length) {
      this.genericErrorMessage = '';
    }
  }

  handleScopeChange(scope: PrayerScope | ''): void {
    if (scope === 'global') {
      this.clearHierarchySelections();
      this.clearDistrictState();
      this.clearLocalChurchState();
    }

    if (scope === 'area') {
      this.form.patchValue({ selected_district_id: null, selected_local_church_id: null }, { emitEvent: false });
      this.clearDistrictState();
      this.clearLocalChurchState();
    }

    if (scope === 'district') {
      this.form.patchValue({ selected_local_church_id: null }, { emitEvent: false });
      this.clearLocalChurchState();
      if (this.selectedAreaId && !this.districts.length && !this.isDistrictsLoading) {
        this.loadDistricts(this.selectedAreaId);
      }
    }

    if (scope === 'local') {
      if (this.selectedAreaId && !this.districts.length && !this.isDistrictsLoading) {
        this.loadDistricts(this.selectedAreaId);
      }
      if (this.selectedDistrictId && !this.localChurches.length && !this.isLocalChurchesLoading) {
        this.loadLocalChurches(this.selectedDistrictId);
      }
    }

    this.configureScopeValidators();
    delete this.fieldErrors['selected_area_id'];
    delete this.fieldErrors['selected_district_id'];
    delete this.fieldErrors['selected_local_church_id'];
  }

  onAreaSelectionChanged(areaId: number | null): void {
    this.form.patchValue(
      {
        selected_area_id: areaId,
        selected_district_id: null,
        selected_local_church_id: null,
      },
      { emitEvent: false }
    );
    this.clearDistrictState();
    this.clearLocalChurchState();
    this.onFieldInput('selected_area_id');

    if (areaId && (this.selectedScope === 'district' || this.selectedScope === 'local')) {
      this.loadDistricts(areaId);
    }
  }

  onDistrictSelectionChanged(districtId: number | null): void {
    this.form.patchValue(
      {
        selected_district_id: districtId,
        selected_local_church_id: null,
      },
      { emitEvent: false }
    );
    this.clearLocalChurchState();
    this.onFieldInput('selected_district_id');

    if (districtId && this.selectedScope === 'local') {
      this.loadLocalChurches(districtId);
    }
  }

  onLocalChurchSelectionChanged(localChurchId: number | null): void {
    this.form.patchValue({ selected_local_church_id: localChurchId }, { emitEvent: false });
    this.onFieldInput('selected_local_church_id');
  }

  buildSubmissionPayload(): PrayerRequestSubmissionPayload {
    const formValue = this.form.getRawValue();
    const title = (formValue.title ?? '').trim();
    const submitterName = (formValue.submitter_name ?? '').trim();

    return {
      scope: formValue.scope as PrayerScope,
      church_id: this.resolveSelectedChurchId(),
      category: formValue.category as PrayerCategory,
      title: title || undefined,
      request_text: (formValue.request_text ?? '').trim(),
      visibility: formValue.visibility as PrayerVisibility,
      is_anonymous_publicly: !!formValue.is_anonymous_publicly,
      ...(submitterName ? { submitter_name: submitterName } : {}),
    };
  }

  submit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.genericErrorMessage = '';
    this.fieldErrors = {};
    this.configureScopeValidators();
    this.configureSubmitterValidators();
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity({ emitEvent: false });

    if (this.form.invalid) {
      this.genericErrorMessage = this.localeService.translate('prayer.formIncomplete');
      this.focusFirstInvalidField();
      return;
    }

    this.isSubmitting = true;
    const payload = this.buildSubmissionPayload();

    this.prayerService
      .submitPrayerRequest(payload)
      .pipe(timeout(SUBMISSION_TIMEOUT_MS))
      .subscribe({
      next: () => {
        this.isSubmitting = false;
        this.lastSubmittedVisibility = payload.visibility;
        this.showSuccessState = true;
      },
      error: (error) => {
        this.isSubmitting = false;
        this.applySubmissionError(error);
      },
      });
  }

  resetForAnotherRequest(): void {
    this.showSuccessState = false;
    this.genericErrorMessage = '';
    this.fieldErrors = {};
    this.form.reset({
      request_text: '',
      title: '',
      category: '',
      scope: '',
      selected_area_id: null,
      selected_district_id: null,
      selected_local_church_id: null,
      visibility: 'private',
      is_anonymous_publicly: true,
      submitter_name: '',
    });
    this.configureScopeValidators();
    this.configureSubmitterValidators();
  }

  goBackToPrayer(): void {
    void this.router.navigateByUrl('/prayer');
  }

  goToMyPrayerRequests(): void {
    void this.router.navigateByUrl('/prayer/my-requests');
  }

  retryAreaLoad(): void {
    this.loadAreas();
  }

  retryDistrictLoad(): void {
    if (this.selectedAreaId) {
      this.loadDistricts(this.selectedAreaId);
    }
  }

  retryLocalChurchLoad(): void {
    if (this.selectedDistrictId) {
      this.loadLocalChurches(this.selectedDistrictId);
    }
  }

  controlError(controlName: string): string {
    if (this.fieldErrors[controlName]?.length) {
      return this.fieldErrors[controlName][0];
    }

    const control = this.form.controls[controlName as keyof typeof this.form.controls];
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required'] || control.errors['requiredTrimmed']) {
      switch (controlName) {
        case 'request_text':
          return this.localeService.translate('prayer.requestTextRequired');
        case 'category':
          return this.localeService.translate('prayer.categoryRequired');
        case 'scope':
          return this.localeService.translate('prayer.scopeRequired');
        case 'submitter_name':
          return this.localeService.translate('prayer.nameRequired');
        case 'title':
          return this.localeService.translate('prayer.titleTooLong', { count: MAX_TITLE_LENGTH });
        case 'selected_area_id':
          return this.localeService.translate('prayer.selectAreaRequired');
        case 'selected_district_id':
          return this.localeService.translate('prayer.selectDistrictRequired');
        case 'selected_local_church_id':
          return this.localeService.translate('prayer.selectLocalRequired');
        default:
          return 'This field is required.';
      }
    }

    if (control.errors['maxlength']) {
      if (controlName === 'title') {
        return this.localeService.translate('prayer.titleTooLong', { count: MAX_TITLE_LENGTH });
      }

      if (controlName === 'submitter_name') {
        return this.localeService.translate('prayer.nameTooLong', { count: MAX_SUBMITTER_NAME_LENGTH });
      }
    }

    return '';
  }

  private clearHierarchySelections(): void {
    this.form.patchValue(
      {
        selected_area_id: null,
        selected_district_id: null,
        selected_local_church_id: null,
      },
      { emitEvent: false }
    );
  }

  private clearDistrictState(): void {
    this.districts = [];
    this.isDistrictsLoading = false;
    this.districtLoadError = '';
  }

  private clearLocalChurchState(): void {
    this.localChurches = [];
    this.isLocalChurchesLoading = false;
    this.localChurchLoadError = '';
  }

  private loadAreas(): void {
    this.isAreasLoading = true;
    this.areaLoadError = '';

    this.prayerService.getPublicChurches('area').subscribe({
      next: (areas) => {
        this.areas = areas;
        this.isAreasLoading = false;
      },
      error: () => {
        this.areas = [];
        this.isAreasLoading = false;
        this.areaLoadError = this.localeService.translate('prayer.loadAreasError');
      },
    });
  }

  private loadDistricts(areaId: number): void {
    const requestId = ++this.districtsRequestId;
    this.isDistrictsLoading = true;
    this.districtLoadError = '';

    this.prayerService.getPublicChurches('district', areaId).subscribe({
      next: (districts) => {
        if (requestId !== this.districtsRequestId || this.selectedAreaId !== areaId) {
          return;
        }

        this.districts = districts;
        this.isDistrictsLoading = false;
      },
      error: () => {
        if (requestId !== this.districtsRequestId || this.selectedAreaId !== areaId) {
          return;
        }

        this.districts = [];
        this.isDistrictsLoading = false;
        this.districtLoadError = this.localeService.translate('prayer.loadDistrictsError');
      },
    });
  }

  private loadLocalChurches(districtId: number): void {
    const requestId = ++this.localChurchesRequestId;
    this.isLocalChurchesLoading = true;
    this.localChurchLoadError = '';

    this.prayerService.getPublicChurches('local', districtId).subscribe({
      next: (localChurches) => {
        if (requestId !== this.localChurchesRequestId || this.selectedDistrictId !== districtId) {
          return;
        }

        this.localChurches = localChurches;
        this.isLocalChurchesLoading = false;
      },
      error: () => {
        if (requestId !== this.localChurchesRequestId || this.selectedDistrictId !== districtId) {
          return;
        }

        this.localChurches = [];
        this.isLocalChurchesLoading = false;
        this.localChurchLoadError = this.localeService.translate('prayer.loadLocalChurchesError');
      },
    });
  }

  private configureScopeValidators(): void {
    const scope = this.selectedScope;
    const areaControl = this.form.controls.selected_area_id;
    const districtControl = this.form.controls.selected_district_id;
    const localControl = this.form.controls.selected_local_church_id;

    areaControl.clearValidators();
    districtControl.clearValidators();
    localControl.clearValidators();

    if (scope === 'area' || scope === 'district' || scope === 'local') {
      areaControl.setValidators([Validators.required]);
    }

    if (scope === 'district' || scope === 'local') {
      districtControl.setValidators([Validators.required]);
    }

    if (scope === 'local') {
      localControl.setValidators([Validators.required]);
    }

    areaControl.updateValueAndValidity({ emitEvent: false });
    districtControl.updateValueAndValidity({ emitEvent: false });
    localControl.updateValueAndValidity({ emitEvent: false });
  }

  private configureSubmitterValidators(): void {
    const submitterControl = this.form.controls.submitter_name;
    submitterControl.clearValidators();
    submitterControl.setValidators([trimmedMaxLengthValidator(MAX_SUBMITTER_NAME_LENGTH)]);

    if (this.isNamedSubmission) {
      submitterControl.addValidators([requiredTrimmedValidator()]);
      if (this.isAuthenticatedMemberAppUser && !submitterControl.value && this.memberDisplayName) {
        submitterControl.setValue(this.memberDisplayName, { emitEvent: false });
      }
    }

    submitterControl.updateValueAndValidity({ emitEvent: false });
  }

  private resolveSelectedChurchId(): number | null {
    switch (this.selectedScope) {
      case 'area':
        return this.form.controls.selected_area_id.value;
      case 'district':
        return this.form.controls.selected_district_id.value;
      case 'local':
        return this.form.controls.selected_local_church_id.value;
      default:
        return null;
    }
  }

  private applySubmissionError(error: unknown): void {
    if (this.isTimeoutError(error)) {
      this.genericErrorMessage = this.localeService.translate('prayer.submitTimeout');
      return;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        this.genericErrorMessage = this.localeService.translate('prayer.submitOffline');
        return;
      }

      if (error.status === 401 || error.status === 403) {
        this.genericErrorMessage = this.localeService.translate('prayer.submitAuthError');
        return;
      }

      if (error.status === 400 && error.error && typeof error.error === 'object') {
        const payload = error.error as Record<string, unknown>;
        this.fieldErrors = this.extractFieldErrors(payload);
        this.genericErrorMessage =
          (typeof payload['detail'] === 'string' && payload['detail']) ||
          this.firstFieldError(this.fieldErrors) ||
          this.localeService.translate('prayer.submitValidationFallback');
        return;
      }

      if (typeof error.error?.detail === 'string' && error.error.detail) {
        this.genericErrorMessage = error.error.detail;
        return;
      }
    }

    this.genericErrorMessage = this.localeService.translate('prayer.submitFailed');
  }

  private extractFieldErrors(payload: Record<string, unknown>): FieldErrorMap {
    const fieldErrors: FieldErrorMap = {};
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'detail') {
        continue;
      }

      if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        fieldErrors[key] = value as string[];
      } else if (typeof value === 'string') {
        fieldErrors[key] = [value];
      }
    }
    return fieldErrors;
  }

  private firstFieldError(errors: FieldErrorMap): string {
    const firstKey = Object.keys(errors)[0];
    return firstKey ? errors[firstKey][0] : '';
  }

  private resolveProfileDisplayName(profile: MemberProfile | null): string {
    const fullName = profile?.full_name?.trim();
    if (fullName) {
      return fullName;
    }

    const composedName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
    if (composedName) {
      return composedName;
    }

    return '';
  }

  private focusFirstInvalidField(): void {
    const controlOrder: Array<keyof typeof this.form.controls> = [
      'request_text',
      'title',
      'category',
      'scope',
      'selected_area_id',
      'selected_district_id',
      'selected_local_church_id',
      'submitter_name',
    ];

    const targetIdMap: Partial<Record<keyof typeof this.form.controls, string>> = {
      request_text: 'prayer-request-text',
      title: 'prayer-title',
      category: 'prayer-category',
      scope: 'prayer-scope',
      submitter_name: 'prayer-submitter-name',
    };

    const firstInvalid = controlOrder.find((name) => this.form.controls[name].invalid);
    const targetId = firstInvalid ? targetIdMap[firstInvalid] : null;
    if (!targetId) {
      return;
    }

    queueMicrotask(() => {
      const focusTarget = document.getElementById(targetId) as { setFocus?: () => Promise<void> | void; focus?: () => void } | null;
      if (focusTarget?.setFocus) {
        void focusTarget.setFocus();
        return;
      }
      focusTarget?.focus?.();
    });
  }

  private isTimeoutError(error: unknown): boolean {
    return error instanceof Error && error.name === 'TimeoutError';
  }
}
