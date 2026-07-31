import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, NgZone, OnDestroy, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { BibleStudyDownloadService } from '../../core/services/bible-study-download.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { ExternalBrowserService } from '../../core/services/external-browser.service';
import { StackNavigationService } from '../../core/services/stack-navigation.service';

type ReaderViewState = 'loading' | 'ready' | 'error';
type ReaderLoadingStage = 'manual' | 'pdf';
type ReaderErrorKind =
  | 'none'
  | 'invalid-id'
  | 'manual-not-found'
  | 'manual-load'
  | 'pdf-missing'
  | 'pdf-unavailable';

@Component({
  standalone: true,
  selector: 'app-bible-study-reader',
  imports: [CommonModule, IonicModule],
  templateUrl: './bible-study-reader.page.html',
  styleUrls: ['./bible-study-reader.page.scss'],
})
export class BibleStudyReaderPage implements OnDestroy {
  private static readonly IFRAME_LOAD_TIMEOUT_MS = 7000;

  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly bibleStudyDownloadService = inject(BibleStudyDownloadService);
  private readonly externalBrowserService = inject(ExternalBrowserService);
  private readonly stackNavigation = inject(StackNavigationService);
  private readonly toastController = inject(ToastController);
  private readonly sanitizer = inject(DomSanitizer);

  private iframeLoadTimeoutId: ReturnType<typeof setTimeout> | undefined;
  private manualRequestSubscription?: Subscription;
  private isViewActive = false;
  private loadRequestId = 0;
  private pendingReadyTransition = false;
  private nativeViewerOpenedForRequest = false;

  manual: BibleStudyManualDetail | null = null;
  pdfSourceUrl: string | null = null;
  pdfEmbedUrl: SafeResourceUrl | null = null;
  downloadingPdf = false;
  errorMessage = '';
  viewerState: ReaderViewState = 'loading';
  loadingStage: ReaderLoadingStage = 'manual';
  errorKind: ReaderErrorKind = 'none';

  ionViewWillEnter(): void {
    this.isViewActive = true;
    this.loadManual();
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

  loadManual(): void {
    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(rawId) || rawId <= 0) {
      this.manual = null;
      this.errorMessage = 'Invalid Bible Study manual ID.';
      this.resetPdfSurface();
      this.setErrorState('invalid-id');
      return;
    }

    this.cancelManualRequest();
    this.resetPdfSurface();
    this.viewerState = 'loading';
    this.loadingStage = 'manual';
    this.errorKind = 'none';
    this.errorMessage = '';
    this.manual = null;
    this.nativeViewerOpenedForRequest = false;

    const requestId = ++this.loadRequestId;
    this.manualRequestSubscription = this.bibleStudyService.getPublishedManualDetail(rawId).subscribe({
      next: (manual) => {
        if (!this.isViewActive || requestId !== this.loadRequestId) {
          return;
        }

        const pdfSourceUrl = this.normalizePdfSourceUrl(manual.pdf_url);
        this.manual = manual;
        this.pdfSourceUrl = pdfSourceUrl;

        if (!pdfSourceUrl) {
          this.setErrorState('pdf-missing', 'This manual does not currently have a readable PDF link.');
          return;
        }

        this.loadingStage = 'pdf';
        this.errorKind = 'none';
        this.errorMessage = '';

        if (this.usesNativeExternalViewer) {
          this.setErrorState('pdf-unavailable', 'This PDF opens in your device viewer for the best reading experience.');
          void this.openPdfExternally(true);
          return;
        }

        this.pdfEmbedUrl = this.buildPdfEmbedUrl(pdfSourceUrl);
        this.viewerState = 'loading';
        this.startIframeLoadTimeout();
      },
      error: (error: unknown) => {
        if (!this.isViewActive || requestId !== this.loadRequestId) {
          return;
        }

        this.manual = null;

        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.setErrorState('manual-not-found');
          return;
        }

        this.setErrorState('manual-load', this.resolveManualLoadErrorMessage(error));
      },
    });
  }

  retryLoad(): void {
    this.loadManual();
  }

  retryPdfLoad(): void {
    this.loadManual();
  }

  handleIframeLoad(): void {
    if (!this.isViewActive || !this.pdfSourceUrl || this.viewerState === 'ready' || this.pendingReadyTransition) {
      return;
    }

    this.clearIframeLoadTimeout();
    this.pendingReadyTransition = true;

    queueMicrotask(() => {
      this.ngZone.run(() => {
        this.pendingReadyTransition = false;
        if (!this.isViewActive || !this.pdfSourceUrl || this.viewerState !== 'loading' || this.errorKind !== 'none') {
          return;
        }

        this.viewerState = 'ready';
      });
    });
  }

  handleIframeError(): void {
    if (!this.isViewActive || !this.pdfSourceUrl) {
      return;
    }

    this.setErrorState('pdf-unavailable', 'Embedded PDF viewing is not available on this device right now.');
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

  async openPdfExternally(isAutomatic = false): Promise<void> {
    if (!this.pdfSourceUrl) {
      return;
    }

    if (isAutomatic) {
      if (this.nativeViewerOpenedForRequest) {
        return;
      }

      this.nativeViewerOpenedForRequest = true;
    }

    try {
      await this.externalBrowserService.openUrl(this.pdfSourceUrl);
    } catch {
      if (isAutomatic) {
        this.nativeViewerOpenedForRequest = false;
      }
      await this.presentToast('We could not open this PDF outside the app right now.', 'alert-circle-outline');
    }
  }

  get readerBackFallbackRoute(): string {
    return '/tabs/bible-study';
  }

  get isLoading(): boolean {
    return this.viewerState === 'loading';
  }

  get isReaderReady(): boolean {
    return this.viewerState === 'ready';
  }

  get isErrorState(): boolean {
    return this.viewerState === 'error';
  }

  get isNotFoundState(): boolean {
    return this.errorKind === 'manual-not-found';
  }

  get isGenericErrorState(): boolean {
    return this.isErrorState && (this.errorKind === 'manual-load' || this.errorKind === 'invalid-id');
  }

  get isPdfMissingState(): boolean {
    return this.isErrorState && this.errorKind === 'pdf-missing';
  }

  get isPdfUnavailableState(): boolean {
    return this.isErrorState && this.errorKind === 'pdf-unavailable';
  }

  get showPdfSurface(): boolean {
    return !this.usesNativeExternalViewer && !!this.manual && !!this.pdfEmbedUrl && !this.isPdfMissingState;
  }

  get showReaderLoadingShell(): boolean {
    return this.showPdfSurface && this.isLoading;
  }

  get readerLoadingTitle(): string {
    return 'Preparing your Bible Study';
  }

  get readerLoadingMessage(): string {
    return this.loadingStage === 'pdf' ? 'Opening the PDF for reading.' : 'Requesting a fresh signed PDF link.';
  }

  get downloadDisabled(): boolean {
    return this.downloadingPdf || !this.manual?.id || !this.pdfSourceUrl;
  }

  get openExternallyDisabled(): boolean {
    return !this.pdfSourceUrl;
  }

  get downloadActionAriaLabel(): string {
    return this.downloadingPdf ? 'Downloading PDF' : 'Download PDF';
  }

  get usesNativeExternalViewer(): boolean {
    return Capacitor.isNativePlatform();
  }

  private startIframeLoadTimeout(): void {
    this.clearIframeLoadTimeout();
    this.iframeLoadTimeoutId = setTimeout(() => {
      this.iframeLoadTimeoutId = undefined;
      if (!this.isViewActive || !this.pdfSourceUrl || this.viewerState !== 'loading') {
        return;
      }

      this.setErrorState('pdf-unavailable', 'Embedded PDF viewing is not available on this device right now.');
    }, BibleStudyReaderPage.IFRAME_LOAD_TIMEOUT_MS);
  }

  private clearIframeLoadTimeout(): void {
    if (!this.iframeLoadTimeoutId) {
      return;
    }

    clearTimeout(this.iframeLoadTimeoutId);
    this.iframeLoadTimeoutId = undefined;
  }

  private cancelManualRequest(): void {
    this.manualRequestSubscription?.unsubscribe();
    this.manualRequestSubscription = undefined;
  }

  private resetPdfSurface(): void {
    this.clearIframeLoadTimeout();
    this.pendingReadyTransition = false;
    this.nativeViewerOpenedForRequest = false;
    this.pdfSourceUrl = null;
    this.pdfEmbedUrl = null;
    this.downloadingPdf = false;
  }

  private teardownActiveSession(): void {
    this.isViewActive = false;
    this.cancelManualRequest();
    this.resetPdfSurface();
    this.viewerState = 'error';
    this.errorKind = 'none';
    this.errorMessage = '';
    this.manual = null;
  }

  private normalizePdfSourceUrl(value: string | null): string | null {
    return this.bibleStudyService.normalizeDocumentUrl(value);
  }

  private buildPdfEmbedUrl(sourceUrl: string): SafeResourceUrl {
    const separator = sourceUrl.includes('#') ? '&' : '#';
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${sourceUrl}${separator}view=FitH`);
  }

  private setErrorState(kind: ReaderErrorKind, message = ''): void {
    this.clearIframeLoadTimeout();
    this.pendingReadyTransition = false;
    this.viewerState = 'error';
    this.errorKind = kind;
    this.errorMessage = message;
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
