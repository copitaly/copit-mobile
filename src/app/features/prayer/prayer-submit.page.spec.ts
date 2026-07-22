import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { PrayerRequestSubmissionResponse } from '../../core/models/prayer.model';
import { PrayerService } from '../../core/services/prayer.service';
import { PrayerSubmitPage } from './prayer-submit.page';

describe('PrayerSubmitPage', () => {
  let page: PrayerSubmitPage;
  let prayerService: jasmine.SpyObj<PrayerService>;
  let router: jasmine.SpyObj<Router>;
  let authState$: BehaviorSubject<boolean>;
  let currentUser$: BehaviorSubject<any>;
  let authServiceValue: any;

  const successResponse: PrayerRequestSubmissionResponse = {
    id: 44,
    scope: 'global',
    church: null,
    category: 'personal',
    title: '',
    request_text: 'Please pray for peace.',
    visibility: 'private',
    status: 'pending',
    is_anonymous_publicly: true,
    submitter_name: null,
    created_at: '2026-07-21T15:00:00Z',
  };

  function createPage(): PrayerSubmitPage {
    return TestBed.runInInjectionContext(() => new PrayerSubmitPage());
  }

  beforeEach(() => {
    prayerService = jasmine.createSpyObj<PrayerService>('PrayerService', ['submitPrayerRequest'], {
      hierarchyDependency: {
        available: false,
        reason: 'Area, district, and local prayer scopes need a public church hierarchy endpoint that is not available in the current backend.',
      },
    });
    prayerService.submitPrayerRequest.and.returnValue(of(successResponse));

    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));

    authState$ = new BehaviorSubject<boolean>(false);
    currentUser$ = new BehaviorSubject<any>(null);
    authServiceValue = {
      isAuthenticated$: authState$.asObservable(),
      currentUser$: currentUser$.asObservable(),
      currentUserSnapshot: null,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PrayerService, useValue: prayerService },
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authServiceValue },
      ],
    });

    page = createPage();
    page.ngOnInit();
  });

  afterEach(() => {
    page.ngOnDestroy();
  });

  it('requires prayer request text and rejects whitespace-only input', () => {
    page.form.patchValue({
      request_text: '   ',
      category: 'personal',
      scope: 'global',
    });

    page.submit();

    expect(page.controlError('request_text')).toBe('Prayer request text is required.');
    expect(prayerService.submitPrayerRequest).not.toHaveBeenCalled();
  });

  it('requires category and scope', () => {
    page.form.patchValue({
      request_text: 'Please pray for wisdom.',
      category: '',
      scope: '',
    });

    page.submit();

    expect(page.controlError('category')).toBe('Please choose a category.');
    expect(page.controlError('scope')).toBe('Please choose a prayer scope.');
  });

  it('global scope builds a payload with no usable church id', () => {
    page.form.patchValue({
      request_text: 'Please pray for wisdom.',
      category: 'personal',
      scope: 'global',
      visibility: 'private',
      is_anonymous_publicly: true,
    });

    expect(page.buildSubmissionPayload()).toEqual({
      scope: 'global',
      church_id: null,
      category: 'personal',
      title: undefined,
      request_text: 'Please pray for wisdom.',
      visibility: 'private',
      is_anonymous_publicly: true,
    });
  });

  it('area, district, and local payloads map the selected church ids', () => {
    page.form.patchValue({
      request_text: 'Please pray for wisdom.',
      category: 'family',
      visibility: 'public',
      is_anonymous_publicly: false,
      submitter_name: 'Kwame',
    });

    page.form.patchValue({ scope: 'area', selected_area_id: 10 });
    expect(page.buildSubmissionPayload().church_id).toBe(10);

    page.form.patchValue({ scope: 'district', selected_district_id: 20 });
    expect(page.buildSubmissionPayload().church_id).toBe(20);

    page.form.patchValue({ scope: 'local', selected_local_church_id: 30 });
    expect(page.buildSubmissionPayload().church_id).toBe(30);
  });

  it('changing area clears district and local selections', () => {
    page.form.patchValue({
      selected_area_id: 1,
      selected_district_id: 2,
      selected_local_church_id: 3,
    });

    page.onAreaSelectionChanged(99);

    expect(page.form.controls.selected_area_id.value).toBe(99);
    expect(page.form.controls.selected_district_id.value).toBeNull();
    expect(page.form.controls.selected_local_church_id.value).toBeNull();
  });

  it('changing district clears local selection', () => {
    page.form.patchValue({
      selected_district_id: 2,
      selected_local_church_id: 3,
    });

    page.onDistrictSelectionChanged(22);

    expect(page.form.controls.selected_district_id.value).toBe(22);
    expect(page.form.controls.selected_local_church_id.value).toBeNull();
  });

  it('switching to global clears all hierarchy selections', () => {
    page.form.patchValue({
      selected_area_id: 1,
      selected_district_id: 2,
      selected_local_church_id: 3,
    });

    page.handleScopeChange('global');

    expect(page.form.controls.selected_area_id.value).toBeNull();
    expect(page.form.controls.selected_district_id.value).toBeNull();
    expect(page.form.controls.selected_local_church_id.value).toBeNull();
  });

  it('guest anonymous submission does not require a name', () => {
    page.form.patchValue({
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'global',
      is_anonymous_publicly: true,
    });

    page.submit();

    expect(prayerService.submitPrayerRequest).toHaveBeenCalled();
    expect(prayerService.submitPrayerRequest.calls.mostRecent().args[0].submitter_name).toBeUndefined();
  });

  it('guest named submission requires a non-blank name and sends it', () => {
    page.form.patchValue({
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'global',
      is_anonymous_publicly: false,
      submitter_name: '   ',
    });

    page.submit();
    expect(page.controlError('submitter_name')).toBe('Your name is required when you choose to share it.');
    expect(prayerService.submitPrayerRequest).not.toHaveBeenCalled();

    page.form.patchValue({ submitter_name: 'Kwame' });
    page.submit();

    expect(prayerService.submitPrayerRequest.calls.mostRecent().args[0].submitter_name).toBe('Kwame');
  });

  it('member named submission defaults from the profile and can be edited', () => {
    authServiceValue.currentUserSnapshot = {
      first_name: 'Prayer',
      last_name: 'Member',
      full_name: 'Prayer Member',
    };
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    page.form.patchValue({
      is_anonymous_publicly: false,
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'global',
    });
    page['configureSubmitterValidators']();

    expect(page.form.controls.submitter_name.value).toBe('Prayer Member');

    page.form.patchValue({ submitter_name: 'Prayer Team' });
    expect(page.buildSubmissionPayload().submitter_name).toBe('Prayer Team');
  });

  it('member anonymous submission does not require a name', () => {
    authServiceValue.currentUserSnapshot = {
      first_name: 'Prayer',
      last_name: 'Member',
      full_name: 'Prayer Member',
    };
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    page.form.patchValue({
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'global',
      is_anonymous_publicly: true,
      submitter_name: '',
    });

    page.submit();

    expect(prayerService.submitPrayerRequest).toHaveBeenCalled();
    expect(prayerService.submitPrayerRequest.calls.mostRecent().args[0].submitter_name).toBeUndefined();
  });

  it('does not send protected backend fields', () => {
    page.form.patchValue({
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'global',
    });

    const payload = page.buildSubmissionPayload() as unknown as Record<string, unknown>;

    expect(payload['user']).toBeUndefined();
    expect(payload['user_id']).toBeUndefined();
    expect(payload['status']).toBeUndefined();
    expect(payload['moderated_by']).toBeUndefined();
    expect(payload['moderated_at']).toBeUndefined();
    expect(payload['resolved_at']).toBeUndefined();
  });

  it('prevents non-global submission because hierarchy is unavailable', () => {
    page.form.patchValue({
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'area',
    });

    page.submit();

    expect(page.genericErrorMessage).toContain('public church hierarchy endpoint');
    expect(prayerService.submitPrayerRequest).not.toHaveBeenCalled();
  });

  it('submits through the public prayer endpoint service and shows success state', () => {
    page.form.patchValue({
      request_text: 'Please pray for peace.',
      category: 'personal',
      scope: 'global',
      visibility: 'public',
    });

    page.submit();

    expect(prayerService.submitPrayerRequest).toHaveBeenCalled();
    expect(page.showSuccessState).toBeTrue();
    expect(page.successMessage).toContain('submitted for review');
  });

  it('keeps the submit button disabled while submitting and prevents double submit', () => {
    prayerService.submitPrayerRequest.and.returnValue(of(successResponse));
    page.form.patchValue({
      request_text: 'Please pray for peace.',
      category: 'personal',
      scope: 'global',
    });

    page.isSubmitting = true;
    page.submit();

    expect(prayerService.submitPrayerRequest).not.toHaveBeenCalled();
  });

  it('preserves form values after a failed submission and surfaces backend field errors', () => {
    prayerService.submitPrayerRequest.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { submitter_name: ['submitter_name is required for non-anonymous guest submissions.'] },
          })
      )
    );
    page.form.patchValue({
      request_text: 'Please pray for peace.',
      category: 'personal',
      scope: 'global',
      is_anonymous_publicly: false,
      submitter_name: 'Kwame',
    });

    page.submit();

    expect(page.form.controls.request_text.value).toBe('Please pray for peace.');
    expect(page.controlError('submitter_name')).toBe('submitter_name is required for non-anonymous guest submissions.');
    expect(page.showSuccessState).toBeFalse();
  });

  it('does not redirect guests or members away from the submit page', () => {
    authState$.next(false);
    currentUser$.next(null);
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    authState$.next(true);
    currentUser$.next({ role: 'member' });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
