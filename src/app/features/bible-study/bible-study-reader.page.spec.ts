import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { of, Subject, throwError } from 'rxjs';
import { ProgressBarEvent } from 'ngx-extended-pdf-viewer';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { AuthService } from '../../core/services/auth.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { BibleStudyPdfViewerComponent } from './bible-study-pdf-viewer.component';
import { BibleStudyReaderPage } from './bible-study-reader.page';

@Component({
  standalone: true,
  selector: 'app-bible-study-pdf-viewer',
  imports: [CommonModule],
  template: '<div data-testid="mock-pdf-viewer"></div>',
})
class MockBibleStudyPdfViewerComponent {
  @Input({ required: true }) src = '';
  @Input() page?: number;
  @Input() zoom: string | number = 'page-width';

  @Output() progress = new EventEmitter<ProgressBarEvent>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageRendered = new EventEmitter<{ pageNumber: number; cssTransform: boolean; source: unknown }>();
  @Output() pagesLoaded = new EventEmitter<{ source: unknown; pagesCount: number }>();
      @Output() pdfLoadingStarts = new EventEmitter<Record<string, never>>();
  @Output() pdfLoaded = new EventEmitter<{ pagesCount: number }>();
  @Output() pdfLoadingFailed = new EventEmitter<Error>();
  @Output() currentZoomFactor = new EventEmitter<number>();
}

describe('BibleStudyReaderPage', () => {
  let fixture: ComponentFixture<BibleStudyReaderPage>;
  let page: BibleStudyReaderPage;
  let bibleStudyService: jasmine.SpyObj<BibleStudyService>;
  let stackNavigationService: jasmine.SpyObj<StackNavigationService>;
  let boundingRectSpy: jasmine.Spy<() => DOMRect>;

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
        { provide: StackNavigationService, useValue: stackNavigationService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: routeId }),
            },
          },
        },
        { provide: AuthService, useValue: { isAuthenticatedSnapshot: true } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], { events: of() }) },
      ],
    })
      .overrideComponent(BibleStudyReaderPage, {
        remove: { imports: [BibleStudyPdfViewerComponent] },
        add: { imports: [MockBibleStudyPdfViewerComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BibleStudyReaderPage);
    page = fixture.componentInstance;
    page.ionViewWillEnter();
    fixture.detectChanges();
    await Promise.resolve();
    page.ionViewDidEnter();
    await Promise.resolve();
    fixture.detectChanges();
  }

  async function settleInitialViewerPageCommand(): Promise<void> {
    page.handlePageRendered({ pageNumber: 1, cssTransform: false, source: {} as never });
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
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(16);
      return 1;
    });
    boundingRectSpy = spyOn(HTMLElement.prototype, 'getBoundingClientRect').and.returnValue({
      width: 360,
      height: 640,
      top: 0,
      left: 0,
      right: 360,
      bottom: 640,
      x: 0,
      y: 0,
      toJSON: () => '',
    } as DOMRect);
  });

  it('requests fresh manual details on entry and binds the viewer source', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    expect(page.readerTitle).toBe('Bible Study');
    expect(page.readerSubtitle).toBe('Reader');
    expect(bibleStudyService.getPublishedManualDetail).toHaveBeenCalledWith(14);
    const viewer = fixture.debugElement.query(By.directive(MockBibleStudyPdfViewerComponent))
      ?.componentInstance as MockBibleStudyPdfViewerComponent | undefined;

    expect(viewer?.src).toBe('https://example.com/manual.pdf?X-Amz-Signature=fresh');
    expect(viewer?.zoom).toBe('page-width');
    expect(viewer?.page).toBe(1);
  });

  it('does not create the viewer before a usable pdf_url exists', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of({ ...manual, pdf_url: '   ' }));

    await createComponent();

    expect(fixture.debugElement.query(By.directive(MockBibleStudyPdfViewerComponent))).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="reader-no-pdf-state"]')).not.toBeNull();
  });

  it('rejects unsafe pdf urls before creating the viewer', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of({ ...manual, pdf_url: 'javascript:alert(1)' }));

    await createComponent();

    expect(page.pdfSourceUrl).toBeNull();
    expect(fixture.debugElement.query(By.directive(MockBibleStudyPdfViewerComponent))).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="reader-no-pdf-state"]')).not.toBeNull();
  });

  it('shows the loading state before the manual arrives', async () => {
    const manual$ = new Subject<BibleStudyManualDetail>();
    bibleStudyService.getPublishedManualDetail.and.returnValue(manual$.asObservable());

    await createComponent();

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="reader-loading-state"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Preparing your manual...');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-viewer"]')).toBeNull();
  });

  it('shows the loading-document shell after metadata succeeds and before rendering begins', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="pdf-loading-state"]')?.textContent).toContain('Loading PDF...');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-controls"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-viewer-shell"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the generic API error and retries', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValues(
      throwError(() => new Error('network')),
      of(manual)
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="reader-error-state"]')?.textContent).toContain(
      "We couldn't load this manual"
    );

    page.retryLoad();
    fixture.detectChanges();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
  });

  it('shows an offline reader error message when the manual request fails with status 0', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0 }))
    );

    await createComponent();

    expect(page.errorMessage).toBe('You appear to be offline. Check your connection and try again.');
  });

  it('shows a friendly 404 state', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="reader-not-found-state"]')?.textContent).toContain(
      'Manual not found'
    );
  });

  it('shows an unavailable state when pdf_url is missing', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of({ ...manual, pdf_url: null }));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="reader-no-pdf-state"]')?.textContent).toContain(
      'PDF unavailable'
    );
  });

  it('retries by fetching a fresh signed URL after a PDF rendering failure', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValues(
      of(manual),
      of({ ...manual, pdf_url: 'https://example.com/manual.pdf?X-Amz-Signature=renewed' })
    );

    await createComponent();

    page.handlePdfLoadingFailed(new Error('403 expired'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')?.textContent).toContain(
      'We could not render this PDF right now.'
    );

    page.retryPdfLoad();
    fixture.detectChanges();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
    expect(
      fixture.nativeElement.querySelector('[data-testid="reader-loading-state"]') ??
        fixture.nativeElement.querySelector('[data-testid="pdf-loading-state"]')
    ).not.toBeNull();
    expect(page.pdfSourceUrl).toBe('https://example.com/manual.pdf?X-Amz-Signature=renewed');
  });

  it('does not start the timeout before the viewer reports load start', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    jasmine.clock().install();
    try {
      await createComponent();

      jasmine.clock().tick(12001);
      fixture.detectChanges();

      expect(page.pdfLoading).toBeFalse();
      expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')).toBeNull();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('shows retry after a viewer load timeout only once loading has started', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    jasmine.clock().install();
    try {
      await createComponent();

      page.handlePdfLoadingStarts({});
      jasmine.clock().tick(12001);
      fixture.detectChanges();

      expect(page.pdfLoading).toBeFalse();
      expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')?.textContent).toContain(
      'We could not render this PDF right now.'
      );
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('ends the loading state when the first page renders instead of waiting for the whole document', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    page.handlePdfLoadingStarts({});
    page.handleViewerProgress({ source: null, type: 'load', total: 100, percent: 42 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="pdf-loading-state"]')?.textContent).toContain(
      'Rendering pages (42%)...'
    );
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-viewer-shell"]')?.getAttribute('aria-hidden')).toBe('true');

    page.handlePageRendered({ pageNumber: 1, cssTransform: false, source: {} as never });
    fixture.detectChanges();

    expect(page.pdfLoading).toBeFalse();
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-loading-state"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-viewer-shell"]')?.classList).toContain(
      'reader-viewer__canvas--ready'
    );
  });

  it('shows retry when the viewer emits a loading failure', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    page.handlePdfLoadingFailed(new Error('render failed'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')?.textContent).toContain(
      'We could not render this PDF right now.'
    );
  });

  it('updates page and zoom controls from viewer events', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    expect(page.toolbarDisabled).toBeTrue();
    page.handlePagesLoaded({ source: null, pagesCount: 18 });
    page.handlePageChange(4);
    page.handleCurrentZoomFactor(1.5);
    page.handlePageRendered({ pageNumber: 4, cssTransform: false, source: {} as never });
    page.zoomIn();
    fixture.detectChanges();

    expect(page.toolbarDisabled).toBeFalse();
    expect(page.totalPages).toBe(18);
    expect(page.currentPage).toBe(4);
    expect(page.zoom).toBe('175%');
    expect(fixture.nativeElement.querySelector('[data-testid="reader-controls"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.reader-controls--slim')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="reader-viewer"]')?.classList).toContain('reader-viewer--immersive');
  });

  it('keeps the toolbar hidden before the first rendered page is ready', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.handlePdfLoadingStarts({});
    fixture.detectChanges();

    expect(page.toolbarDisabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-testid="reader-controls"]')).toBeNull();
  });

  it('uses fit width as the initial zoom mode and when reset', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    expect(page.defaultZoomMode).toBe('page-width');
    expect(page.zoom).toBe('page-width');

    page.zoomIn();
    expect(page.zoom).toBe('125%');

    page.resetZoom();
    expect(page.zoom).toBe('page-width');
  });

  it('clears the initial page command after the first rendered page', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    expect(page.viewerPage).toBe(1);

    page.handlePageRendered({ pageNumber: 1, cssTransform: false, source: {} as never });
    await Promise.resolve();

    expect(page.viewerPage).toBeUndefined();
  });

  it('uses the viewer as the vertical scroll owner instead of ion-content', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    const ionContent = fixture.debugElement.query(By.directive(IonContent))?.componentInstance as IonContent | undefined;

    expect(ionContent?.scrollY).toBeFalse();
    expect(fixture.nativeElement.querySelector('.reader-viewer--loading')).toBeNull();
  });

  it('re-entry fetches fresh manual details and recreates the viewer source', async () => {
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
    page.ionViewDidEnter();
    await Promise.resolve();
    fixture.detectChanges();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
    expect(page.pdfSourceUrl).toContain('second');
  });

  it('ignores repeated identical resize events while ready', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    await settleInitialViewerPageCommand();
    page.handlePageRendered({ pageNumber: 4, cssTransform: false, source: {} as never });
    page.handlePageChange(4);
    await Promise.resolve();

    jasmine.clock().install();
    try {
      page.handleViewportResize();
      page.handleViewportResize();
      jasmine.clock().tick(200);

      expect(page.viewerPage).toBeUndefined();
      await Promise.resolve();
      expect(page.viewerPage).toBeUndefined();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('debounces meaningful resize changes and preserves the current page', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    await settleInitialViewerPageCommand();
    page.handlePageRendered({ pageNumber: 7, cssTransform: false, source: {} as never });
    page.handlePageChange(7);
    await Promise.resolve();

    boundingRectSpy.and.returnValue({
      width: 420,
      height: 740,
      top: 0,
      left: 0,
      right: 420,
      bottom: 740,
      x: 0,
      y: 0,
      toJSON: () => '',
    } as DOMRect);

    jasmine.clock().install();
    try {
      page.handleOrientationChange();
      jasmine.clock().tick(100);
      expect(page.viewerPage).toBeUndefined();

      jasmine.clock().tick(50);
      expect(page.viewerPage).toBe(7);
      page.handlePageChange(7);
      await Promise.resolve();
      expect(page.viewerPage).toBeUndefined();
      expect(page.currentPage).toBe(7);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('pageRendered and pageChange do not feed back into viewer navigation', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    await settleInitialViewerPageCommand();

    page.handlePageChange(5);
    page.handlePageRendered({ pageNumber: 5, cssTransform: false, source: {} as never });
    await Promise.resolve();

    expect(page.currentPage).toBe(5);
    expect(page.viewerPage).toBeUndefined();
  });

  it('leaving disconnects active resize handling and clears the viewer command state', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.handlePageRendered({ pageNumber: 6, cssTransform: false, source: {} as never });
    page.handlePageChange(6);

    boundingRectSpy.and.returnValue({
      width: 420,
      height: 740,
      top: 0,
      left: 0,
      right: 420,
      bottom: 740,
      x: 0,
      y: 0,
      toJSON: () => '',
    } as DOMRect);

    jasmine.clock().install();
    try {
      page.handleOrientationChange();
      page.ionViewWillLeave();
      jasmine.clock().tick(200);

      expect(page.viewerPage).toBe(1);
      expect(page.pdfSourceUrl).toBeNull();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('reopening starts a fresh reader session with a single initial page command', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValues(
      of(manual),
      of({ ...manual, pdf_url: 'https://example.com/manual.pdf?X-Amz-Signature=second' })
    );

    await createComponent();
    page.handlePageRendered({ pageNumber: 3, cssTransform: false, source: {} as never });
    await Promise.resolve();

    page.ionViewDidLeave();
    page.ionViewWillEnter();
    fixture.detectChanges();
    await Promise.resolve();
    page.ionViewDidEnter();
    await Promise.resolve();
    fixture.detectChanges();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
    expect(page.viewerPage).toBe(1);
  });

  it('does not advance pages while idle after the document is ready', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    await settleInitialViewerPageCommand();
    page.handlePageRendered({ pageNumber: 20, cssTransform: false, source: {} as never });
    page.handlePageChange(20);
    await Promise.resolve();

    jasmine.clock().install();
    try {
      page.handleViewportResize();
      jasmine.clock().tick(500);

      expect(page.currentPage).toBe(20);
      expect(page.viewerPage).toBeUndefined();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('uses the shared stack back flow for the reader with the manual detail fallback', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    await page.goBackToManual();

    expect(stackNavigationService.backWithFallback).toHaveBeenCalledWith('/bible-study/14');
  });

  it('falls back to the Bible Study list when the reader has no previous history and no manual is loaded', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();
    page.manual = null;

    await page.goBackToManual();

    expect(stackNavigationService.backWithFallback).toHaveBeenCalledWith('/tabs/bible-study');
  });

  it('does not render the tabs bar inside the full-screen reader flow', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    expect(fixture.nativeElement.querySelector('[data-testid="tabs-bar"]')).toBeNull();
  });

  it('leaving clears timers and viewer source', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    jasmine.clock().install();
    try {
      await createComponent();

      page.handlePdfLoadingStarts({});
      page.ionViewDidLeave();
      jasmine.clock().tick(12001);
      fixture.detectChanges();

      expect(page.pdfSourceUrl).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')).toBeNull();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('shows an invalid id error without calling the API', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent('abc');

    expect(bibleStudyService.getPublishedManualDetail).not.toHaveBeenCalled();
    expect(page.errorMessage).toBe('Invalid Bible Study manual ID.');
  });
});
