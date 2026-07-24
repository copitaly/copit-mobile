import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-bible-study-detail',
  templateUrl: './bible-study-detail.page.html',
  styleUrls: ['./bible-study-detail.page.scss'],
})
export class BibleStudyDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly toastController = inject(ToastController);

  manual: BibleStudyManualDetail | null = null;
  loading = true;
  openingPdf = false;
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
    this.openingPdf = false;
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

  async openPdf(): Promise<void> {
    if (!this.manual?.pdf_url || this.openingPdf) {
      return;
    }

    this.openingPdf = true;

    try {
      const openedWindow = window.open(this.manual.pdf_url, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        throw new Error('Failed to open PDF window.');
      }
    } catch {
      const toast = await this.toastController.create({
        message: 'Unable to open this PDF right now. Please try again.',
        duration: 2600,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.openingPdf = false;
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
    return trimmed || null;
  }
}
