import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiService } from './api.service';
import { BibleStudyService } from './bible-study.service';

describe('BibleStudyService', () => {
  let service: BibleStudyService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ApiService, BibleStudyService],
    }).compileComponents();

    service = TestBed.inject(BibleStudyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls the public Bible Study manuals list endpoint', () => {
    let responseBody: unknown;

    service.getPublishedManuals().subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/bible-study/manuals/'));
    expect(request.request.method).toBe('GET');
    request.flush({ count: 0, next: null, previous: null, results: [] });

    expect(responseBody).toEqual({ count: 0, next: null, previous: null, results: [] });
  });

  it('sends supported year and language filters to the public endpoint', () => {
    service.getPublishedManuals({ year: 2026, language: 'tw' }).subscribe();

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/bible-study/manuals/'));
    expect(request.request.params.get('year')).toBe('2026');
    expect(request.request.params.get('language')).toBe('tw');
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('follows backend pagination URLs without reapplying filters', () => {
    service
      .getPublishedManuals(undefined, 'https://copit-api-staging.up.railway.app/api/public/bible-study/manuals/?page=2')
      .subscribe();

    const request = httpMock.expectOne(
      'https://copit-api-staging.up.railway.app/api/public/bible-study/manuals/?page=2'
    );
    expect(request.request.params.keys().length).toBe(0);
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('calls the public Bible Study manual detail endpoint', () => {
    let responseBody: unknown;

    service.getPublishedManualDetail(14).subscribe((response) => {
      responseBody = response;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/bible-study/manuals/14/'));
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 14,
      title: 'Guide',
      year: 2026,
      language: 'en',
      language_display: 'English',
      volume: '',
      start_week: null,
      end_week: null,
      publication_status: 'published',
      published_at: '2026-07-01T10:00:00Z',
      cover_image_url: null,
      pdf_url: 'https://example.com/manual.pdf',
    });

    expect(responseBody).toEqual({
      id: 14,
      title: 'Guide',
      year: 2026,
      language: 'en',
      language_display: 'English',
      volume: '',
      start_week: null,
      end_week: null,
      publication_status: 'published',
      published_at: '2026-07-01T10:00:00Z',
      cover_image_url: null,
      pdf_url: 'https://example.com/manual.pdf',
    });
  });
});
