import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { BibleStudyManualListItem } from '../../core/models/bible-study.model';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, FeaturePageShellComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-bible-study',
  templateUrl: './bible-study.page.html',
  styleUrls: ['./bible-study.page.scss'],
})
export class BibleStudyPage implements OnInit {
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly router = inject(Router);
  private loadRequestId = 0;
  private pendingManualId: number | null = null;

  manuals: BibleStudyManualListItem[] = [];
  loading = true;
  refreshing = false;
  errorMessage = '';
  loadMoreErrorMessage = '';

  readonly skeletonItems = [1, 2, 3];

  ngOnInit(): void {
    this.loadManuals();
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
    void this.router.navigateByUrl(`/bible-study/${manual.id}`).finally(() => {
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

  private mergeUniqueManuals(incoming: BibleStudyManualListItem[]): BibleStudyManualListItem[] {
    const manualMap = new Map<number, BibleStudyManualListItem>();
    for (const manual of incoming) {
      manualMap.set(manual.id, manual);
    }

    return Array.from(manualMap.values());
  }
}
