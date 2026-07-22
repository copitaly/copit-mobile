import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  PrayerCategory,
  PrayerRequestSubmissionPayload,
  PrayerScope,
  PrayerVisibility,
} from '../../core/models/prayer.model';
import { AuthService } from '../../core/services/auth.service';
import { PrayerService } from '../../core/services/prayer.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

function requiredTrimmedValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const value = String(control.value ?? '').trim();
    return value ? null : { requiredTrimmed: true };
  };
}

type FieldErrorMap = Record<string, string[]>;

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule, MobileHeaderComponent],
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

  readonly categoryOptions: Array<{ label: string; value: PrayerCategory }> = [
    { label: 'Personal', value: 'personal' },
    { label: 'Family', value: 'family' },
    { label: 'Health', value: 'health' },
    { label: 'Spiritual', value: 'spiritual' },
    { label: 'Work', value: 'work' },
    { label: 'Thanksgiving', value: 'thanksgiving' },
    { label: 'Other', value: 'other' },
  ];

  readonly scopeOptions: Array<{ label: string; value: PrayerScope; helper: string }> = [
    { label: 'Global', value: 'global', helper: 'For the whole Church of Pentecost Italy community.' },
    { label: 'Area', value: 'area', helper: 'Associated with a specific Area.' },
    { label: 'District', value: 'district', helper: 'Associated with a specific District.' },
    { label: 'Local Church', value: 'local', helper: 'Associated with a specific local branch.' },
  ];

  readonly visibilityOptions: Array<{ label: string; value: PrayerVisibility; helper: string }> = [
    {
      label: 'Private',
      value: 'private',
      helper: 'Only authorized church administrators or moderators can view this request.',
    },
    {
      label: 'Public',
      value: 'public',
      helper: 'After approval, this request may appear in Community Prayers.',
    },
  ];

  readonly hierarchyDependency = this.prayerService.hierarchyDependency;

  readonly form = this.formBuilder.group({
    request_text: ['', [requiredTrimmedValidator()]],
    title: [''],
    category: ['', [Validators.required]],
    scope: ['', [Validators.required]],
    selected_area_id: [null as number | null],
    selected_district_id: [null as number | null],
    selected_local_church_id: [null as number | null],
    visibility: ['private' as PrayerVisibility, [Validators.required]],
    is_anonymous_publicly: [true],
    submitter_name: [''],
  });

  isSubmitting = false;
  showSuccessState = false;
  genericErrorMessage = '';
  fieldErrors: FieldErrorMap = {};
  lastSubmittedVisibility: PrayerVisibility = 'private';
  isAuthenticatedUser = false;
  currentUserRole: string | null = null;
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.configureScopeValidators();
    this.configureSubmitterValidators();

    combineLatest([this.authService.isAuthenticated$, this.authService.currentUser$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([isAuthenticated, user]) => {
        this.isAuthenticatedUser = !!isAuthenticated;
        this.currentUserRole = user?.role ?? null;
        if (this.isAuthenticatedMember && this.isNamedSubmission && !this.form.controls.submitter_name.value) {
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
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isAuthenticatedMember(): boolean {
    return this.isAuthenticatedUser && this.currentUserRole === 'member';
  }

  get isNamedSubmission(): boolean {
    return !this.form.controls.is_anonymous_publicly.value;
  }

  get selectedScope(): PrayerScope | '' {
    return (this.form.controls.scope.value as PrayerScope | '') ?? '';
  }

  get submitButtonLabel(): string {
    return this.isSubmitting ? 'Submitting...' : 'Submit Prayer Request';
  }

  get scopeRequiresUnavailableHierarchy(): boolean {
    return this.selectedScope !== '' && this.selectedScope !== 'global' && !this.hierarchyDependency.available;
  }

  get canSubmit(): boolean {
    return !this.isSubmitting && !this.showSuccessState;
  }

  get successMessage(): string {
    if (this.lastSubmittedVisibility === 'public') {
      return 'Your request has been submitted for review. If approved, it may appear in Community Prayers.';
    }

    return 'Your request has been submitted for prayer and will remain private.';
  }

  get memberDisplayName(): string {
    const profile = this.authService.currentUserSnapshot;
    const fullName = profile?.full_name?.trim();
    if (fullName) {
      return fullName;
    }

    const composedName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
    return composedName;
  }

  onFieldInput(field: string): void {
    delete this.fieldErrors[field];
    if (field === 'request_text' || field === 'submitter_name') {
      this.form.controls[field as 'request_text' | 'submitter_name'].updateValueAndValidity({ emitEvent: false });
    }
    if (field === 'scope') {
      delete this.fieldErrors['selected_area_id'];
      delete this.fieldErrors['selected_district_id'];
      delete this.fieldErrors['selected_local_church_id'];
    }
    if (!Object.keys(this.fieldErrors).length) {
      this.genericErrorMessage = '';
    }
  }

  handleScopeChange(scope: PrayerScope | ''): void {
    if (scope === 'global') {
      this.clearHierarchySelections();
    }

    if (scope === 'area') {
      this.form.patchValue({ selected_district_id: null, selected_local_church_id: null }, { emitEvent: false });
    }

    if (scope === 'district') {
      this.form.patchValue({ selected_local_church_id: null }, { emitEvent: false });
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
  }

  onDistrictSelectionChanged(districtId: number | null): void {
    this.form.patchValue(
      {
        selected_district_id: districtId,
        selected_local_church_id: null,
      },
      { emitEvent: false }
    );
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

    if (this.scopeRequiresUnavailableHierarchy) {
      this.genericErrorMessage = this.hierarchyDependency.reason;
      return;
    }

    if (this.form.invalid) {
      this.genericErrorMessage = 'Please complete the required prayer request fields.';
      return;
    }

    this.isSubmitting = true;
    const payload = this.buildSubmissionPayload();

    this.prayerService.submitPrayerRequest(payload).subscribe({
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
          return 'Prayer request text is required.';
        case 'category':
          return 'Please choose a category.';
        case 'scope':
          return 'Please choose a prayer scope.';
        case 'submitter_name':
          return 'Your name is required when you choose to share it.';
        case 'selected_area_id':
          return 'Please select an Area.';
        case 'selected_district_id':
          return 'Please select a District.';
        case 'selected_local_church_id':
          return 'Please select a Local Church.';
        default:
          return 'This field is required.';
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

    if (this.isNamedSubmission) {
      submitterControl.setValidators([requiredTrimmedValidator()]);
      if (this.isAuthenticatedMember && !submitterControl.value && this.memberDisplayName) {
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
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        this.genericErrorMessage = 'You appear to be offline. Check your connection and try again.';
        return;
      }

      if (error.status === 400 && error.error && typeof error.error === 'object') {
        const payload = error.error as Record<string, unknown>;
        this.fieldErrors = this.extractFieldErrors(payload);
        this.genericErrorMessage =
          (typeof payload['detail'] === 'string' && payload['detail']) ||
          this.firstFieldError(this.fieldErrors) ||
          'Please review the highlighted fields and try again.';
        return;
      }

      if (typeof error.error?.detail === 'string' && error.error.detail) {
        this.genericErrorMessage = error.error.detail;
        return;
      }
    }

    this.genericErrorMessage = 'We could not submit your prayer request right now. Please try again.';
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
}
