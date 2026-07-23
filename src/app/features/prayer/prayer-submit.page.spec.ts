import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { PrayerRequestSubmissionResponse, PublicChurchHierarchy } from '../../core/models/prayer.model';
import { PrayerService } from '../../core/services/prayer.service';
import { PrayerSubmitPage } from './prayer-submit.page';

describe('PrayerSubmitPage', () => {
  let page: PrayerSubmitPage;
  let prayerService: jasmine.SpyObj<PrayerService>;
  let router: jasmine.SpyObj<Router>;
  let authState$: BehaviorSubject<boolean>;
  let currentUser$: BehaviorSubject<any>;
  let authServiceValue: any;
  let areaChurch: PublicChurchHierarchy;
  let districtChurch: PublicChurchHierarchy;
  let localChurch: PublicChurchHierarchy;

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

  async function createComponent(): Promise<ComponentFixture<PrayerSubmitPage>> {
    const fixture = TestBed.createComponent(PrayerSubmitPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    areaChurch = {
      id: 10,
      name: 'Roma Area',
      level: 'area',
      parent: null,
      district: null,
      area: null,
      is_active: true,
    };
    districtChurch = {
      id: 20,
      name: 'Roma Centro',
      level: 'district',
      parent: { id: 10, name: 'Roma Area', level: 'area' },
      district: null,
      area: { id: 10, name: 'Roma Area', level: 'area' },
      is_active: true,
    };
    localChurch = {
      id: 30,
      name: 'Roma Central Assembly',
      level: 'local',
      parent: { id: 20, name: 'Roma Centro', level: 'district' },
      district: { id: 20, name: 'Roma Centro', level: 'district' },
      area: { id: 10, name: 'Roma Area', level: 'area' },
      is_active: true,
    };

    prayerService = jasmine.createSpyObj<PrayerService>('PrayerService', ['submitPrayerRequest', 'getPublicChurches'], {
      hierarchyDependency: {
        available: true,
        reason: '',
      },
    });
    prayerService.submitPrayerRequest.and.returnValue(of(successResponse));
    prayerService.getPublicChurches.and.callFake((level: 'area' | 'district' | 'local', parentId?: number) => {
      if (level === 'area') {
        return of([areaChurch]);
      }
      if (level === 'district') {
        return of(parentId === 10 ? [districtChurch] : []);
      }
      return of(parentId === 20 ? [localChurch] : []);
    });

    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));

    authState$ = new BehaviorSubject<boolean>(false);
    currentUser$ = new BehaviorSubject<any>(null);
    authServiceValue = {
      isAuthenticated$: authState$.asObservable(),
      currentUser$: currentUser$.asObservable(),
      currentUserSnapshot: null,
      updateMemberProfile: jasmine.createSpy('updateMemberProfile'),
    };

    TestBed.configureTestingModule({
      imports: [PrayerSubmitPage],
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

  it('loads areas from the public churches endpoint on init', () => {
    expect(prayerService.getPublicChurches).toHaveBeenCalledWith('area');
    expect(page.areas).toEqual([areaChurch]);
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
    expect(page.districts).toEqual([]);
    expect(page.localChurches).toEqual([]);
  });

  it('changing district clears local selection', () => {
    page.form.patchValue({
      selected_district_id: 2,
      selected_local_church_id: 3,
    });

    page.onDistrictSelectionChanged(22);

    expect(page.form.controls.selected_district_id.value).toBe(22);
    expect(page.form.controls.selected_local_church_id.value).toBeNull();
    expect(page.localChurches).toEqual([]);
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

  it('shows no hierarchy selectors for global scope', () => {
    page.form.patchValue({ scope: 'global' });
    page.handleScopeChange('global');

    expect(page.showAreaSelector).toBeFalse();
    expect(page.showDistrictSelector).toBeFalse();
    expect(page.showLocalChurchSelector).toBeFalse();
  });

  it('shows the area selector for area scope and requires an area', () => {
    page.form.patchValue({ request_text: 'Please pray.', category: 'personal', scope: 'area' });
    page.submit();

    expect(page.showAreaSelector).toBeTrue();
    expect(page.controlError('selected_area_id')).toBe('Please select an Area.');
  });

  it('area submission uses the selected area id', () => {
    page.form.patchValue({
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'area',
      selected_area_id: 10,
    });

    page.submit();

    expect(prayerService.submitPrayerRequest.calls.mostRecent().args[0].church_id).toBe(10);
  });

  it('shows area and district for district scope and keeps district unavailable before area selection', () => {
    page.form.patchValue({ scope: 'district' });
    page.handleScopeChange('district');

    expect(page.showAreaSelector).toBeTrue();
    expect(page.showDistrictSelector).toBeTrue();
    expect(page.selectedAreaId).toBeNull();
    expect(page.districts).toEqual([]);
  });

  it('selecting an area loads districts for that area', () => {
    page.form.patchValue({ scope: 'district' });

    page.onAreaSelectionChanged(10);

    expect(prayerService.getPublicChurches).toHaveBeenCalledWith('district', 10);
    expect(page.districts).toEqual([districtChurch]);
  });

  it('district scope requires a district and submits the selected district id', () => {
    page.form.patchValue({
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'district',
      selected_area_id: 10,
    });
    page.submit();
    expect(page.controlError('selected_district_id')).toBe('Please select a District.');

    page.form.patchValue({ selected_district_id: 20 });
    page.submit();
    expect(prayerService.submitPrayerRequest.calls.mostRecent().args[0].church_id).toBe(20);
  });

  it('shows local hierarchy and loads local churches from the selected district', () => {
    page.form.patchValue({ scope: 'local' });
    page.onAreaSelectionChanged(10);
    page.onDistrictSelectionChanged(20);

    expect(page.showLocalChurchSelector).toBeTrue();
    expect(prayerService.getPublicChurches).toHaveBeenCalledWith('local', 20);
    expect(page.localChurches).toEqual([localChurch]);
  });

  it('local scope requires a local church and submits the selected local church id', () => {
    page.form.patchValue({
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'local',
      selected_area_id: 10,
      selected_district_id: 20,
    });
    page.submit();
    expect(page.controlError('selected_local_church_id')).toBe('Please select a Local Church.');

    page.form.patchValue({ selected_local_church_id: 30 });
    page.submit();
    expect(prayerService.submitPrayerRequest.calls.mostRecent().args[0].church_id).toBe(30);
  });

  it('changing scope to area clears district and local selections', () => {
    page.form.patchValue({
      selected_area_id: 10,
      selected_district_id: 20,
      selected_local_church_id: 30,
    });

    page.handleScopeChange('area');

    expect(page.form.controls.selected_district_id.value).toBeNull();
    expect(page.form.controls.selected_local_church_id.value).toBeNull();
  });

  it('stale district responses do not populate the wrong area', () => {
    const areaOneDistricts$ = new Subject<PublicChurchHierarchy[]>();
    const areaTwoDistricts$ = new Subject<PublicChurchHierarchy[]>();
    prayerService.getPublicChurches.and.callFake((level: 'area' | 'district' | 'local', parentId?: number) => {
      if (level === 'area') {
        return of([areaChurch, { ...areaChurch, id: 11, name: 'Milano Area' }]);
      }
      if (level === 'district' && parentId === 10) {
        return areaOneDistricts$.asObservable();
      }
      if (level === 'district' && parentId === 11) {
        return areaTwoDistricts$.asObservable();
      }
      return of([]);
    });

    page.ngOnDestroy();
    page = createPage();
    page.ngOnInit();

    page.form.patchValue({ scope: 'district' });
    page.onAreaSelectionChanged(10);
    page.onAreaSelectionChanged(11);
    areaOneDistricts$.next([districtChurch]);
    areaTwoDistricts$.next([{ ...districtChurch, id: 21, name: 'Milano Centro', parent: { id: 11, name: 'Milano Area', level: 'area' } }]);

    expect(page.selectedAreaId).toBe(11);
    expect(page.districts.map((district) => district.id)).toEqual([21]);
  });

  it('stale local responses do not populate the wrong district', () => {
    const localOne$ = new Subject<PublicChurchHierarchy[]>();
    const localTwo$ = new Subject<PublicChurchHierarchy[]>();
    prayerService.getPublicChurches.and.callFake((level: 'area' | 'district' | 'local', parentId?: number) => {
      if (level === 'area') {
        return of([areaChurch]);
      }
      if (level === 'district') {
        return of([districtChurch, { ...districtChurch, id: 21, name: 'Roma Sud' }]);
      }
      if (level === 'local' && parentId === 20) {
        return localOne$.asObservable();
      }
      if (level === 'local' && parentId === 21) {
        return localTwo$.asObservable();
      }
      return of([]);
    });

    page.ngOnDestroy();
    page = createPage();
    page.ngOnInit();

    page.form.patchValue({ scope: 'local' });
    page.onAreaSelectionChanged(10);
    page.onDistrictSelectionChanged(20);
    page.onDistrictSelectionChanged(21);
    localOne$.next([localChurch]);
    localTwo$.next([{ ...localChurch, id: 31, name: 'Roma Sud Assembly', parent: { id: 21, name: 'Roma Sud', level: 'district' } }]);

    expect(page.selectedDistrictId).toBe(21);
    expect(page.localChurches.map((church) => church.id)).toEqual([31]);
  });

  it('tracks area loading state and preserves global submission if area loading fails', () => {
    prayerService.getPublicChurches.and.returnValue(throwError(() => new Error('network')));
    page.ngOnDestroy();
    page = createPage();
    page.ngOnInit();

    expect(page.areaLoadError).toContain("couldn't load Areas");
    page.form.patchValue({ request_text: 'Please pray.', category: 'personal', scope: 'global' });
    page.submit();
    expect(prayerService.submitPrayerRequest).toHaveBeenCalled();
  });

  it('preserves the selected area when district loading fails', () => {
    prayerService.getPublicChurches.and.callFake((level: 'area' | 'district' | 'local') => {
      if (level === 'area') {
        return of([areaChurch]);
      }
      return throwError(() => new Error('network'));
    });
    page.ngOnDestroy();
    page = createPage();
    page.ngOnInit();

    page.form.patchValue({ scope: 'district' });
    page.onAreaSelectionChanged(10);

    expect(page.selectedAreaId).toBe(10);
    expect(page.districtLoadError).toContain("couldn't load Districts");
  });

  it('preserves the selected district when local church loading fails', () => {
    prayerService.getPublicChurches.and.callFake((level: 'area' | 'district' | 'local') => {
      if (level === 'area') {
        return of([areaChurch]);
      }
      if (level === 'district') {
        return of([districtChurch]);
      }
      return throwError(() => new Error('network'));
    });
    page.ngOnDestroy();
    page = createPage();
    page.ngOnInit();

    page.form.patchValue({ scope: 'local' });
    page.onAreaSelectionChanged(10);
    page.onDistrictSelectionChanged(20);

    expect(page.selectedDistrictId).toBe(20);
    expect(page.localChurchLoadError).toContain("couldn't load Local churches");
  });

  it('renders empty district and local states through page state', () => {
    prayerService.getPublicChurches.and.callFake((level: 'area' | 'district' | 'local') => {
      if (level === 'area') {
        return of([areaChurch]);
      }
      return of([]);
    });
    page.ngOnDestroy();
    page = createPage();
    page.ngOnInit();

    page.form.patchValue({ scope: 'district' });
    page.onAreaSelectionChanged(10);
    expect(page.districts).toEqual([]);

    page.form.patchValue({ scope: 'local', selected_district_id: 20 });
    page.onDistrictSelectionChanged(20);
    expect(page.localChurches).toEqual([]);
  });

  it('retry behavior reloads hierarchy options', () => {
    prayerService.getPublicChurches.calls.reset();
    page.retryAreaLoad();
    expect(prayerService.getPublicChurches).toHaveBeenCalledWith('area');

    page.form.patchValue({ selected_area_id: 10 });
    page.retryDistrictLoad();
    expect(prayerService.getPublicChurches).toHaveBeenCalledWith('district', 10);

    page.form.patchValue({ selected_district_id: 20 });
    page.retryLocalChurchLoad();
    expect(prayerService.getPublicChurches).toHaveBeenCalledWith('local', 20);
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

  it('guest named submission starts empty, requires a non-blank name, and sends it', () => {
    page.form.patchValue({ is_anonymous_publicly: false });
    page['configureSubmitterValidators']();

    expect(page.form.controls.submitter_name.value).toBe('');

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

  it('authenticated member selecting Share my name pre-fills the profile full name', () => {
    authServiceValue.currentUserSnapshot = {
      first_name: 'Prayer',
      last_name: 'Member',
      full_name: 'Prayer Member',
    };
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    page.form.patchValue({ is_anonymous_publicly: false });
    page['configureSubmitterValidators']();

    expect(page.form.controls.submitter_name.value).toBe('Prayer Member');
  });

  it('combines first_name and last_name when full_name is unavailable', () => {
    authServiceValue.currentUserSnapshot = {
      first_name: 'Prayer',
      last_name: 'Member',
      full_name: '   ',
    };
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    page.form.patchValue({ is_anonymous_publicly: false });
    page['configureSubmitterValidators']();

    expect(page.form.controls.submitter_name.value).toBe('Prayer Member');
  });

  it('member named submission pre-fill stays editable and submits the edited name', () => {
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
    page.submit();

    expect(prayerService.submitPrayerRequest.calls.mostRecent().args[0].submitter_name).toBe('Prayer Team');
  });

  it('editing the prayer display name does not call any profile-update API', () => {
    authServiceValue.currentUserSnapshot = {
      first_name: 'Prayer',
      last_name: 'Member',
      full_name: 'Prayer Member',
    };
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    page.form.patchValue({ is_anonymous_publicly: false });
    page['configureSubmitterValidators']();
    page.form.patchValue({ submitter_name: 'Prayer Team' });

    expect(authServiceValue.updateMemberProfile).not.toHaveBeenCalled();
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

  it('switching anonymous to named preserves a previously edited name', () => {
    authServiceValue.currentUserSnapshot = {
      first_name: 'Prayer',
      last_name: 'Member',
      full_name: 'Prayer Member',
    };
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    page.form.patchValue({ is_anonymous_publicly: false });
    page['configureSubmitterValidators']();
    page.form.patchValue({ submitter_name: 'Prayer Team' });

    page.form.patchValue({ is_anonymous_publicly: true });
    page['configureSubmitterValidators']();
    page.form.patchValue({ is_anonymous_publicly: false });
    page['configureSubmitterValidators']();

    expect(page.form.controls.submitter_name.value).toBe('Prayer Team');
  });

  it('auto-fill does not overwrite an already entered name', () => {
    page.form.patchValue({
      is_anonymous_publicly: false,
      submitter_name: 'Already Entered',
    });
    page['configureSubmitterValidators']();

    authServiceValue.currentUserSnapshot = {
      first_name: 'Prayer',
      last_name: 'Member',
      full_name: 'Prayer Member',
    };
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    expect(page.form.controls.submitter_name.value).toBe('Already Entered');
  });

  it('member with no usable profile name gets an empty field and must enter a name', () => {
    authServiceValue.currentUserSnapshot = {
      first_name: '   ',
      last_name: '',
      full_name: '   ',
    };
    authState$.next(true);
    currentUser$.next({ role: 'member' });

    page.form.patchValue({
      request_text: 'Please pray.',
      category: 'personal',
      scope: 'global',
      is_anonymous_publicly: false,
      submitter_name: '',
    });
    page['configureSubmitterValidators']();

    expect(page.form.controls.submitter_name.value).toBe('');

    page.submit();

    expect(page.controlError('submitter_name')).toBe('Your name is required when you choose to share it.');
    expect(prayerService.submitPrayerRequest).not.toHaveBeenCalled();
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

  it('renders the full submit title text and subtitle in the header', async () => {
    const fixture = await createComponent();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Submit a Prayer Request');
    expect(host.textContent).toContain('Share what you would like us to pray for.');
  });

  it('keeps the submit header back button accessible', async () => {
    const fixture = await createComponent();
    const backButton = fixture.nativeElement.querySelector('.app-header__back') as HTMLButtonElement | null;

    expect(backButton).not.toBeNull();
    expect(backButton?.getAttribute('aria-label')).toBe('Go back');
  });

  it('removes ellipsis styling from the submit header title', async () => {
    const fixture = await createComponent();
    const title = fixture.nativeElement.querySelector('.app-header__title') as HTMLElement | null;

    expect(title).not.toBeNull();

    const styles = window.getComputedStyle(title!);
    expect(styles.whiteSpace).toBe('normal');
    expect(styles.textOverflow).toBe('clip');
    expect(styles.overflow).toBe('visible');
  });

  it('allows the submit header title container to wrap on narrow layouts', async () => {
    const fixture = await createComponent();
    const host = fixture.nativeElement as HTMLElement;
    host.style.width = '260px';
    fixture.detectChanges();

    const title = host.querySelector('.app-header__title') as HTMLElement | null;
    const copy = host.querySelector('.app-header__copy') as HTMLElement | null;

    expect(title).not.toBeNull();
    expect(copy).not.toBeNull();
    expect(window.getComputedStyle(title!).whiteSpace).toBe('normal');
    expect(window.getComputedStyle(copy!).minWidth).toBe('0px');
  });
});
