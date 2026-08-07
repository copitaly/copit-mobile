import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { PrayerService } from './prayer.service';
import { SentryTelemetryService } from './sentry-telemetry.service';

class MockAuthService {
  accessTokenSnapshot: string | null = null;
  isAuthenticatedSnapshot = false;
  currentUserSnapshot: unknown = null;
  getCurrentUser = jasmine.createSpy().and.callFake(() => {
    throw new Error('Not implemented in this test.');
  });
}

describe('PrayerService', () => {
  let service: PrayerService;
  let httpMock: HttpTestingController;
  let sentryTelemetry: jasmine.SpyObj<SentryTelemetryService>;

  beforeEach(async () => {
    sentryTelemetry = jasmine.createSpyObj<SentryTelemetryService>('SentryTelemetryService', [
      'addFeatureBreadcrumb',
      'captureFeatureError',
    ]);

    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiService,
        PrayerService,
        { provide: AuthService, useClass: MockAuthService },
        { provide: SentryTelemetryService, useValue: sentryTelemetry },
      ],
    }).compileComponents();

    service = TestBed.inject(PrayerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls the public community prayer feed endpoint', () => {
    let responseBody: unknown;

    service.getCommunityPrayers().subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/prayer-requests/'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ count: 0, next: null, previous: null, results: [] });

    expect(responseBody).toEqual({ count: 0, next: null, previous: null, results: [] });
  });

  it('calls the public community prayer detail endpoint', () => {
    let responseBody: unknown;

    service.getCommunityPrayer(18).subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/prayer-requests/18/'));
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 18,
      scope: 'local',
      church: {
        id: 2,
        name: 'Torino Central',
        level: 'local',
        district: { id: 6, name: 'Torino' },
        area: { id: 7, name: 'Piemonte' },
      },
      category: 'health',
      title: 'Healing',
      request_text: 'Please pray for healing.',
      display_name: 'Anonymous',
      comment_count: 3,
      created_at: '2026-08-05T10:00:00Z',
    });

    expect(responseBody).toEqual({
      id: 18,
      scope: 'local',
      church: {
        id: 2,
        name: 'Torino Central',
        level: 'local',
        district: { id: 6, name: 'Torino' },
        area: { id: 7, name: 'Piemonte' },
      },
      category: 'health',
      title: 'Healing',
      request_text: 'Please pray for healing.',
      display_name: 'Anonymous',
      comment_count: 3,
      created_at: '2026-08-05T10:00:00Z',
    });
  });

  it('calls the public prayer comments endpoint', () => {
    let responseBody: unknown;

    service.getCommunityPrayerComments(18).subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/prayer-requests/18/comments/'));
    expect(request.request.method).toBe('GET');
    request.flush({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 4,
          author: { name: 'Maria' },
          comment_text: 'We are praying with you.',
          created_at: '2026-08-07T18:42:00Z',
        },
      ],
    });

    expect(responseBody).toEqual({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 4,
          author: { name: 'Maria' },
          comment_text: 'We are praying with you.',
          created_at: '2026-08-07T18:42:00Z',
        },
      ],
    });
  });

  it('posts a guest prayer comment without authentication when no token is present', () => {
    let responseBody: unknown;

    service
      .createCommunityPrayerComment(18, { guest_name: 'Maria', comment_text: 'Amen.' })
      .subscribe((response) => {
        responseBody = response;
      });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/prayer-requests/18/comments/'));
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    expect(request.request.body).toEqual({ guest_name: 'Maria', comment_text: 'Amen.' });
    request.flush({
      id: 9,
      author: { name: 'Maria' },
      comment_text: 'Amen.',
      created_at: '2026-08-07T18:45:00Z',
    });

    expect(responseBody).toEqual({
      id: 9,
      author: { name: 'Maria' },
      comment_text: 'Amen.',
      created_at: '2026-08-07T18:45:00Z',
    });
  });

  it('posts a member prayer comment with the current bearer token', () => {
    let responseBody: unknown;
    const authService = TestBed.inject(AuthService) as unknown as MockAuthService;
    authService.accessTokenSnapshot = 'member-token';

    service.createCommunityPrayerComment(18, { comment_text: 'Amen.' }).subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/prayer-requests/18/comments/'));
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer member-token');
    expect(request.request.body).toEqual({ comment_text: 'Amen.' });
    request.flush({
      id: 10,
      author: { name: 'Member Name' },
      comment_text: 'Amen.',
      created_at: '2026-08-07T18:46:00Z',
    });

    expect(responseBody).toEqual({
      id: 10,
      author: { name: 'Member Name' },
      comment_text: 'Amen.',
      created_at: '2026-08-07T18:46:00Z',
    });
  });

  it('emits a community feed refresh signal when requested', () => {
    let emissionCount = 0;
    service.communityFeedRefresh$.subscribe(() => {
      emissionCount += 1;
    });

    service.notifyCommunityFeedUpdated();

    expect(emissionCount).toBe(1);
  });

  it('does not include prayer request text in submission telemetry breadcrumbs', () => {
    service
      .submitPrayerRequest({
        scope: 'global',
        category: 'personal',
        request_text: 'Please pray for my family.',
        visibility: 'private',
        is_anonymous_publicly: true,
      })
      .subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/prayer-requests/submit/'));
    request.flush({
      id: 1,
      scope: 'global',
      church: null,
      category: 'personal',
      title: '',
      request_text: 'Please pray for my family.',
      visibility: 'private',
      status: 'pending',
      is_anonymous_publicly: true,
      submitter_name: null,
      created_at: '2026-07-29T10:00:00Z',
    });

    expect(sentryTelemetry.addFeatureBreadcrumb).toHaveBeenCalled();
    const breadcrumbPayload = sentryTelemetry.addFeatureBreadcrumb.calls.first().args[2] as Record<string, unknown>;
    expect(breadcrumbPayload['request_text']).toBeUndefined();
  });

  it('sends category and scope query parameters to the backend', () => {
    service.getCommunityPrayers({ category: 'health', scope: 'local' }).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/prayer-requests/'));
    expect(request.request.params.get('category')).toBe('health');
    expect(request.request.params.get('scope')).toBe('local');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('follows the backend pagination URL without reapplying filters', () => {
    service.getCommunityPrayers(undefined, 'https://copit-api-staging.up.railway.app/api/public/prayer-requests/?page=2').subscribe();

    const request = httpMock.expectOne('https://copit-api-staging.up.railway.app/api/public/prayer-requests/?page=2');
    expect(request.request.params.keys().length).toBe(0);
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('maps the paginated public church hierarchy response correctly', () => {
    let responseBody: unknown;

    service.getPublicChurches('area').subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/churches/'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('level')).toBe('area');
    expect(request.request.params.get('page_size')).toBe('100');
    request.flush({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, name: 'Roma Area', level: 'area', parent: null, district: null, area: null, is_active: true }],
    });

    expect(responseBody).toEqual([
      { id: 1, name: 'Roma Area', level: 'area', parent: null, district: null, area: null, is_active: true },
    ]);
  });

  it('uses the public churches endpoint and never the public branches endpoint for prayer hierarchy', () => {
    service.getPublicChurches('district', 17).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/churches/'));
    expect(request.request.params.get('level')).toBe('district');
    expect(request.request.params.get('parent')).toBe('17');
    httpMock.expectNone((req) => req.url.endsWith('/api/public/branches/'));
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('calls the member prayer history endpoint with supported filters', () => {
    let responseBody: unknown;
    const authService = TestBed.inject(AuthService) as unknown as MockAuthService;
    authService.accessTokenSnapshot = 'member-token';

    service.getMyPrayerRequests({ status: 'approved', visibility: 'public', scope: 'district' }).subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/members/me/prayer-requests/'));
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer member-token');
    expect(request.request.params.get('status')).toBe('approved');
    expect(request.request.params.get('visibility')).toBe('public');
    expect(request.request.params.get('scope')).toBe('district');
    expect(request.request.params.get('page')).toBe('1');
    request.flush({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 44,
          scope: 'district',
          church: null,
          category: 'health',
          title: null,
          request_text: 'Please pray.',
          visibility: 'public',
          status: 'approved',
          is_anonymous_publicly: true,
          resolved_at: null,
          created_at: '2026-07-22T10:00:00Z',
          updated_at: '2026-07-22T10:00:00Z',
        },
      ],
    });

    expect(responseBody).toEqual({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 44,
          scope: 'district',
          church: null,
          category: 'health',
          title: '',
          request_text: 'Please pray.',
          visibility: 'public',
          status: 'approved',
          is_anonymous_publicly: true,
          resolved_at: null,
          created_at: '2026-07-22T10:00:00Z',
          updated_at: '2026-07-22T10:00:00Z',
        },
      ],
    });
  });

  it('follows the member prayer history pagination URL without reapplying filters', () => {
    const authService = TestBed.inject(AuthService) as unknown as MockAuthService;
    authService.accessTokenSnapshot = 'member-token';

    service.getMyPrayerRequests(undefined, 'https://copit-api-staging.up.railway.app/api/members/me/prayer-requests/?page=2').subscribe();

    const request = httpMock.expectOne('https://copit-api-staging.up.railway.app/api/members/me/prayer-requests/?page=2');
    expect(request.request.headers.get('Authorization')).toBe('Bearer member-token');
    expect(request.request.params.keys().length).toBe(0);
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('calls the member prayer request detail endpoint', () => {
    let responseBody: unknown;
    const authService = TestBed.inject(AuthService) as unknown as MockAuthService;
    authService.accessTokenSnapshot = 'member-token';

    service.getMyPrayerRequest(77).subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/members/me/prayer-requests/77/'));
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer member-token');
    request.flush({
      id: 77,
      scope: 'global',
      church: null,
      category: 'personal',
      title: 'Peace',
      request_text: 'Please pray for peace.',
      visibility: 'private',
      status: 'pending',
      is_anonymous_publicly: false,
      resolved_at: null,
      created_at: '2026-07-22T10:00:00Z',
      updated_at: '2026-07-22T10:00:00Z',
    });

    expect(responseBody).toEqual({
      id: 77,
      scope: 'global',
      church: null,
      category: 'personal',
      title: 'Peace',
      request_text: 'Please pray for peace.',
      visibility: 'private',
      status: 'pending',
      is_anonymous_publicly: false,
      resolved_at: null,
      created_at: '2026-07-22T10:00:00Z',
      updated_at: '2026-07-22T10:00:00Z',
    });
  });

  it('normalizes malformed member prayer values to safe fallbacks', () => {
    let responseBody: unknown;
    const authService = TestBed.inject(AuthService) as unknown as MockAuthService;
    authService.accessTokenSnapshot = 'member-token';

    service.getMyPrayerRequests().subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/members/me/prayer-requests/'));
    request.flush({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 55,
          scope: 'unexpected',
          church: null,
          category: 'health',
          title: null,
          request_text: null,
          visibility: 'hidden',
          status: 'archived',
          is_anonymous_publicly: 0,
          resolved_at: null,
          created_at: null,
          updated_at: null,
        },
      ],
    });

    expect(responseBody).toEqual({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 55,
          scope: 'unknown',
          church: null,
          category: 'health',
          title: '',
          request_text: '',
          visibility: 'unknown',
          status: 'unknown',
          is_anonymous_publicly: false,
          resolved_at: null,
          created_at: '',
          updated_at: '',
        },
      ],
    });
  });

  it('refreshes auth and retries the member prayer history request once after a 401', () => {
    const authService = TestBed.inject(AuthService) as unknown as MockAuthService;
    authService.accessTokenSnapshot = 'expired-token';
    authService.getCurrentUser.and.callFake(() => {
      authService.accessTokenSnapshot = 'fresh-token';
      return of({ id: 1, role: 'member' });
    });

    let responseBody: unknown;
    service.getMyPrayerRequests().subscribe((response) => {
      responseBody = response;
    });

    const initialRequest = httpMock.expectOne((req) => req.url.endsWith('/api/members/me/prayer-requests/'));
    expect(initialRequest.request.headers.get('Authorization')).toBe('Bearer expired-token');
    initialRequest.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const retryRequest = httpMock.expectOne((req) => req.url.endsWith('/api/members/me/prayer-requests/'));
    expect(retryRequest.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retryRequest.flush({ count: 0, next: null, previous: null, results: [] });

    expect(authService.getCurrentUser).toHaveBeenCalled();
    expect(responseBody).toEqual({ count: 0, next: null, previous: null, results: [] });
  });
});
