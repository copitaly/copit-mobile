import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { BibleStudyManualListItem } from '../../core/models/bible-study.model';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { MobileContentRowComponent } from '../../shared/mobile-content-row.component';
import { MobileHeroCardComponent } from '../../shared/mobile-hero-card.component';
import { MobileSectionHeaderComponent } from '../../shared/mobile-section-header.component';

interface ContinueReadingSnapshot {
  manualId: number;
  currentPage: number;
  totalPages: number;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    MobileHeroCardComponent,
    MobileSectionHeaderComponent,
    MobileContentRowComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-bible-study',
  templateUrl: './bible-study.page.html',
  styleUrls: ['./bible-study.page.scss'],
})
export class BibleStudyPage implements OnInit {
  private static readonly CONTINUE_READING_STORAGE_KEY = 'copit.bible-study.progress';
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly router = inject(Router);
  private loadRequestId = 0;
  private pendingManualId: number | null = null;

  manuals: BibleStudyManualListItem[] = [];
  continueReadingSnapshot: ContinueReadingSnapshot | null = null;
  loading = true;
  refreshing = false;
  errorMessage = '';
  loadMoreErrorMessage = '';

  readonly skeletonItems = [1, 2, 3, 4];

  ngOnInit(): void {
    this.loadManuals();
  }

  get continueReadingManual(): BibleStudyManualListItem | null {
    if (!this.continueReadingSnapshot) {
      return null;
    }

    return this.manuals.find((manual) => manual.id === this.continueReadingSnapshot?.manualId) ?? null;
  }

  get featuredManual(): BibleStudyManualListItem | null {
    return this.manuals[0] ?? null;
  }

  get heroManual(): BibleStudyManualListItem | null {
    return this.continueReadingManual ?? this.featuredManual;
  }

  get hasContinueReading(): boolean {
    return !!this.continueReadingManual && !!this.continueReadingSnapshot;
  }

  get heroSectionSubtitle(): string {
    return this.hasContinueReading
      ? 'Pick up where you left off in your current manual.'
      : 'Start with the newest published manual available to read now.';
  }

  get heroTitle(): string {
    return this.heroManual?.title ?? 'Bible Study';
  }

  get heroMeta(): string {
    const manual = this.heroManual;
    if (!manual) {
      return '';
    }

    return [`${manual.year}`, manual.language_display].filter(Boolean).join(' · ');
  }

  get heroDetail(): string {
    const manual = this.heroManual;
    if (!manual) {
      return '';
    }

    return [this.formatVolume(manual.volume), this.formatWeekRange(manual)].filter(Boolean).join(' · ');
  }

  get heroCtaLabel(): string {
    return this.hasContinueReading ? 'Resume Reading' : 'Start Reading';
  }

  get heroProgressLabel(): string {
    if (!this.hasContinueReading || !this.continueReadingSnapshot) {
      return '';
    }

    return `Page ${this.continueReadingSnapshot.currentPage} of ${this.continueReadingSnapshot.totalPages}`;
  }

  get heroProgressPercent(): number | null {
    if (!this.hasContinueReading || !this.continueReadingSnapshot) {
      return null;
    }

    const { currentPage, totalPages } = this.continueReadingSnapshot;
    if (totalPages <= 0) {
      return null;
    }

    return Math.max(0, Math.min(100, Math.round((currentPage / totalPages) * 100)));
  }

  get heroAriaLabel(): string {
    return this.hasContinueReading
      ? `Resume reading ${this.heroTitle}`
      : `Open featured Bible Study manual ${this.heroTitle}`;
  }

  loadManuals(options?: { preserveExisting?: boolean; complete?: () => void }): void {
    const preserveExisting = !!options?.preserveExisting && this.manuals.length > 0;
    const requestId = ++this.loadRequestId;
    this.loading = !preserveExisting;
    this.refreshing = preserveExisting;
    this.errorMessage = '';
    this.loadMoreErrorMessage = '';
    if (!preserveExisting) {
      this.manuals = [];
    }

    this.bibleStudyService.getPublishedManuals().subscribe({
      next: (response) => {
        if (requestId !== this.loadRequestId) {
          options?.complete?.();
          return;
        }

        this.manuals = this.mergeUniqueManuals(response.results);
        this.continueReadingSnapshot = this.resolveContinueReadingSnapshot(this.manuals);
        this.loading = false;
        this.refreshing = false;
        options?.complete?.();
      },
      error: () => {
        if (requestId !== this.loadRequestId) {
          options?.complete?.();
          return;
        }

        this.loading = false;
        this.refreshing = false;
        if (preserveExisting) {
          this.loadMoreErrorMessage = "We couldn't refresh Bible Study manuals right now. Please try again.";
        } else {
          this.errorMessage = "We couldn't load Bible Study manuals right now.";
        }
        options?.complete?.();
      },
    });
  }

  retryLoad(): void {
    this.loadManuals();
  }

  refresh(event: CustomEvent<{ complete: () => void }>): void {
    if (this.refreshing) {
      event.detail.complete();
      return;
    }

    this.loadManuals({ preserveExisting: true, complete: () => event.detail.complete() });
  }

  openManual(manual: BibleStudyManualListItem): void {
    if (!manual?.id || this.pendingManualId === manual.id) {
      return;
    }

    this.pendingManualId = manual.id;
    void this.router.navigateByUrl(`/bible-study/${manual.id}/read`).finally(() => {
      this.pendingManualId = null;
    });
  }

  openHero(): void {
    const manual = this.heroManual;
    if (!manual?.id || this.pendingManualId === manual.id) {
      return;
    }

    this.pendingManualId = manual.id;
    const target = `/bible-study/${manual.id}/read`;
    void this.router.navigateByUrl(target).finally(() => {
      this.pendingManualId = null;
    });
  }

  formatWeekRange(manual: BibleStudyManualListItem): string {
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

  trackByManualId(_: number, manual: BibleStudyManualListItem): number {
    return manual.id;
  }

  buildManualMeta(manual: BibleStudyManualListItem): string {
    return [`${manual.year}`, manual.language_display].filter(Boolean).join(' · ');
  }

  buildManualDetail(manual: BibleStudyManualListItem): string {
    return [this.formatVolume(manual.volume), this.formatWeekRange(manual)].filter(Boolean).join(' · ');
  }

  private resolveContinueReadingSnapshot(manuals: BibleStudyManualListItem[]): ContinueReadingSnapshot | null {
    try {
      const raw = sessionStorage.getItem(BibleStudyPage.CONTINUE_READING_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<ContinueReadingSnapshot> | null;
      const manualId = Number(parsed?.manualId);
      const currentPage = Number(parsed?.currentPage);
      const totalPages = Number(parsed?.totalPages);

      if (
        !Number.isInteger(manualId) ||
        !Number.isInteger(currentPage) ||
        !Number.isInteger(totalPages) ||
        manualId <= 0 ||
        currentPage <= 0 ||
        totalPages <= 0 ||
        currentPage > totalPages
      ) {
        return null;
      }

      return manuals.some((manual) => manual.id === manualId)
        ? { manualId, currentPage, totalPages }
        : null;
    } catch {
      return null;
    }
  }

  private mergeUniqueManuals(incoming: BibleStudyManualListItem[]): BibleStudyManualListItem[] {
    const manualMap = new Map<number, BibleStudyManualListItem>();
    for (const manual of incoming) {
      manualMap.set(manual.id, manual);
    }

    return Array.from(manualMap.values());
  }
}
