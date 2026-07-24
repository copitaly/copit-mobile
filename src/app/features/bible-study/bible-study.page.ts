import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { BibleStudyManualListItem } from '../../core/models/bible-study.model';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-bible-study',
  templateUrl: './bible-study.page.html',
  styleUrls: ['./bible-study.page.scss'],
})
export class BibleStudyPage implements OnInit {
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly router = inject(Router);

  manuals: BibleStudyManualListItem[] = [];
  loading = true;
  errorMessage = '';

  readonly skeletonItems = [1, 2, 3];

  ngOnInit(): void {
    this.loadManuals();
  }

  loadManuals(): void {
    this.loading = true;
    this.errorMessage = '';
    this.manuals = [];

    this.bibleStudyService.getPublishedManuals().subscribe({
      next: (response) => {
        this.manuals = response.results;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = "We couldn't load Bible Study manuals right now.";
      },
    });
  }

  retryLoad(): void {
    this.loadManuals();
  }

  openManual(manual: BibleStudyManualListItem): void {
    void this.router.navigateByUrl(`/bible-study/${manual.id}`);
  }

  formatWeekRange(manual: BibleStudyManualListItem): string {
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
