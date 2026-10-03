import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from 'src/environments/environment';
import { DevotionalPublicDetail } from '../models/devotional.model';
import { formatDevotionalAvailability, getRomeDateKey, getEffectiveDevotionalEndDate, normalizeDevotionalFrequency } from '../utils/devotional-date';
import { ApiService } from './api.service';
import { DevotionalService } from './devotional.service';

describe('DevotionalService', () => {
  let service: DevotionalService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 6, 28, 10, 0, 0));

    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ApiService, DevotionalService],
    }).compileComponents();

    service = TestBed.inject(DevotionalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jasmine.clock().uninstall();
  });

  it('uses the configured API base URL for the public devotionals list endpoint', () => {
    let responseBody: unknown;

    service.getDevotionals().subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/public/devotionals/`);
    expect(request.request.method).toBe('GET');
    request.flush({ count: 0, next: null, previous: null, results: [] });

    expect(responseBody).toEqual({ count: 0, next: null, previous: null, results: [] });
  });

  it('sends the requested page to the public endpoint', () => {
    service.getDevotionals({ page: 3 }).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/devotionals/'));
    expect(request.request.params.get('page')).toBe('3');
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('follows backend pagination URLs without reapplying params', () => {
    service
      .getDevotionals(undefined, 'https://copit-api-staging.up.railway.app/api/public/devotionals/?page=2')
      .subscribe();

    const request = httpMock.expectOne(
      'https://copit-api-staging.up.railway.app/api/public/devotionals/?page=2'
    );
    expect(request.request.params.keys().length).toBe(0);
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('calls the public devotional detail endpoint with an encoded slug', () => {
    let responseBody: DevotionalPublicDetail | undefined;

    service.getDevotionalBySlug('trusting god/faith').subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne(
      `${environment.apiBaseUrl}/public/devotionals/trusting%20god%2Ffaith/`
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      id: 1,
      title: 'Trusting God in Uncertain Times',
      slug: 'trusting-god-in-uncertain-times',
      scripture_reference: 'Proverbs 3:5-6',
      scripture_text: 'Trust in the Lord with all your heart.',
      content: 'Hold fast to God.',
      reflection_question: 'What are you trusting God with today?',
      prayer: 'Lord, steady my heart.',
      author_name: 'admin admin',
      cover_image: 'https://example.com/cover.jpg',
      publication_date: '2026-07-27',
      frequency: 'daily',
      available_until: '2026-07-27',
    });

    expect(responseBody).toEqual({
      id: 1,
      title: 'Trusting God in Uncertain Times',
      slug: 'trusting-god-in-uncertain-times',
      scripture_reference: 'Proverbs 3:5-6',
      scripture_text: 'Trust in the Lord with all your heart.',
      content: 'Hold fast to God.',
      reflection_question: 'What are you trusting God with today?',
      prayer: 'Lord, steady my heart.',
      author_name: 'admin admin',
      cover_image: 'https://example.com/cover.jpg',
      publication_date: '2026-07-27',
      frequency: 'daily',
      available_until: '2026-07-27',
    });
  });

  it('calls the public today devotional endpoint', () => {
    let responseBody: DevotionalPublicDetail | undefined;

    service.getTodayDevotional().subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/public/devotionals/today/`);
    expect(request.request.method).toBe('GET');

    request.flush({
      id: 2,
      title: 'Today with Christ',
      slug: 'today-with-christ',
      scripture_reference: 'Psalm 46:10',
      scripture_text: 'Be still, and know that I am God.',
      content: 'Pause and remember who is with you today.',
      reflection_question: null,
      prayer: null,
      author_name: null,
      cover_image: null,
      publication_date: '2026-07-28',
      frequency: 'daily',
      available_until: '2026-07-28',
    });

    expect(responseBody).toEqual({
      id: 2,
      title: 'Today with Christ',
      slug: 'today-with-christ',
      scripture_reference: 'Psalm 46:10',
      scripture_text: 'Be still, and know that I am God.',
      content: 'Pause and remember who is with you today.',
      reflection_question: null,
      prayer: null,
      author_name: null,
      cover_image: null,
      publication_date: '2026-07-28',
      frequency: 'daily',
      available_until: '2026-07-28',
    });
  });

  it('treats the backend today response as authoritative for an active weekly devotional', () => {
    let responseBody: DevotionalPublicDetail | undefined;

    service.getTodayDevotional().subscribe((response) => {
      responseBody = response;
    });

    const todayRequest = httpMock.expectOne(`${environment.apiBaseUrl}/public/devotionals/today/`);
    todayRequest.flush({
      id: 5,
      title: 'Steady Grace for the Week',
      slug: 'steady-grace-for-the-week',
      scripture_reference: 'Isaiah 41:10',
      scripture_text: 'Fear thou not; for I am with thee.',
      content: 'Hold fast to God this week.',
      reflection_question: null,
      prayer: null,
      author_name: 'admin admin',
      cover_image: 'https://example.com/cover.jpg',
      publication_date: '2026-07-26',
      frequency: 'weekly',
      available_until: '2026-08-01',
    });

    expect(responseBody?.id).toBe(5);
    expect(responseBody?.frequency).toBe('weekly');
    expect(responseBody?.available_until).toBe('2026-08-01');
  });

  it('passes through a 404 from today without querying the public list', () => {
    let responseError: HttpErrorResponse | undefined;

    service.getTodayDevotional().subscribe({
      error: (error) => {
        responseError = error;
      },
    });

    httpMock.expectOne(`${environment.apiBaseUrl}/public/devotionals/today/`).flush(
      { detail: 'Not found.' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(responseError?.status).toBe(404);
  });

  it('normalizes malformed devotional list payloads safely', () => {
    let responseBody: unknown;

    service.getDevotionals().subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/public/devotionals/`);
    request.flush({
      count: 'bad-count',
      next: '   ',
      previous: null,
      results: [
        {
          id: 1,
          title: '   ',
          slug: ' morning-grace ',
          scripture_reference: null,
          author_name: ' ',
          cover_image: 'javascript:alert(1)',
          publication_date: '2026-07-29',
        },
        {
          id: 0,
          title: 'Invalid id',
          slug: 'invalid-id',
          scripture_reference: 'Psalm 1',
          author_name: 'Test',
          cover_image: 'https://example.com/cover.jpg',
          publication_date: '2026-07-28',
        },
      ],
    });

    expect(responseBody).toEqual({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          title: 'Devotion',
          slug: 'morning-grace',
          scripture_reference: '',
          author_name: null,
          cover_image: null,
          publication_date: '2026-07-29',
          frequency: 'daily',
          available_until: null,
        },
      ],
    });
  });

  it('normalizes malformed devotional detail payloads safely', () => {
    let responseBody: DevotionalPublicDetail | undefined;

    service.getTodayDevotional().subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/public/devotionals/today/`);
    request.flush({
      id: 'bad-id',
      title: '   ',
      slug: ' ',
      scripture_reference: undefined,
      scripture_text: ' ',
      content: null,
      reflection_question: undefined,
      prayer: ' ',
      author_name: '',
      cover_image: 'http://evil.example.com/cover.jpg',
      publication_date: ' ',
    });

    expect(responseBody).toEqual({
      id: 0,
      title: 'Devotion',
      slug: '',
      scripture_reference: '',
      scripture_text: null,
      content: '',
      reflection_question: null,
      prayer: null,
      author_name: null,
          cover_image: null,
          publication_date: null,
          frequency: 'daily',
          available_until: null,
    });
  });

  it('accepts only https or local http cover image URLs', () => {
    expect(service.normalizeImageUrl('https://example.com/cover.jpg')).toBe('https://example.com/cover.jpg');
    expect(service.normalizeImageUrl('http://localhost:8100/assets/cover.jpg')).toBe('http://localhost:8100/assets/cover.jpg');
    expect(service.normalizeImageUrl('http://127.0.0.1:8000/media/cover.jpg')).toBe('http://127.0.0.1:8000/media/cover.jpg');
    expect(service.normalizeImageUrl('http://evil.example.com/cover.jpg')).toBeNull();
    expect(service.normalizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(service.normalizeImageUrl('   ')).toBeNull();
  });

  it('normalizes legacy and malformed frequency values to daily', () => {
    expect(normalizeDevotionalFrequency(undefined)).toBe('daily');
    expect(normalizeDevotionalFrequency(null)).toBe('daily');
    expect(normalizeDevotionalFrequency('monthly')).toBe('daily');
    expect(getEffectiveDevotionalEndDate('2026-07-30', 'daily', null)).toBe('2026-07-30');
  });

  it('formats daily and weekly availability without device-timezone shifting', () => {
    const translate = (kind: 'daily' | 'weekly', values: { date?: string; start?: string; end?: string }): string =>
      kind === 'daily' ? `Available ${values.date}` : `Available ${values.start} – ${values.end}`;

    expect(formatDevotionalAvailability(
      { publication_date: '2026-07-30', frequency: 'daily', available_until: null },
      'en-GB',
      translate,
    )).toBe('Available 30 Jul 2026');
    expect(formatDevotionalAvailability(
      { publication_date: '2026-07-30', frequency: 'weekly', available_until: '2026-08-05' },
      'en-GB',
      translate,
    )).toBe('Available 30 Jul – 5 Aug 2026');
    expect(formatDevotionalAvailability(
      { publication_date: '2026-12-29', frequency: 'weekly', available_until: '2027-01-04' },
      'en-GB',
      translate,
    )).toBe('Available 29 Dec 2026 – 4 Jan 2027');
  });

  it('uses the Europe/Rome calendar for date-only comparisons', () => {
    expect(getRomeDateKey(new Date('2026-07-28T22:30:00.000Z'))).toBe('2026-07-29');
    expect(getRomeDateKey(new Date('2026-01-15T23:30:00.000Z'))).toBe('2026-01-16');
  });
});
