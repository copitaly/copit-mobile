import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { PublicBranch } from '../../core/models/branch.model';
import { SavedChurch } from '../../core/models/user.model';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { SentryTelemetryService } from '../../core/services/sentry-telemetry.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-saved-churches',
  template: `
    <ion-page>
      <ion-content fullscreen class="saved-content cop-content--secondary">
        <div class="saved-shell cop-secondary-shell">
          <header class="saved-header" aria-label="My Churches">
            <app-mobile-header
              title="My Churches"
              subtitle="Keep your saved churches close for faster access."
              fallbackRoute="/tabs/profile"
              tone="editorial"
            ></app-mobile-header>
          </header>

          <div class="saved-surface">
            <div class="saved-surface__content">
              <div *ngIf="loading" class="skeleton-stack" aria-live="polite">
                <div class="saved-card skeleton" *ngFor="let item of skeletonItems">
                  <span class="skeleton-line skeleton-line--title"></span>
                  <span class="skeleton-line skeleton-line--meta"></span>
                  <span class="skeleton-line skeleton-line--meta short"></span>
                  <span class="skeleton-line skeleton-line--meta short"></span>
                </div>
              </div>

              <div *ngIf="!loading && errorMessage" class="state-card error-state">
                <div class="state-copy">
                  <h2>We couldn't load your saved churches</h2>
                  <p>{{ errorMessage }}</p>
                </div>
                <ion-button expand="block" class="state-button" (click)="loadSavedChurches()">Try again</ion-button>
              </div>

              <div *ngIf="!loading && !errorMessage && savedChurches.length === 0" class="state-card empty-state">
                <div class="state-copy">
                  <h2>You haven't saved any churches yet.</h2>
                  <p>Save a church to make giving and future access faster.</p>
                </div>
                <ion-button expand="block" class="choose-church-button" (click)="goToBranches()">
                  <ion-icon name="location-outline" slot="start" aria-hidden="true"></ion-icon>
                  <span>Browse churches</span>
                </ion-button>
              </div>

              <div *ngIf="!loading && !errorMessage && savedChurches.length > 0" class="saved-stack">
                <div
                  class="saved-card saved-card--interactive"
                  *ngFor="let saved of savedChurches"
                  (click)="selectSavedChurch(saved)"
                  (keydown.enter)="selectSavedChurch(saved)"
                  (keydown.space)="selectSavedChurch(saved, $event)"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Open saved church ' + saved.church.name"
                >
                  <div class="saved-card__content">
                    <div class="saved-copy">
                      <h2>{{ saved.church.name }}</h2>
                      <p *ngIf="saved.church.district?.name" class="saved-copy__line">
                        {{ saved.church.district?.name }} District
                      </p>
                      <p *ngIf="saved.church.area?.name" class="saved-copy__line">
                        {{ saved.church.area?.name }} Area
                      </p>
                      <p class="saved-copy__support">Saved for quick access</p>
                    </div>

                    <div class="saved-meta">
                      <div class="meta-row" *ngIf="saved.church.branch_code">
                        <span>Branch code</span>
                        <strong>{{ saved.church.branch_code }}</strong>
                      </div>
                      <div class="meta-row" *ngIf="!saved.church.donations_enabled || !saved.church.is_active">
                        <span>Status</span>
                        <strong>Unavailable</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="saved-action"
                      (click)="selectSavedChurch(saved, $event)"
                    >
                      Donate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .saved-content {
        --background: var(--cop-color-background-soft);
      }

      .saved-shell {
        gap: 0.95rem;
      }

      .saved-surface {
        width: 100%;
        max-width: 32rem;
        margin: 0 auto;
      }

      .saved-surface__content,
      .saved-stack,
      .skeleton-stack,
      .state-copy,
      .saved-card__content,
      .saved-copy {
        display: flex;
        flex-direction: column;
      }

      .saved-surface__content {
        gap: 0.95rem;
        padding-bottom: calc(1.1rem + var(--cop-safe-bottom, env(safe-area-inset-bottom, 0px)));
      }

      .saved-stack,
      .skeleton-stack {
        gap: 0.85rem;
      }

      .saved-card,
      .state-card {
        background: #fff;
        border: 1px solid rgba(8, 31, 92, 0.08);
        border-radius: 16px;
        box-shadow: 0 10px 22px rgba(7, 24, 69, 0.06);
      }

      .saved-card {
        padding: 1rem;
      }

      .saved-card--interactive {
        width: 100%;
        text-align: left;
        transition: transform 120ms ease-out, box-shadow 120ms ease-out;
        will-change: transform;
        cursor: pointer;
      }

      .saved-card--interactive:active {
        transform: scale(0.988);
        box-shadow: 0 10px 24px rgba(6, 21, 74, 0.12);
      }

      .saved-card--interactive:focus-visible {
        outline: 3px solid rgba(11, 29, 115, 0.18);
        outline-offset: 3px;
      }

      .saved-card__content {
        gap: 0.9rem;
      }

      .saved-copy {
        gap: 0.28rem;
        min-width: 0;
      }

      .saved-copy h2,
      .saved-copy p,
      .state-copy h2,
      .state-copy p {
        margin: 0;
      }

      .saved-copy h2 {
        color: #03173f;
        font-size: 1.08rem;
        font-weight: 700;
        line-height: 1.24;
        letter-spacing: -0.01em;
      }

      .saved-copy__line {
        color: rgba(3, 23, 63, 0.66);
        font-size: 0.88rem;
        line-height: 1.42;
      }

      .saved-copy__support,
      .meta-row span {
        color: rgba(3, 23, 63, 0.56);
      }

      .saved-copy__support {
        margin-top: 0.22rem;
        font-size: 0.82rem;
        line-height: 1.4;
      }

      .saved-meta {
        display: flex;
        flex-direction: column;
        gap: 0.42rem;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: baseline;
      }

      .meta-row span {
        font-size: 0.8rem;
      }

      .meta-row strong {
        color: #03173f;
        font-size: 0.9rem;
        font-weight: 600;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .saved-action {
        align-self: flex-start;
        min-height: 38px;
        padding: 0.45rem 0.95rem;
        border: 0;
        border-radius: 999px;
        background: #f5b628;
        color: #0b1d73;
        font-size: 0.86rem;
        font-weight: 700;
        box-shadow: 0 10px 20px rgba(245, 182, 40, 0.2);
      }

      .saved-action:active {
        background: #d79d1f;
      }

      .state-card {
        padding: 1.15rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.85rem;
      }

      .state-copy {
        gap: 0.32rem;
      }

      .state-copy h2 {
        color: #03173f;
        font-size: 1.05rem;
        font-weight: 700;
      }

      .state-copy p {
        color: rgba(3, 23, 63, 0.65);
        font-size: 0.92rem;
        line-height: 1.45;
      }

      .state-button {
        --background: #0b1d73;
        --background-hover: #0b1d73;
        --background-activated: #09175c;
        --border-radius: 16px;
        --box-shadow: 0 12px 22px rgba(11, 29, 115, 0.2);
        font-weight: 600;
      }

      .choose-church-button {
        --background: #f5b628;
        --background-hover: #f5b628;
        --background-activated: #d79d1f;
        --border-radius: 999px;
        --box-shadow: 0 10px 22px rgba(245, 182, 40, 0.24);
        --color: #0b1d73;
        min-height: 52px;
        font-weight: 700;
      }

      .skeleton {
        padding: 1rem;
        animation: pulse 1.2s infinite ease-in-out;
      }

      .skeleton-line {
        display: block;
        background: rgba(11, 26, 115, 0.08);
        border-radius: 999px;
      }

      .skeleton-line--title {
        width: 56%;
        height: 16px;
        margin-bottom: 0.7rem;
      }

      .skeleton-line--meta {
        width: 100%;
        height: 12px;
        margin-bottom: 0.45rem;
      }

      .skeleton-line--meta.short {
        width: 70%;
        margin-bottom: 0;
      }

      @keyframes pulse {
        0% {
          opacity: 1;
        }
        50% {
          opacity: 0.6;
        }
        100% {
          opacity: 1;
        }
      }
    `,
  ],
})
export class SavedChurchesPage implements OnInit {
  savedChurches: SavedChurch[] = [];
  loading = true;
  errorMessage = '';
  readonly skeletonItems = [1, 2, 3];

  constructor(
    private readonly authService: AuthService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router,
    private readonly sentryTelemetry: SentryTelemetryService,
    private readonly analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.loadSavedChurches();
  }

  loadSavedChurches(): void {
    this.loading = true;
    this.errorMessage = '';
    this.savedChurches = [];
    this.sentryTelemetry.addFeatureBreadcrumb('saved_churches', 'Saved churches load started', {
      route: '/saved-churches',
    });

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        if (!profile) {
          this.sentryTelemetry.addFeatureBreadcrumb(
            'saved_churches',
            'Saved churches load redirected to login',
            { reason: 'missing_profile' },
            'warning'
          );
          void this.router.navigate(['/login']);
          return;
        }

        this.fetchSavedChurches();
      },
      error: (error: unknown) => {
        const httpError = error instanceof HttpErrorResponse ? error : null;
        this.sentryTelemetry.addFeatureBreadcrumb(
          'saved_churches',
          'Saved churches profile lookup failed',
          {
            status: httpError?.status ?? null,
            error: httpError?.error ?? null,
          },
          'error'
        );
        void this.router.navigate(['/login']);
      },
    });
  }

  selectSavedChurch(saved: SavedChurch, event?: Event): void {
    event?.stopPropagation();
    const branch = this.toPublicBranch(saved);

    try {
      const didSetBranch = this.selectedBranchService.setBranch(branch);
      if (!didSetBranch || this.selectedBranchService.getBranch()?.id !== branch.id) {
        void this.router.navigate(['/branches']);
        return;
      }
      void this.analyticsService.trackBranchSelected({
        church_id: branch.id,
        district_id: branch.district?.id ?? undefined,
        area_id: branch.area?.id ?? undefined,
        user_type: this.analyticsService.getUserType(),
      });
      void this.router.navigate(['/donate']);
    } catch {
      void this.router.navigate(['/branches']);
    }
  }

  goToBranches(): void {
    void this.router.navigate(['/branches']);
  }

  private fetchSavedChurches(): void {
    this.authService.getSavedChurches().subscribe({
      next: (savedChurches) => {
        this.savedChurches = savedChurches;
        this.loading = false;
        this.sentryTelemetry.addFeatureBreadcrumb('saved_churches', 'Saved churches API response received', {
          status: 200,
          count: savedChurches.length,
        });
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = 'Please check your connection and try again.';
        const httpError = error instanceof HttpErrorResponse ? error : null;
        this.sentryTelemetry.addFeatureBreadcrumb(
          'saved_churches',
          'Saved churches API request failed',
          {
            status: httpError?.status ?? null,
            error: httpError?.error ?? null,
          },
          'error'
        );
      },
    });
  }

  private toPublicBranch(saved: SavedChurch): PublicBranch {
    return {
      id: saved.church.id,
      name: saved.church.name,
      branch_code: saved.church.branch_code || '',
      level: 'local',
      district: saved.church.district ?? null,
      area: saved.church.area ?? null,
      donations_enabled: saved.church.donations_enabled,
      is_active: saved.church.is_active,
    };
  }
}
