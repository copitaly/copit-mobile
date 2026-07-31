import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, HostListener, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import {
  PageRenderedEvent,
  PagesLoadedEvent,
  PdfLoadedEvent,
  PdfLoadingStartsEvent,
  ProgressBarEvent,
} from 'ngx-extended-pdf-viewer';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { BibleStudyDownloadService } from '../../core/services/bible-study-download.service';
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
  private static readonly VIEWPORT_RESIZE_DEBOUNCE_MS = 140;
  private static readonly VIEWPORT_SIZE_THRESHOLD_PX = 12;
  private static readonly DEFAULT_ZOOM: ZoomPreset = 'page-width';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly bibleStudyDownloadService = inject(BibleStudyDownloadService);
  private readonly stackNavigation = inject(StackNavigationService);
  private readonly toastController = inject(ToastController);
  private readonly host = inject(ElementRef<HTMLElement>);
  private pdfLoadTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private viewerLayoutTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private viewportResizeTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private manualRequestSubscription?: Subscription;
  private pdfLoadStarted = false;
  private hasRenderedVisiblePage = false;
  private isViewActive = false;
  private loadRequestId = 0;
  private pendingViewerActivation = false;
  private initialFitApplied = false;
  private pendingViewportWidth = 0;
  private pendingViewportHeight = 0;
  private lastViewportWidth = 0;
  private lastViewportHeight = 0;
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
  downloadingPdf = false;

  currentPage = 1;
  totalPages = 0;
  viewerPage: number | undefined = 1;
  zoom: ZoomPreset = BibleStudyReaderPage.DEFAULT_ZOOM;
  zoomPercent = 100;
  readonly minZoomPercent = 50;
  readonly maxZoomPercent = 400;

  @ViewChild('viewerSurface') private readonly viewerSurface?: ElementRef<HTMLElement>;

  ionViewWillEnter(): void {
    this.isViewActive = true;
    this.loadManual();
  }

  ionViewDidEnter(): void {
    this.isViewActive = true;
    this.scheduleViewerActivation();
  }

  ionViewWillLeave(): void {
    this.teardownActiveSession();
  }

  ionViewDidLeave(): void {
    this.teardownActiveSession();
  }

  ngOnDestroy(): void {
    this.teardownActiveSession();
  }

  @HostListener('window:resize')
  handleViewportResize(): void {
    this.scheduleViewportStabilization('resize');
  }

  @HostListener('window:orientationchange')
  handleOrientationChange(): void {
    this.scheduleViewportStabilization('orientation');
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
    this.manualRequestSubscription = this.bibleStudyService.getPublishedManualDetail(rawId).subscribe({
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
        this.errorMessage = this.notFound ? '' : this.resolveManualLoadErrorMessage(error);
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
    await this.stackNavigation.backWithFallback('/tabs/bible-study');
  }

  async goBackToList(): Promise<void> {
    await this.stackNavigation.backWithFallback('/tabs/bible-study');
  }

  async downloadPdf(): Promise<void> {
    if (!this.manual?.id || this.downloadingPdf) {
      return;
    }

    this.downloadingPdf = true;

    try {
      const freshManual = await this.loadFreshManual(this.manual.id);
      this.manual = freshManual;
      await this.downloadFromManual(freshManual, false);
    } catch (error) {
      await this.presentToast(this.resolveDownloadErrorMessage(error), 'alert-circle-outline');
    } finally {
      this.downloadingPdf = false;
    }
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
  }

  handlePageRendered(event: PageRenderedEvent): void {
    this.currentPage = event.pageNumber;
    this.hasRenderedVisiblePage = true;
    this.initialFitApplied = true;
    this.pdfLoading = false;
    this.clearViewerPageCommand(event.pageNumber);
    this.captureViewportDimensions();
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
    this.clearViewerPageCommand(page);
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
    this.zoom = BibleStudyReaderPage.DEFAULT_ZOOM;
    this.zoomPercent = 100;
  }

  get readerTitle(): string {
    return 'Bible Study';
  }

  get readerBackFallbackRoute(): string {
    return '/tabs/bible-study';
  }

  get readerSubtitle(): string {
    return 'Reader';
  }

  get isReaderReady(): boolean {
    return this.readerState === 'ready' && this.hasRenderedVisiblePage && !this.pdfErrorMessage;
  }

  get showReaderLoadingShell(): boolean {
    return (
      !this.loading &&
      !this.notFound &&
      !this.errorMessage &&
      !!this.manual &&
      this.pdfAvailable &&
      !this.pdfErrorMessage &&
      !this.isReaderReady
    );
  }

  get readerLoadingTitle(): string {
    switch (this.readerState) {
      case 'loading-document':
        return 'Loading PDF...';
      case 'rendering':
        return this.viewerProgressPercent > 0
          ? `Rendering pages (${this.viewerProgressPercent}%)...`
          : 'Rendering pages...';
      case 'loading-manual':
      default:
        return 'Preparing your manual...';
    }
  }

  get readerLoadingMessage(): string {
    switch (this.readerState) {
      case 'loading-document':
        return 'Starting the document viewer and fetching the PDF.';
      case 'rendering':
        return 'Rendering the first page for reading.';
      case 'loading-manual':
      default:
        return 'Requesting a fresh signed PDF link.';
    }
  }

  get toolbarDisabled(): boolean {
    return this.readerState !== 'ready' || !this.pdfAvailable || !!this.pdfErrorMessage || !this.totalPages;
  }

  get downloadDisabled(): boolean {
    return this.downloadingPdf || !this.manual?.id || !this.pdfAvailable || !!this.pdfErrorMessage;
  }

  get downloadActionAriaLabel(): string {
    return this.downloadingPdf ? 'Downloading PDF' : 'Download PDF';
  }

  formatPageIndicator(): string {
    if (!this.totalPages) {
      return 'Page -';
    }

    return `${this.currentPage} / ${this.totalPages}`;
  }

  get defaultZoomMode(): ZoomPreset {
    return BibleStudyReaderPage.DEFAULT_ZOOM;
  }

  private prepareViewer(): void {
    this.clearPdfLoadTimeout();
    this.clearViewerLayoutTimer();
    this.clearViewportResizeTimer();
    this.pdfLoadStarted = false;
    this.viewerVisible = false;
    this.pdfLoading = false;
    this.pdfErrorMessage = '';
    this.viewerProgressPercent = 0;
    this.hasRenderedVisiblePage = false;
    this.pendingViewerActivation = true;
    this.initialFitApplied = false;
    this.lastViewportWidth = 0;
    this.lastViewportHeight = 0;
    this.pendingViewportWidth = 0;
    this.pendingViewportHeight = 0;
    this.currentPage = 1;
    this.totalPages = 0;
    this.viewerPage = 1;
    this.zoom = BibleStudyReaderPage.DEFAULT_ZOOM;
    this.zoomPercent = 100;
    this.setReaderState('loading-document', { action: 'prepare-viewer' });
  }

  private resetViewerState(): void {
    this.clearPdfLoadTimeout();
    this.clearViewerLayoutTimer();
    this.clearViewportResizeTimer();
    this.viewerVisible = false;
    this.pdfLoading = false;
    this.pdfLoadStarted = false;
    this.pendingViewerActivation = false;
    this.hasRenderedVisiblePage = false;
    this.initialFitApplied = false;
    this.pdfAvailable = false;
    this.pdfSourceUrl = null;
    this.viewerProgressPercent = 0;
    this.viewerRefreshToken += 1;
    this.lastViewportWidth = 0;
    this.lastViewportHeight = 0;
    this.pendingViewportWidth = 0;
    this.pendingViewportHeight = 0;
    this.currentPage = 1;
    this.totalPages = 0;
    this.viewerPage = 1;
    this.zoom = BibleStudyReaderPage.DEFAULT_ZOOM;
    this.zoomPercent = 100;
    this.downloadingPdf = false;
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
    if (width > 0 && height > 0) {
      this.viewerVisible = false;
      queueMicrotask(() => {
        if (!this.isViewActive || !this.pendingViewerActivation || !this.pdfSourceUrl) {
          return;
        }

        this.viewerVisible = true;
        this.pendingViewerActivation = false;
        this.captureViewportDimensions();
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

  private clearViewerLayoutTimer(): void {
    if (!this.viewerLayoutTimeoutId) {
      return;
    }

    clearTimeout(this.viewerLayoutTimeoutId);
    this.viewerLayoutTimeoutId = undefined;
  }

  private clearViewportResizeTimer(): void {
    if (!this.viewportResizeTimeoutId) {
      return;
    }

    clearTimeout(this.viewportResizeTimeoutId);
    this.viewportResizeTimeoutId = undefined;
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
    this.clearViewportResizeTimer();
    this.pdfErrorMessage = '';
    this.loading = false;
    this.resetViewerState();
  }

  private scheduleViewportStabilization(reason: 'resize' | 'orientation'): void {
    if (!this.isViewActive || !this.viewerVisible || !this.pdfSourceUrl) {
      return;
    }

    const dimensions = this.measureViewerViewport();
    if (!dimensions) {
      return;
    }

    const widthDelta = Math.abs(dimensions.width - this.lastViewportWidth);
    const heightDelta = Math.abs(dimensions.height - this.lastViewportHeight);

    if (
      this.lastViewportWidth > 0 &&
      this.lastViewportHeight > 0 &&
      widthDelta < BibleStudyReaderPage.VIEWPORT_SIZE_THRESHOLD_PX &&
      heightDelta < BibleStudyReaderPage.VIEWPORT_SIZE_THRESHOLD_PX
    ) {
      return;
    }

    this.pendingViewportWidth = dimensions.width;
    this.pendingViewportHeight = dimensions.height;
    this.clearViewportResizeTimer();
    this.viewportResizeTimeoutId = setTimeout(() => {
      this.applyViewportStabilization(reason);
    }, BibleStudyReaderPage.VIEWPORT_RESIZE_DEBOUNCE_MS);
  }

  private applyViewportStabilization(reason: 'resize' | 'orientation'): void {
    this.viewportResizeTimeoutId = undefined;
    if (!this.isViewActive || !this.viewerVisible || !this.pdfSourceUrl) {
      return;
    }

    this.lastViewportWidth = this.pendingViewportWidth;
    this.lastViewportHeight = this.pendingViewportHeight;

    if (!this.initialFitApplied || this.currentPage <= 0) {
      return;
    }

    this.viewerPage = this.currentPage;
    void reason;
  }

  private captureViewportDimensions(): void {
    const dimensions = this.measureViewerViewport();
    if (!dimensions) {
      return;
    }

    this.lastViewportWidth = dimensions.width;
    this.lastViewportHeight = dimensions.height;
  }

  private measureViewerViewport(): { width: number; height: number } | null {
    const surface =
      this.viewerSurface?.nativeElement ??
      (this.host.nativeElement.querySelector('.reader-viewer') as HTMLElement | null);
    if (!surface) {
      return null;
    }

    const { width, height } = surface.getBoundingClientRect();
    if (width <= 0 || height <= 0) {
      return null;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  private clearViewerPageCommand(page: number): void {
    if (this.viewerPage !== page) {
      return;
    }

    queueMicrotask(() => {
      if (this.viewerPage === page) {
        this.viewerPage = undefined;
      }
    });
  }

  private normalizePdfSourceUrl(value: string | null): string | null {
    return this.bibleStudyService.normalizeDocumentUrl(value);
  }

  private async loadFreshManual(id: number): Promise<BibleStudyManualDetail> {
    return new Promise<BibleStudyManualDetail>((resolve, reject) => {
      this.bibleStudyService.getPublishedManualDetail(id).subscribe({
        next: resolve,
        error: reject,
      });
    });
  }

  private async downloadFromManual(manual: BibleStudyManualDetail, hasRetried: boolean): Promise<void> {
    const pdfUrl = this.bibleStudyService.normalizeDocumentUrl(manual.pdf_url);
    if (!pdfUrl) {
      await this.presentToast('This manual does not currently have a readable PDF link.', 'alert-circle-outline');
      return;
    }

    const fileName = this.buildDownloadFileName(manual);

    try {
      const result = await this.bibleStudyDownloadService.downloadPdf(pdfUrl, fileName);
      const successMessage = result.shared
        ? `${result.fileName} is ready from your device share sheet.`
        : `${result.fileName} saved to ${result.locationLabel}.`;
      await this.presentToast(successMessage, 'checkmark-circle-outline');
    } catch (error) {
      if (!hasRetried && this.shouldRetryExpiredLink(error)) {
        const refreshedManual = await this.loadFreshManual(manual.id);
        this.manual = refreshedManual;
        await this.downloadFromManual(refreshedManual, true);
        return;
      }

      throw error;
    }
  }

  private buildDownloadFileName(manual: BibleStudyManualDetail): string {
    const title = this.slugifySegment(manual.title, 'bible-study-manual');
    const language = this.slugifySegment(manual.language_display || manual.language, 'manual');
    return `${title}-${manual.year}-${language}.pdf`;
  }

  private slugifySegment(value: string | null | undefined, fallback: string): string {
    const normalized = (value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    return normalized || fallback;
  }

  private shouldRetryExpiredLink(error: unknown): boolean {
    const message = String((error as { message?: string } | undefined)?.message ?? '').toLowerCase();
    return (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('expired') ||
      message.includes('unauthorized') ||
      message.includes('signature')
    );
  }

  private resolveDownloadErrorMessage(error: unknown): string {
    const message = String((error as { message?: string } | undefined)?.message ?? '').toLowerCase();

    if (message.includes('permission')) {
      return 'Storage permission is required to download this PDF.';
    }

    if (message.includes('unauthorized') || message.includes('401') || message.includes('403') || message.includes('expired')) {
      return 'This PDF link expired. Please try again to fetch a fresh copy.';
    }

    if (message.includes('timeout')) {
      return 'Downloading this manual timed out. Please try again.';
    }

    if (message.includes('offline') || message.includes('network')) {
      return 'You appear to be offline. Check your connection and try again.';
    }

    if (message.includes('invalid') || message.includes('unsupported')) {
      return 'This PDF link is invalid or unsupported.';
    }

    return 'We could not download this manual right now. Please try again.';
  }

  private resolvePdfErrorMessage(error: Error): string {
    const message = String(error?.message ?? '').toLowerCase();
    if (message.includes('invalid') || message.includes('unsupported') || message.includes('malformed')) {
      return 'This PDF link is invalid or unsupported. Return to the manual and try again later.';
    }
    if (message.includes('403') || message.includes('401') || message.includes('expired') || message.includes('unauthorized')) {
      return 'This PDF link may have expired. Retry to request a fresh signed copy.';
    }
    if (message.includes('timeout') || message.includes('viewer asset') || message.includes('worker')) {
      return "The PDF viewer couldn't finish loading. Retry to request a fresh signed copy and reload the document.";
    }

    return "We couldn't render this PDF right now. Retry to request a fresh signed copy.";
  }

  private resolveManualLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'You appear to be offline. Check your connection and try again.';
      }

      if (error.status === 401 || error.status === 403) {
        return 'This manual is not available right now. Please try again shortly.';
      }
    }

    const message = String((error as { message?: string } | undefined)?.message ?? '').toLowerCase();
    if (message.includes('timeout')) {
      return 'Loading this manual timed out. Please try again.';
    }

    return "We couldn't load this Bible Study manual right now.";
  }

  private setReaderState(nextState: ReaderState, context: Record<string, unknown>): void {
    this.readerState = nextState;
    void context;
  }

  private async presentToast(message: string, icon: string): Promise<void> {
    try {
      const toast = await this.toastController.create({
        message,
        icon,
        duration: 2600,
        position: 'bottom',
        cssClass: 'branch-save-toast',
      });
      await toast.present();
    } catch {
      // ignore toast errors
    }
  }
}
