import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import {
  PageRenderedEvent,
  PagesLoadedEvent,
  PdfLoadedEvent,
  PdfLoadingStartsEvent,
  ProgressBarEvent,
} from 'ngx-extended-pdf-viewer';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';
import { BibleStudyPdfViewerComponent } from './bible-study-pdf-viewer.component';

type ZoomPreset = string | number;
type ReaderState = 'loading-manual' | 'loading-document' | 'rendering' | 'ready' | 'unavailable' | 'error';

@Component({
  standalone: true,
  selector: 'app-bible-study-reader',
  imports: [CommonModule, IonicModule, BibleStudyPdfViewerComponent, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './bible-study-reader.page.html',
  styleUrls: ['./bible-study-reader.page.scss'],
})
export class BibleStudyReaderPage implements OnDestroy {
  private static readonly PDF_LOAD_TIMEOUT_MS = 12000;
  private static readonly VIEWER_LAYOUT_RETRY_MS = 48;
  private static readonly VIEWER_LAYOUT_MAX_ATTEMPTS = 12;
  private static readonly DEV_DIAGNOSTICS = typeof ngDevMode !== 'undefined' && !!ngDevMode;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly stackNavigation = inject(StackNavigationService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private pdfLoadTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private viewerLayoutTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private manualRequestSubscription?: Subscription;
  private pdfLoadStarted = false;
  private hasRenderedVisiblePage = false;
  private isViewActive = false;
  private loadRequestId = 0;
  private pendingViewerActivation = false;
  private readerState: ReaderState = 'loading-manual';

  manual: BibleStudyManualDetail | null = null;
  loading = true;
  notFound = false;
  errorMessage = '';
  pdfErrorMessage = '';
  pdfAvailable = false;
  pdfLoading = false;
  viewerVisible = false;
  pdfSourceUrl: string | null = null;
  viewerRefreshToken = 0;
  viewerProgressPercent = 0;

  currentPage = 1;
  totalPages = 0;
  zoom: ZoomPreset = 'page-width';
  zoomPercent = 100;
  readonly minZoomPercent = 50;
  readonly maxZoomPercent = 400;

  @ViewChild('viewerSurface') private readonly viewerSurface?: ElementRef<HTMLElement>;

  ionViewWillEnter(): void {
    this.isViewActive = true;
    this.logDiagnostics('ionViewWillEnter', {});
    this.loadManual();
  }

  ionViewDidEnter(): void {
    this.isViewActive = true;
    this.logDiagnostics('ionViewDidEnter', {});
    this.scheduleViewerActivation();
  }

  ionViewWillLeave(): void {
    this.logDiagnostics('ionViewWillLeave', {});
    this.teardownActiveSession();
  }

  ionViewDidLeave(): void {
    this.logDiagnostics('ionViewDidLeave', {});
    this.teardownActiveSession();
  }

  ngOnDestroy(): void {
    this.teardownActiveSession();
  }

  loadManual(): void {
    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(rawId) || rawId <= 0) {
      this.loading = false;
      this.notFound = false;
      this.errorMessage = 'Invalid Bible Study manual ID.';
      this.manual = null;
      this.setReaderState('error', { reason: 'invalid-id' });
      this.resetViewerState();
      return;
    }

    this.cancelManualRequest();
    this.clearViewerLayoutTimer();
    this.loading = true;
    this.notFound = false;
    this.errorMessage = '';
    this.pdfErrorMessage = '';
    this.manual = null;
    this.resetViewerState();

    const requestId = ++this.loadRequestId;
    this.setReaderState('loading-manual', { requestId });
    this.manualRequestSubscription = this.bibleStudyService
      .getPublishedManualDetail(rawId)
      .subscribe({
        next: (manual) => {
          if (!this.isViewActive || requestId !== this.loadRequestId) {
            return;
          }

          const pdfSourceUrl = this.normalizePdfSourceUrl(manual.pdf_url);

          this.manual = manual;
          this.loading = false;
          this.pdfSourceUrl = pdfSourceUrl;
          this.pdfAvailable = !!pdfSourceUrl;
          if (pdfSourceUrl) {
            this.setReaderState('loading-document', { requestId });
            this.prepareViewer();
            this.scheduleViewerActivation();
          } else {
            this.setReaderState('unavailable', { reason: 'missing-pdf-url' });
          }
        },
        error: (error: unknown) => {
          if (!this.isViewActive || requestId !== this.loadRequestId) {
            return;
          }

          this.loading = false;
          this.manual = null;
          this.notFound = error instanceof HttpErrorResponse && error.status === 404;
          this.errorMessage = this.notFound
            ? ''
            : "We couldn't load this Bible Study manual right now.";
          this.setReaderState('error', { notFound: this.notFound });
        },
      });
  }

  retryLoad(): void {
    this.loadManual();
  }

  retryPdfLoad(): void {
    this.loadManual();
  }

  async goBackToManual(): Promise<void> {
    if (!this.manual?.id) {
      await this.stackNavigation.backWithFallback('/bible-study');
      return;
    }

    await this.stackNavigation.backWithFallback(`/bible-study/${this.manual.id}`);
  }

  async goBackToList(): Promise<void> {
    await this.stackNavigation.backWithFallback('/bible-study');
  }

  handlePagesLoaded(event: PagesLoadedEvent): void {
    this.totalPages = event.pagesCount;
  }

  handleViewerProgress(event: ProgressBarEvent): void {
    this.viewerProgressPercent = Number.isFinite(event.percent) ? event.percent : 0;
  }

  handlePdfLoadingStarts(_event: PdfLoadingStartsEvent): void {
    this.pdfLoadStarted = true;
    this.pdfLoading = true;
    this.setReaderState('rendering', { phase: 'pdf-loading-starts' });
    this.startPdfLoadTimeout();
  }

  handlePdfLoaded(event: PdfLoadedEvent): void {
    this.totalPages = event.pagesCount;
    this.pdfErrorMessage = '';
    this.logDiagnostics('pdfLoaded', { pagesCount: event.pagesCount });
  }

  handlePageRendered(event: PageRenderedEvent): void {
    this.currentPage = event.pageNumber;
    this.hasRenderedVisiblePage = true;
    this.pdfLoading = false;
    this.setReaderState('ready', { pageNumber: event.pageNumber });
    this.clearPdfLoadTimeout();
  }

  handlePdfLoadingFailed(error: Error): void {
    this.clearPdfLoadTimeout();
    this.clearViewerLayoutTimer();
    this.viewerVisible = false;
    this.pdfLoading = false;
    this.hasRenderedVisiblePage = false;
    this.pdfErrorMessage = this.resolvePdfErrorMessage(error);
    this.setReaderState('unavailable', { message: error?.message ?? 'pdf-load-failed' });
  }

  handlePageChange(page: number): void {
    this.currentPage = page;
  }

  handleCurrentZoomFactor(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) {
      return;
    }

    this.zoomPercent = Math.round(factor * 100);
  }

  zoomIn(): void {
    this.setZoomPercent(this.zoomPercent + 25);
  }

  zoomOut(): void {
    this.setZoomPercent(this.zoomPercent - 25);
  }

  resetZoom(): void {
    this.zoom = 'page-width';
    this.zoomPercent = 100;
  }

  get readerTitle(): string {
    return 'Bible Study';
  }

  get readerBackFallbackRoute(): string {
    return this.manual?.id ? `/bible-study/${this.manual.id}` : '/bible-study';
  }

  get readerSubtitle(): string {
    return 'Reader';
  }

  get toolbarDisabled(): boolean {
    return this.readerState !== 'ready' || !this.pdfAvailable || !!this.pdfErrorMessage || !this.totalPages;
  }

  formatPageIndicator(): string {
    if (!this.totalPages) {
      return 'Page -';
    }

    return `${this.currentPage} / ${this.totalPages}`;
  }

  private prepareViewer(): void {
    this.clearPdfLoadTimeout();
    this.clearViewerLayoutTimer();
    this.pdfLoadStarted = false;
    this.viewerVisible = false;
    this.pdfLoading = false;
    this.pdfErrorMessage = '';
    this.viewerProgressPercent = 0;
    this.hasRenderedVisiblePage = false;
    this.pendingViewerActivation = true;
    this.currentPage = 1;
    this.totalPages = 0;
    this.zoom = 'page-width';
    this.zoomPercent = 100;
    this.setReaderState('loading-document', { action: 'prepare-viewer' });
  }

  private resetViewerState(): void {
    this.clearPdfLoadTimeout();
    this.clearViewerLayoutTimer();
    this.viewerVisible = false;
    this.pdfLoading = false;
    this.pdfLoadStarted = false;
    this.pendingViewerActivation = false;
    this.hasRenderedVisiblePage = false;
    this.pdfAvailable = false;
    this.pdfSourceUrl = null;
    this.viewerProgressPercent = 0;
    this.viewerRefreshToken += 1;
    this.currentPage = 1;
    this.totalPages = 0;
    this.zoom = 'page-width';
    this.zoomPercent = 100;
  }

  private setZoomPercent(nextPercent: number): void {
    const clampedPercent = Math.max(this.minZoomPercent, Math.min(this.maxZoomPercent, nextPercent));
    this.zoom = `${clampedPercent}%`;
    this.zoomPercent = clampedPercent;
  }

  private clearPdfLoadTimeout(): void {
    if (!this.pdfLoadTimeoutId) {
      return;
    }

    clearTimeout(this.pdfLoadTimeoutId);
    this.pdfLoadTimeoutId = undefined;
  }

  private startPdfLoadTimeout(): void {
    this.clearPdfLoadTimeout();
    this.pdfLoadTimeoutId = setTimeout(() => {
      if (!this.pdfLoading || !this.pdfLoadStarted) {
        return;
      }

      this.handlePdfLoadingFailed(new Error('PDF viewer load timeout after start'));
    }, BibleStudyReaderPage.PDF_LOAD_TIMEOUT_MS);
  }

  private scheduleViewerActivation(attempt = 0): void {
    if (!this.isViewActive || !this.pendingViewerActivation || !this.pdfSourceUrl) {
      return;
    }

    const surface =
      this.viewerSurface?.nativeElement ??
      (this.host.nativeElement.querySelector('.reader-viewer') as HTMLElement | null);
    const { width, height } = surface?.getBoundingClientRect() ?? { width: 0, height: 0 };
    this.logDiagnostics('viewer container', { width, height, attempt });
    if (width > 0 && height > 0) {
      this.viewerVisible = false;
      queueMicrotask(() => {
        if (!this.isViewActive || !this.pendingViewerActivation || !this.pdfSourceUrl) {
          return;
        }

        this.viewerVisible = true;
        this.pendingViewerActivation = false;
        this.requestViewerReflow();
      });
      return;
    }

    if (attempt >= BibleStudyReaderPage.VIEWER_LAYOUT_MAX_ATTEMPTS) {
      this.handlePdfLoadingFailed(new Error('PDF viewer container height was not measurable after Ionic entry'));
      return;
    }

    this.clearViewerLayoutTimer();
    this.viewerLayoutTimeoutId = setTimeout(() => {
      this.scheduleViewerActivation(attempt + 1);
    }, BibleStudyReaderPage.VIEWER_LAYOUT_RETRY_MS);
  }

  private requestViewerReflow(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.isViewActive) {
          return;
        }

        window.dispatchEvent(new Event('resize'));
      });
    });
  }

  private clearViewerLayoutTimer(): void {
    if (!this.viewerLayoutTimeoutId) {
      return;
    }

    clearTimeout(this.viewerLayoutTimeoutId);
    this.viewerLayoutTimeoutId = undefined;
  }

  private cancelManualRequest(): void {
    this.manualRequestSubscription?.unsubscribe();
    this.manualRequestSubscription = undefined;
  }

  private teardownActiveSession(): void {
    this.isViewActive = false;
    this.cancelManualRequest();
    this.clearPdfLoadTimeout();
    this.clearViewerLayoutTimer();
    this.pdfErrorMessage = '';
    this.loading = false;
    this.resetViewerState();
  }

  private normalizePdfSourceUrl(value: string | null): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private resolvePdfErrorMessage(error: Error): string {
    const message = String(error?.message ?? '').toLowerCase();
    if (message.includes('403') || message.includes('401') || message.includes('expired') || message.includes('unauthorized')) {
      return 'This PDF link may have expired. Retry to request a fresh signed copy.';
    }
    if (message.includes('timeout') || message.includes('viewer asset') || message.includes('worker')) {
      return "The PDF viewer couldn't finish loading. Retry to request a fresh signed copy and reload the document.";
    }

    return "We couldn't render this PDF right now. Retry to request a fresh signed copy.";
  }

  private setReaderState(nextState: ReaderState, context: Record<string, unknown>): void {
    this.readerState = nextState;
    this.logDiagnostics('state', { state: nextState, ...context });
  }

  private logDiagnostics(event: string, payload: Record<string, unknown>): void {
    if (!BibleStudyReaderPage.DEV_DIAGNOSTICS) {
      return;
    }

    console.debug('[BibleStudyReader]', event, payload);
  }
}
