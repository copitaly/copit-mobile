import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { PrayerService } from './prayer.service';
import { SentryTelemetryService } from './sentry-telemetry.service';

class MockAuthService {
  accessTokenSnapshot: string | null = null;
  getCurrentUser = jasmine.createSpy().and.callFake(() => {
    throw new Error('Not implemented in this test.');
  });
}

class MockSentryTelemetryService {
  addFeatureBreadcrumb(): void {}
  captureFeatureError(): void {}
}

describe('PrayerService', () => {
  let service: PrayerService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiService,
        PrayerService,
        { provide: AuthService, useClass: MockAuthService },
        { provide: SentryTelemetryService, useClass: MockSentryTelemetryService },
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
});
