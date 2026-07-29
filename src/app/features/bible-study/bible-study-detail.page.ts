import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { BibleStudyDownloadService } from '../../core/services/bible-study-download.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, FeaturePageShellComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-bible-study-detail',
  templateUrl: './bible-study-detail.page.html',
  styleUrls: ['./bible-study-detail.page.scss'],
})
export class BibleStudyDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly bibleStudyDownloadService = inject(BibleStudyDownloadService);
  private readonly toastController = inject(ToastController);
  private loadRequestId = 0;

  manual: BibleStudyManualDetail | null = null;
  loading = true;
  refreshing = false;
  openingReader = false;
  downloadingPdf = false;
  notFound = false;
  errorMessage = '';
  refreshErrorMessage = '';

  readonly skeletonItems = [1, 2, 3];

  ngOnInit(): void {
    this.loadManual();
  }

  loadManual(options?: { preserveExisting?: boolean; complete?: () => void }): void {
    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(rawId) || rawId <= 0) {
      this.loading = false;
      this.refreshing = false;
      this.notFound = false;
      this.errorMessage = 'Invalid Bible Study manual ID.';
      this.manual = null;
      return;
    }

    const preserveExisting = !!options?.preserveExisting && !!this.manual;
    const requestId = ++this.loadRequestId;
    this.loading = !preserveExisting;
    this.refreshing = preserveExisting;
    this.openingReader = false;
    this.downloadingPdf = false;
    this.notFound = false;
    this.errorMessage = '';
    this.refreshErrorMessage = '';
    if (!preserveExisting) {
      this.manual = null;
    }

    this.bibleStudyService.getPublishedManualDetail(rawId).subscribe({
      next: (manual) => {
        if (requestId !== this.loadRequestId) {
          options?.complete?.();
          return;
        }

        this.manual = manual;
        this.loading = false;
        this.refreshing = false;
        options?.complete?.();
      },
      error: (error: unknown) => {
        if (requestId !== this.loadRequestId) {
          options?.complete?.();
          return;
        }

        this.loading = false;
        this.refreshing = false;
        const notFound = error instanceof HttpErrorResponse && error.status === 404;
        if (preserveExisting) {
          this.refreshErrorMessage = this.resolveDetailLoadErrorMessage(error);
        } else {
          this.manual = null;
          this.notFound = notFound;
          this.errorMessage = notFound ? '' : this.resolveDetailLoadErrorMessage(error);
        }
        options?.complete?.();
      },
    });
  }

  async openReader(): Promise<void> {
    if (!this.manual?.id || this.openingReader) {
      return;
    }

    const pdfUrl = this.bibleStudyService.normalizeDocumentUrl(this.manual.pdf_url);
    if (!pdfUrl) {
      await this.presentToast('This manual does not currently have a readable PDF link.', 'alert-circle-outline');
      return;
    }

    this.openingReader = true;

    try {
      await this.router.navigateByUrl(`/bible-study/${this.manual.id}/read`);
    } finally {
      this.openingReader = false;
    }
  }

  async downloadPdf(): Promise<void> {
    if (!this.manual?.id || this.downloadingPdf) {
      return;
    }

    this.downloadingPdf = true;

    try {
      const freshManual = await firstValueFrom(this.bibleStudyService.getPublishedManualDetail(this.manual.id));
      this.manual = freshManual;
      await this.downloadFromManual(freshManual, false);
    } catch (error) {
      await this.presentToast(this.resolveDownloadErrorMessage(error), 'alert-circle-outline');
    } finally {
      this.downloadingPdf = false;
    }
  }

  retryLoad(): void {
    this.loadManual();
  }

  refresh(event: CustomEvent<{ complete: () => void }>): void {
    if (this.refreshing) {
      event.detail.complete();
      return;
    }

    this.loadManual({ preserveExisting: true, complete: () => event.detail.complete() });
  }

  formatWeekRange(manual: Pick<BibleStudyManualDetail, 'start_week' | 'end_week'>): string {
    if (manual.start_week === null || manual.end_week === null) {
      return 'Full year';
    }

    return `Weeks ${manual.start_week}-${manual.end_week}`;
  }

  formatVolume(volume: string | null | undefined): string | null {
    const trimmed = volume?.trim() ?? '';
    if (!trimmed) {
      return null;
    }

    return /^volume\b/i.test(trimmed) ? trimmed : `Volume ${trimmed}`;
  }

  buildReaderAriaLabel(manual: Pick<BibleStudyManualDetail, 'language_display' | 'language'>): string {
    const languageLabel = manual.language_display?.trim() || manual.language?.trim() || 'Bible Study';
    return `Read ${languageLabel} Manual in the app`;
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
        const refreshedManual = await firstValueFrom(this.bibleStudyService.getPublishedManualDetail(manual.id));
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

  private resolveDetailLoadErrorMessage(error: unknown): string {
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
