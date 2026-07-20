import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';

import { MemberProfile } from '../models/user.model';
import { AuthStorageService } from './auth-storage.service';
import { AuthService } from './auth.service';
import { SentryTelemetryService } from './sentry-telemetry.service';

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

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let documentRef: Document;
  let storage: MockAuthStorageService;

  const profile: MemberProfile = {
    id: 7,
    email: 'member@example.com',
    first_name: 'Member',
    last_name: 'User',
    role: 'member',
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
      ],
    }).compileComponents();

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    documentRef = TestBed.inject(DOCUMENT);
    storage = TestBed.inject(AuthStorageService) as unknown as MockAuthStorageService;

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

    const initialRequest = httpMock.expectOne('http://localhost:8000/api/members/me/donations/');
    expect(initialRequest.request.headers.get('Authorization')).toBe('Bearer expired-token');
    initialRequest.flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne('http://localhost:8000/api/auth/token/refresh/');
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.headers.get('X-CSRFToken')).toBe('test-csrf-token');
    refreshRequest.flush({ access: 'fresh-token' });

    const retryRequest = httpMock.expectOne('http://localhost:8000/api/members/me/donations/');
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

    const meRequest = httpMock.expectOne('http://localhost:8000/api/members/me/');
    meRequest.flush({ detail: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const refreshRequest = httpMock.expectOne('http://localhost:8000/api/auth/token/refresh/');
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

    const request = httpMock.expectOne('http://localhost:8000/api/members/me/donations/');
    request.flush({ detail: 'forbidden' }, { status: 403, statusText: 'Forbidden' });

    flushMicrotasks();

    httpMock.expectNone('http://localhost:8000/api/auth/token/refresh/');
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

    const request = httpMock.expectOne('http://localhost:8000/api/auth/forgot-password/');
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

    const request = httpMock.expectOne(
      'http://localhost:8000/api/auth/reset-password/uid-token/reset-token/validate/'
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

    const request = httpMock.expectOne(
      'http://localhost:8000/api/auth/reset-password/uid-token/reset-token/confirm/'
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
});
