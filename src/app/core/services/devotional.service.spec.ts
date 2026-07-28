import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from 'src/environments/environment';
import { DevotionalPublicDetail } from '../models/devotional.model';
import { ApiService } from './api.service';
import { DevotionalService } from './devotional.service';

describe('DevotionalService', () => {
  let service: DevotionalService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ApiService, DevotionalService],
    }).compileComponents();

    service = TestBed.inject(DevotionalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
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
    });
  });
});
