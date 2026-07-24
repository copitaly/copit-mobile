import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { BibleStudyManualDetail } from '../../core/models/bible-study.model';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-bible-study-detail',
  template: `
    <ion-page>
      <ion-content fullscreen class="bible-study-detail-content">
        <div class="bible-study-detail-hero app-header app-header--inner">
          <app-mobile-header
            title="Bible Study Manual"
            subtitle="Manual details"
            fallbackRoute="/bible-study"
          ></app-mobile-header>
        </div>

        <div class="surface bible-study-detail-surface">
          <div class="surface__content bible-study-detail-surface__content">
            <div *ngIf="loading" class="state-card loading-state">
              <ion-spinner name="crescent"></ion-spinner>
              <div class="state-copy">
                <h2>Loading manual</h2>
                <p>Fetching published Bible Study details.</p>
              </div>
            </div>

            <div *ngIf="!loading && errorMessage" class="state-card error-state">
              <div class="state-copy">
                <h2>We couldn't load this manual</h2>
                <p>{{ errorMessage }}</p>
              </div>
              <ion-button expand="block" class="state-button" (click)="loadManual()">Try Again</ion-button>
            </div>

            <section *ngIf="!loading && !errorMessage && manual" class="detail-card">
              <div class="detail-cover" [class.detail-cover--placeholder]="!manual.cover_image_url">
                <img *ngIf="manual.cover_image_url" [src]="manual.cover_image_url" [alt]="manual.title + ' cover'" />
                <ion-icon *ngIf="!manual.cover_image_url" name="book-outline" aria-hidden="true"></ion-icon>
              </div>

              <div class="detail-copy">
                <h2>{{ manual.title }}</h2>
                <p>{{ manual.year }} · {{ manual.language_display }}</p>
                <p *ngIf="manual.volume?.trim()">{{ manual.volume.trim() }}</p>
                <p>{{ formatWeekRange(manual) }}</p>
              </div>
            </section>

            <div *ngIf="!loading && !errorMessage && manual" class="state-card info-state">
              <div class="state-copy">
                <h2>PDF reading is coming soon</h2>
                <p>This first mobile release lets members browse published manuals. PDF opening will be added separately.</p>
              </div>
            </div>
          </div>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host { display: block; }
      ion-page { background: #0b1d73; }
      ion-content.bible-study-detail-content { --background: #0b1d73; }
      .bible-study-detail-surface { border-radius: 24px 24px 0 0; margin-top: -0.08rem; padding-top: 1.25rem; }
      .bible-study-detail-surface__content { width: 100%; max-width: 440px; margin: 0 auto; padding-bottom: calc(1.2rem + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 1rem; }
      .detail-card, .state-card { background: #fff; border-radius: 22px; box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1); padding: 1.05rem; }
      .detail-card { display: flex; gap: 1rem; align-items: center; }
      .detail-cover { width: 96px; min-width: 96px; height: 128px; border-radius: 18px; background: rgba(11, 29, 115, 0.08); display: flex; align-items: center; justify-content: center; overflow: hidden; color: #0b1d73; }
      .detail-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .detail-cover ion-icon { font-size: 2rem; opacity: 0.7; }
      .detail-copy { display: flex; flex-direction: column; gap: 0.35rem; }
      .detail-copy h2, .state-copy h2 { margin: 0; color: #03173f; font-weight: 700; }
      .detail-copy p, .state-copy p { margin: 0; color: rgba(3, 23, 63, 0.68); line-height: 1.5; }
      .state-card { text-align: center; }
      .state-button { --border-radius: 16px; --background: #0b1d73; --background-activated: #09175c; --box-shadow: 0 12px 22px rgba(11, 29, 115, 0.2); font-weight: 600; }
    `,
  ],
})
export class BibleStudyDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bibleStudyService = inject(BibleStudyService);

  manual: BibleStudyManualDetail | null = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadManual();
  }

  loadManual(): void {
    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(rawId) || rawId <= 0) {
      this.loading = false;
      this.errorMessage = 'Invalid Bible Study manual ID.';
      this.manual = null;
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.manual = null;

    this.bibleStudyService.getPublishedManualDetail(rawId).subscribe({
      next: (manual) => {
        this.manual = manual;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = "We couldn't load this Bible Study manual right now.";
      },
    });
  }

  formatWeekRange(manual: BibleStudyManualDetail): string {
    if (manual.start_week === null || manual.end_week === null) {
      return 'Full year';
    }
    return `Weeks ${manual.start_week}-${manual.end_week}`;
  }
}
