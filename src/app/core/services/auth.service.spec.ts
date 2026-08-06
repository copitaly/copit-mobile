import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';

import { MemberProfile } from '../models/user.model';
import { environment } from 'src/environments/environment';
import { AuthStorageService } from './auth-storage.service';
import { AuthService } from './auth.service';
import { SentryTelemetryService } from './sentry-telemetry.service';
import { LocaleService } from '../localization/locale.service';

class MockAuthStorageService {
  getAccessToken = jasmine.createSpy().and.resolveTo(null);
  setAccessToken = jasmine.createSpy().and.resolveTo();
  removeAccessToken = jasmine.createSpy().and.resolveTo();
  getCurrentUser = jasmine.createSpy().and.resolveTo(null);
  setCurrentUser = jasmine.createSpy().and.resolveTo();
  removeCurrentUser = jasmine.createSpy().and.resolveTo();
}

class MockSentryTelemetryService {
  addFeatureBreadcrumb(): void {}
  captureFeatureError(): void {}
}

class MockLocaleService {
  initialize = jasmine.createSpy().and.resolveTo();
  setLocale = jasmine.createSpy().and.resolveTo('en');
  applyAuthenticatedPreference = jasmine.createSpy().and.resolveTo('en');
  handleLogout = jasmine.createSpy().and.resolveTo('en');
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let documentRef: Document;
  let storage: MockAuthStorageService;
  let localeService: MockLocaleService;
  const apiUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  const api = (path: string) => `${apiUrl}/${path.replace(/^\/*/, '').replace(/\/+$/, '')}/`;

  const profile: MemberProfile = {
    id: 7,
    email: 'member@example.com',
    first_name: 'Member',
    last_name: 'User',
    role: 'member',
    can_use_member_app: true,
    date_joined: '2026-07-01T00:00:00Z',
    donation_summary: {
      total_paid_amount: '0.00',
      total_paid_count: 0,
      currency: 'eur',
      last_donation_at: null,
    },
    recent_donations: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: AuthStorageService, useClass: MockAuthStorageService },
        { provide: SentryTelemetryService, useClass: MockSentryTelemetryService },
        { provide: LocaleService, useClass: MockLocaleService },
      ],
    }).compileComponents();

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    documentRef = TestBed.inject(DOCUMENT);
    storage = TestBed.inject(AuthStorageService) as unknown as MockAuthStorageService;
    localeService = TestBed.inject(LocaleService) as unknown as MockLocaleService;

    documentRef.cookie = 'csrftoken=test-csrf-token; path=/';
    await service.initialize();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('refreshes and retries an authenticated request after a 401', fakeAsync(() => {
    (service as unknown as { accessToken: string | null }).accessToken = 'expired-token';

    let responseBody: unknown;
    service.getMemberDonations().subscribe((response) => {
      responseBody = response;
    });
    flushMicrotasks();

    const initialRequest = httpMock.expectOne(api('members/me/donations'));
    expect(initialRequest.request.headers.get('Authorization')).toBe('Bearer expired-token');
    initialRequest.flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(api('auth/token/refresh'));
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.headers.get('X-CSRFToken')).toBe('test-csrf-token');
    refreshRequest.flush({ access: 'fresh-token' });

    const retryRequest = httpMock.expectOne(api('members/me/donations'));
    expect(retryRequest.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retryRequest.flush({ count: 0, next: null, previous: null, results: [] });

    flushMicrotasks();

    expect(responseBody).toEqual({ count: 0, next: null, previous: null, results: [] });
    expect(service.accessTokenSnapshot).toBe('fresh-token');
  }));

  it('clears local session state when refresh fails with 401', fakeAsync(() => {
    (service as unknown as { accessToken: string | null }).accessToken = 'expired-token';
    service.setCurrentUser(profile);

    let resolvedValue: MemberProfile | null | undefined;
    service.getCurrentUser().subscribe((value) => {
      resolvedValue = value;
    });
    flushMicrotasks();

    const meRequest = httpMock.expectOne(api('members/me'));
    meRequest.flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne(api('auth/token/refresh'));
    refreshRequest.flush({ detail: 'invalid refresh' }, { status: 401, statusText: 'Unauthorized' });

    flushMicrotasks();

    expect(resolvedValue).toBeNull();
    expect(service.accessTokenSnapshot).toBeNull();
    expect(service.currentUserSnapshot).toBeNull();
    expect(storage.removeAccessToken).toHaveBeenCalled();
    expect(storage.removeCurrentUser).toHaveBeenCalled();
  }));

  it('does not treat a 403 member endpoint response as session expiry', fakeAsync(() => {
    (service as unknown as { accessToken: string | null }).accessToken = 'active-token';
    service.setCurrentUser(profile);

    let receivedError: HttpErrorResponse | null = null;
    service.getMemberDonations().subscribe({
      error: (error) => {
        receivedError = error;
      },
    });
    flushMicrotasks();

    const request = httpMock.expectOne(api('members/me/donations'));
    request.flush({ detail: 'forbidden' }, { status: 403, statusText: 'Forbidden' });

    flushMicrotasks();

    httpMock.expectNone(api('auth/token/refresh'));
    expect(receivedError).toEqual(jasmine.any(HttpErrorResponse));
    expect((receivedError as unknown as HttpErrorResponse).status).toBe(403);
    expect(service.accessTokenSnapshot).toBe('active-token');
    expect(service.currentUserSnapshot?.id).toBe(profile.id);
  }));

  it('posts forgot-password requests to the existing auth endpoint', fakeAsync(() => {
    let responseBody: unknown;

    service.forgotPassword({ email: 'member@example.com' }).subscribe((response) => {
      responseBody = response;
    });
    flushMicrotasks();

    const request = httpMock.expectOne(api('auth/forgot-password'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'member@example.com' });
    request.flush({ success: true });

    flushMicrotasks();

    expect(responseBody).toEqual({ success: true });
  }));

  it('gets reset-token validation data from the existing auth endpoint', fakeAsync(() => {
    let responseBody: unknown;

    service.validatePasswordResetToken('uid-token', 'reset-token').subscribe((response) => {
      responseBody = response;
    });
    flushMicrotasks();

    const request = httpMock.expectOne(
      api('auth/reset-password/uid-token/reset-token/validate')
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      email: 'm***@example.com',
      expires_at: '2026-07-23T10:30:00Z',
      status: 'valid',
    });

    flushMicrotasks();

    expect(responseBody).toEqual({
      email: 'm***@example.com',
      expires_at: '2026-07-23T10:30:00Z',
      status: 'valid',
    });
  }));

  it('posts reset-password confirmation to the existing auth endpoint', fakeAsync(() => {
    let responseBody: unknown;

    service
      .confirmPasswordReset('uid-token', 'reset-token', {
        new_password: 'NewSecret1!',
        confirm_password: 'NewSecret1!',
      })
      .subscribe((response) => {
        responseBody = response;
      });
    flushMicrotasks();

    const request = httpMock.expectOne(
      api('auth/reset-password/uid-token/reset-token/confirm')
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      new_password: 'NewSecret1!',
      confirm_password: 'NewSecret1!',
    });
    request.flush({ success: true, message: 'Password has been reset.' });

    flushMicrotasks();

    expect(responseBody).toEqual({ success: true, message: 'Password has been reset.' });
  }));

  it('normalizes legacy language values when setting current user state', () => {
    service.setCurrentUser({
      ...profile,
      language: 'italian',
    });

    expect(service.currentUserSnapshot?.language).toBe('it');
    expect(storage.setCurrentUser).toHaveBeenCalledWith(
      jasmine.objectContaining({ language: 'it' })
    );
    expect(localeService.applyAuthenticatedPreference).toHaveBeenCalledWith('it');
  });

  it('falls back to en for unsupported current user language values', () => {
    service.setCurrentUser({
      ...profile,
      language: 'portuguese',
    });

    expect(service.currentUserSnapshot?.language).toBe('en');
    expect(storage.setCurrentUser).toHaveBeenCalledWith(
      jasmine.objectContaining({ language: 'en' })
    );
    expect(localeService.applyAuthenticatedPreference).toHaveBeenCalledWith('en');
  });

  it('fails closed when current user state lacks member-app capability', () => {
    service.setCurrentUser({
      ...profile,
      can_use_member_app: false,
    });

    expect(service.currentUserSnapshot).toBeNull();
    expect(service.isAuthenticatedSnapshot).toBeFalse();
    expect(storage.removeCurrentUser).toHaveBeenCalled();
    expect(storage.removeAccessToken).toHaveBeenCalled();
    expect(localeService.handleLogout).toHaveBeenCalled();
  });

  it('rejects member profile responses that do not expose member-app capability', fakeAsync(() => {
    (service as unknown as { accessToken: string | null }).accessToken = 'active-token';

    let receivedError: HttpErrorResponse | null = null;
    service.getCurrentUser().subscribe({
      error: (error) => {
        receivedError = error;
      },
    });
    flushMicrotasks();

    const request = httpMock.expectOne(api('members/me'));
    request.flush({
      ...profile,
      can_use_member_app: false,
    });

    flushMicrotasks();

    expect(receivedError).toEqual(jasmine.any(HttpErrorResponse));
    expect((receivedError as unknown as HttpErrorResponse).status).toBe(403);
    expect(service.currentUserSnapshot).toBeNull();
    expect(service.accessTokenSnapshot).toBeNull();
  }));

  it('sends canonical language in the member profile update payload', fakeAsync(() => {
    (service as unknown as { accessToken: string | null }).accessToken = 'active-token';

    let responseBody: MemberProfile | undefined;
    service.updateMemberProfile({ language: 'fr' }).subscribe((response) => {
      responseBody = response;
    });
    flushMicrotasks();

    const request = httpMock.expectOne(api('members/me'));
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ language: 'fr' });
    request.flush({ ...profile, language: 'fr' });

    flushMicrotasks();

    expect(responseBody?.language).toBe('fr');
    expect(service.currentUserSnapshot?.language).toBe('fr');
  }));

  it('restores guest or device locale behavior on logout instead of persisting the authenticated language', () => {
    service.logout();

    expect(localeService.handleLogout).toHaveBeenCalled();
  });
});
