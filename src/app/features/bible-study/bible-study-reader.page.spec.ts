import { HttpErrorResponse } from '@angular/common/http';
import { SecurityContext } from '@angular/core';
import { fakeAsync, flushMicrotasks, ComponentFixture, TestBed, tick } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { BibleStudyDownloadService } from '../../core/services/bible-study-download.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { ExternalBrowserService } from '../../core/services/external-browser.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { BibleStudyReaderPage } from './bible-study-reader.page';

describe('BibleStudyReaderPage', () => {
  let fixture: ComponentFixture<BibleStudyReaderPage>;
  let page: BibleStudyReaderPage;
  let sanitizer: DomSanitizer;
  let bibleStudyService: jasmine.SpyObj<BibleStudyService>;
  let downloadService: jasmine.SpyObj<BibleStudyDownloadService>;
  let externalBrowserService: jasmine.SpyObj<ExternalBrowserService>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let toastController: jasmine.SpyObj<ToastController>;
  let toastElement: { present: jasmine.Spy<() => Promise<void>> };

  const manual: BibleStudyManualDetail = {
    id: 14,
    title: 'Bible Study Manual',
    year: 2026,
    language: 'en',
    language_display: 'English',
    volume: 'Volume 1',
    start_week: 1,
    end_week: 4,
    publication_status: 'published',
    published_at: '2026-07-24T09:00:00Z',
    cover_image_url: 'https://example.com/cover.jpg',
    pdf_url: 'https://example.com/manual.pdf?X-Amz-Signature=fresh',
  };

  async function createComponent(routeId = '14'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [BibleStudyReaderPage],
      providers: [
        { provide: BibleStudyService, useValue: bibleStudyService },
        { provide: BibleStudyDownloadService, useValue: downloadService },
        { provide: ExternalBrowserService, useValue: externalBrowserService },
        { provide: StackNavigationService, useValue: stackNavigationService },
        { provide: ToastController, useValue: toastController },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: routeId }),
            },
          },
        },
      ],
    }).compileComponents();

    sanitizer = TestBed.inject(DomSanitizer);
    fixture = TestBed.createComponent(BibleStudyReaderPage);
    page = fixture.componentInstance;
    page.ionViewWillEnter();
    fixture.detectChanges();
    await Promise.resolve();
  }

  beforeEach(() => {
    bibleStudyService = jasmine.createSpyObj<BibleStudyService>('BibleStudyService', [
      'getPublishedManualDetail',
      'normalizeDocumentUrl',
    ]);
    bibleStudyService.normalizeDocumentUrl.and.callFake((value: string | null | undefined) => {
      const candidate = (value ?? '').trim();
      if (!candidate) {
        return null;
      }

      try {
        const url = new URL(candidate);
        if (url.protocol === 'https:') {
          return url.toString();
        }

        if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
          return url.toString();
        }
      } catch {
        return null;
      }

      return null;
    });
    downloadService = jasmine.createSpyObj<BibleStudyDownloadService>('BibleStudyDownloadService', ['downloadPdf']);
    externalBrowserService = jasmine.createSpyObj<ExternalBrowserService>('ExternalBrowserService', ['openUrl']);
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
    toastElement = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    };
    toastController = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastController.create.and.returnValue(Promise.resolve(toastElement as never));
  });

  it('starts in loading state and creates the trusted iframe source', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    expect(page.viewerState).toBe('loading');
    expect(page.loadingStage).toBe('pdf');
    expect(page.pdfSourceUrl).toBe('https://example.com/manual.pdf?X-Amz-Signature=fresh');
    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, page.pdfEmbedUrl)).toBe(
      'https://example.com/manual.pdf?X-Amz-Signature=fresh#view=FitH'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-native-frame"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ngx-extended-pdf-viewer')).toBeNull();
  });

  it('renders a compact toolbar with Bible Study fallback and download action', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    const backButton = fixture.nativeElement.querySelector('ion-back-button');
    const downloadButton = fixture.nativeElement.querySelector('.reader-toolbar__action');

    expect(backButton?.getAttribute('defaultHref')).toBe('/tabs/bible-study');
    expect(backButton?.getAttribute('aria-label')).toBe('Back to Bible Study');
    expect(downloadButton?.getAttribute('aria-label')).toBe('Download PDF');
  });

  it('shows the pdf loading overlay while the iframe is loading', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="pdf-loading-state"]')?.textContent).toContain(
      'Opening the PDF for reading.'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="reader-loading-state"]')).toBeNull();
  });

  it('transitions to ready asynchronously after iframe load', fakeAsync(async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.handleIframeLoad();

    expect(page.viewerState).toBe('loading');

    flushMicrotasks();
    fixture.detectChanges();

    expect(page.viewerState).toBe('ready');
    expect(page.isReaderReady).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-loading-state"]')).toBeNull();
  }));

  it('repeated iframe load events remain safe', fakeAsync(async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.handleIframeLoad();
    page.handleIframeLoad();

    flushMicrotasks();
    fixture.detectChanges();

    expect(page.viewerState).toBe('ready');

    page.handleIframeLoad();
    flushMicrotasks();
    fixture.detectChanges();

    expect(page.viewerState).toBe('ready');
  }));

  it('shows an unavailable state when pdf_url is missing', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of({ ...manual, pdf_url: null }));

    await createComponent();

    expect(page.viewerState).toBe('error');
    expect(page.errorKind).toBe('pdf-missing');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-no-pdf-state"]')?.textContent).toContain(
      'PDF unavailable'
    );
  });

  it('rejects unsafe pdf urls before creating the iframe', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of({ ...manual, pdf_url: 'javascript:alert(1)' }));

    await createComponent();

    expect(page.pdfSourceUrl).toBeNull();
    expect(page.pdfEmbedUrl).toBeNull();
    expect(page.errorKind).toBe('pdf-missing');
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-native-frame"]')).toBeNull();
  });

  it('shows the generic API error and retries', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValues(throwError(() => new Error('network')), of(manual));

    await createComponent();

    expect(page.errorKind).toBe('manual-load');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-error-state"]')?.textContent).toContain(
      "We couldn't load this manual"
    );

    page.retryLoad();
    fixture.detectChanges();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
  });

  it('shows an offline reader error message when the manual request fails with status 0', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    await createComponent();

    expect(page.errorMessage).toBe('You appear to be offline. Check your connection and try again.');
  });

  it('shows a friendly 404 state', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    await createComponent();

    expect(page.errorKind).toBe('manual-not-found');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-not-found-state"]')?.textContent).toContain(
      'Manual not found'
    );
  });

  it('timeout is cancelled when ready', fakeAsync(async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.handleIframeLoad();
    flushMicrotasks();
    tick(7001);
    fixture.detectChanges();

    expect(page.viewerState).toBe('ready');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')).toBeNull();
  }));

  it('shows the iframe compatibility fallback after the bounded timeout', fakeAsync(async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    tick(7001);
    fixture.detectChanges();

    expect(page.viewerState).toBe('error');
    expect(page.errorKind).toBe('pdf-unavailable');
    expect(page.errorMessage).toBe('Embedded PDF viewing is not available on this device right now.');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')?.textContent).toContain(
      'Open PDF externally'
    );
  }));

  it('shows the iframe compatibility fallback when the iframe errors', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.handleIframeError();
    fixture.detectChanges();

    expect(page.viewerState).toBe('error');
    expect(page.errorKind).toBe('pdf-unavailable');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')).not.toBeNull();
  });

  it('retry resets state and reloads the manual', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValues(
      of(manual),
      of({ ...manual, pdf_url: 'https://example.com/manual.pdf?X-Amz-Signature=renewed' })
    );

    await createComponent();
    page.handleIframeError();
    fixture.detectChanges();

    page.retryPdfLoad();
    fixture.detectChanges();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
    expect(page.viewerState).toBe('loading');
    expect(page.errorKind).toBe('none');
    expect(sanitizer.sanitize(SecurityContext.RESOURCE_URL, page.pdfEmbedUrl)).toBe(
      'https://example.com/manual.pdf?X-Amz-Signature=renewed#view=FitH'
    );
  });

  it('uses the shared stack back flow for the reader with the Bible Study list fallback', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    await page.goBackToManual();

    expect(stackNavigationService.backWithFallback).toHaveBeenCalledWith('/tabs/bible-study');
  });

  it('downloads using a freshly fetched pdf url from the reader', async () => {
    const refreshedManual = { ...manual, pdf_url: 'https://example.com/manual.pdf?X-Amz-Signature=fresh-download' };
    bibleStudyService.getPublishedManualDetail.and.returnValues(of(manual), of(refreshedManual));
    downloadService.downloadPdf.and.resolveTo({
      fileName: 'manual.pdf',
      locationLabel: 'your device share sheet',
      shared: true,
    });

    await createComponent();
    await page.downloadPdf();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
    expect(downloadService.downloadPdf).toHaveBeenCalledWith(
      'https://example.com/manual.pdf?X-Amz-Signature=fresh-download',
      jasmine.stringMatching(/bible-study-manual-2026-english\.pdf/)
    );
    expect(toastController.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'manual.pdf is ready from your device share sheet.',
        position: 'bottom',
        icon: 'checkmark-circle',
        cssClass: ['app-toast', 'app-toast--success'],
      })
    );
  });

  it('opens the current pdf in the established external browser utility', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));
    externalBrowserService.openUrl.and.returnValue(Promise.resolve());

    await createComponent();
    await page.openPdfExternally();

    expect(externalBrowserService.openUrl).toHaveBeenCalledWith('https://example.com/manual.pdf?X-Amz-Signature=fresh');
  });

  it('keeps download and open externally in the pdf error state', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.handleIframeError();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Download PDF');
    expect(fixture.nativeElement.textContent).toContain('Open PDF externally');
  });

  it('does not render the tabs bar inside the full-screen reader flow', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="tabs-bar"]')).toBeNull();
  });

  it('re-entry fetches fresh manual details and recreates the iframe source', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValues(
      of(manual),
      of({ ...manual, pdf_url: 'https://example.com/manual.pdf?X-Amz-Signature=second' })
    );

    await createComponent();

    expect(page.pdfSourceUrl).toContain('fresh');

    page.ionViewDidLeave();
    expect(page.pdfSourceUrl).toBeNull();

    page.ionViewWillEnter();
    fixture.detectChanges();
    await Promise.resolve();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
    expect(page.pdfSourceUrl).toContain('second');
  });

  it('destroy clears pending timers', fakeAsync(async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.ngOnDestroy();
    tick(7001);
    fixture.detectChanges();

    expect(page.pdfSourceUrl).toBeNull();
    expect(page.pdfEmbedUrl).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')).toBeNull();
  }));

  it('late iframe events after destroy are ignored', fakeAsync(async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.ngOnDestroy();
    page.handleIframeLoad();
    page.handleIframeError();
    flushMicrotasks();
    fixture.detectChanges();

    expect(page.pdfSourceUrl).toBeNull();
    expect(page.viewerState).toBe('error');
    expect(page.errorKind).toBe('none');
  }));

  it('shows an invalid id error without calling the API', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent('abc');

    expect(bibleStudyService.getPublishedManualDetail).not.toHaveBeenCalled();
    expect(page.errorKind).toBe('invalid-id');
    expect(page.errorMessage).toBe('Invalid Bible Study manual ID.');
  });
});
