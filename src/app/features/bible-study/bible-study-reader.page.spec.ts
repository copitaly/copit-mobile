import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { of, throwError } from 'rxjs';
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
  @Input() page = 1;
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
  let dispatchEventSpy: jasmine.Spy<(event: Event) => boolean>;

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

  beforeEach(() => {
    bibleStudyService = jasmine.createSpyObj<BibleStudyService>('BibleStudyService', ['getPublishedManualDetail']);
    stackNavigationService = jasmine.createSpyObj<StackNavigationService>('StackNavigationService', ['backWithFallback']);
    stackNavigationService.backWithFallback.and.returnValue(Promise.resolve());
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(16);
      return 1;
    });
    dispatchEventSpy = spyOn(window, 'dispatchEvent').and.callThrough();
    spyOn(HTMLElement.prototype, 'getBoundingClientRect').and.returnValue({
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

    expect(bibleStudyService.getPublishedManualDetail).toHaveBeenCalledWith(14);
    const viewer = fixture.debugElement.query(By.directive(MockBibleStudyPdfViewerComponent))
      ?.componentInstance as MockBibleStudyPdfViewerComponent | undefined;

    expect(viewer?.src).toBe('https://example.com/manual.pdf?X-Amz-Signature=fresh');
    expect(dispatchEventSpy).toHaveBeenCalled();
  });

  it('does not create the viewer before a usable pdf_url exists', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of({ ...manual, pdf_url: '   ' }));

    await createComponent();

    expect(fixture.debugElement.query(By.directive(MockBibleStudyPdfViewerComponent))).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="reader-no-pdf-state"]')).not.toBeNull();
  });

  it('shows the loading state before the manual arrives', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    page.loading = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="reader-loading-state"]')).not.toBeNull();
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
      'fresh signed copy'
    );

    page.retryPdfLoad();
    fixture.detectChanges();

    expect(bibleStudyService.getPublishedManualDetail.calls.count()).toBe(2);
    expect(page.pdfSourceUrl).toBe('https://example.com/manual.pdf?X-Amz-Signature=renewed');
  });

  it('does not start the timeout before the viewer reports load start', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    jasmine.clock().install();
    try {
      await createComponent();

      jasmine.clock().tick(12001);
      fixture.detectChanges();

      expect(page.pdfLoading).toBeTrue();
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
      "couldn't finish loading"
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

    expect(fixture.nativeElement.querySelector('[data-testid="pdf-loading-state"]')?.textContent).toContain('42%');

    page.handlePageRendered({ pageNumber: 1, cssTransform: false, source: {} as never });
    fixture.detectChanges();

    expect(page.pdfLoading).toBeFalse();
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-loading-state"]')).toBeNull();
  });

  it('shows retry when the viewer emits a loading failure', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    page.handlePdfLoadingFailed(new Error('render failed'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="reader-pdf-error-state"]')?.textContent).toContain(
      'fresh signed copy'
    );
  });

  it('updates page and zoom controls from viewer events', async () => {
    bibleStudyService.getPublishedManualDetail.and.returnValue(of(manual));

    await createComponent();

    page.handlePagesLoaded({ source: null, pagesCount: 18 });
    page.handlePageChange(4);
    page.handleCurrentZoomFactor(1.5);
    page.zoomIn();
    fixture.detectChanges();

    expect(page.totalPages).toBe(18);
    expect(page.currentPage).toBe(4);
    expect(page.zoom).toBe('175%');
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

    expect(stackNavigationService.backWithFallback).toHaveBeenCalledWith('/bible-study');
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
