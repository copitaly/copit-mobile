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
  private static readonly DEV_DIAGNOSTICS = typeof ngDevMode !== 'undefined' && !!ngDevMode;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly bibleStudyDownloadService = inject(BibleStudyDownloadService);
  private readonly toastController = inject(ToastController);

  manual: BibleStudyManualDetail | null = null;
  loading = true;
  openingReader = false;
  downloadingPdf = false;
  notFound = false;
  errorMessage = '';

  readonly skeletonItems = [1, 2, 3];

  ngOnInit(): void {
    this.loadManual();
  }

  loadManual(): void {
    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(rawId) || rawId <= 0) {
      this.loading = false;
      this.notFound = false;
      this.errorMessage = 'Invalid Bible Study manual ID.';
      this.manual = null;
      return;
    }

    this.loading = true;
    this.openingReader = false;
    this.downloadingPdf = false;
    this.notFound = false;
    this.errorMessage = '';
    this.manual = null;

    this.bibleStudyService.getPublishedManualDetail(rawId).subscribe({
      next: (manual) => {
        this.manual = manual;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.manual = null;
        this.notFound = error instanceof HttpErrorResponse && error.status === 404;
        this.errorMessage = this.notFound
          ? ''
          : "We couldn't load this Bible Study manual right now.";
      },
    });
  }

  async openReader(): Promise<void> {
    if (!this.manual?.pdf_url || this.openingReader) {
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
      this.logDiagnostics('download fresh manual', { manualId: freshManual.id, hasPdfUrl: !!freshManual.pdf_url });
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
    const pdfUrl = this.normalizePdfUrl(manual.pdf_url);
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
        this.logDiagnostics('download retry fresh manual', {
          manualId: refreshedManual.id,
          hasPdfUrl: !!refreshedManual.pdf_url,
        });
        await this.downloadFromManual(refreshedManual, true);
        return;
      }

      throw error;
    }
  }

  private normalizePdfUrl(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed || null;
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

    return 'We could not download this manual right now. Please try again.';
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

  private logDiagnostics(event: string, payload: Record<string, unknown>): void {
    if (!BibleStudyDetailPage.DEV_DIAGNOSTICS) {
      return;
    }

    console.debug('[BibleStudyDetail]', event, payload);
  }
}
