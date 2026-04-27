import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { PublicBranch } from '../../core/models/branch.model';
import { SavedChurch } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-saved-churches',
  template: `
    <ion-page>
      <ion-content fullscreen class="saved-content">
        <div class="saved-hero app-header app-header--inner">
          <div class="app-header__inner">
            <button class="saved-back app-header__back" type="button" aria-label="Back" (click)="goBack()">
              <ion-icon class="app-back-icon" name="arrow-back" aria-hidden="true"></ion-icon>
            </button>
            <div class="app-header__copy saved-hero__copy">
              <h1 class="app-header__title">Saved Churches</h1>
            </div>
          </div>
        </div>

        <div class="surface saved-surface">
          <div class="surface__content saved-surface__content">
            <div *ngIf="loading" class="skeleton-stack" aria-live="polite">
              <div class="saved-card skeleton" *ngFor="let item of skeletonItems">
                <div class="skeleton-row skeleton-row--top">
                  <span class="skeleton-line skeleton-line--title"></span>
                  <span class="skeleton-pill"></span>
                </div>
                <span class="skeleton-line skeleton-line--meta"></span>
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
                <h2>No saved churches yet</h2>
                <p>Save a church to give faster next time</p>
              </div>
              <ion-button expand="block" class="choose-church-button" (click)="goToBranches()">
                <ion-icon name="location-outline" slot="start" aria-hidden="true"></ion-icon>
                <span>Choose church</span>
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
              >
                <div class="saved-card__top">
                  <div class="saved-copy">
                    <h2>{{ saved.church.name }}</h2>
                    <p *ngIf="formatHierarchy(saved) as hierarchy">{{ hierarchy }}</p>
                  </div>
                  <span class="saved-status" [class.saved-status--inactive]="!saved.church.donations_enabled || !saved.church.is_active">
                    {{ saved.church.donations_enabled && saved.church.is_active ? 'Ready to give' : 'Unavailable' }}
                  </span>
                </div>

                <div class="saved-meta">
                  <div class="meta-row" *ngIf="saved.church.branch_code">
                    <span>Branch code</span>
                    <strong>{{ saved.church.branch_code }}</strong>
                  </div>
                  <div class="meta-row">
                    <span>Saved</span>
                    <strong>{{ formatDate(saved.created_at) }}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  class="saved-action"
                  (click)="selectSavedChurch(saved, $event)"
                >
                  Give to this church
                </button>
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

      ion-page {
        background: #0b1d73;
      }

      ion-content.saved-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        --background: #0b1d73;
      }

      ion-content.saved-content::part(scroll) {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 100%;
      }

      .saved-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .saved-hero {
        width: 100%;
        padding-bottom: 2rem;
      }

      .saved-back {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(6px);
        justify-content: center;
        padding: 0;
        min-height: 40px;
      }

      .saved-back ion-icon {
        font-size: 1.1rem;
      }

      .saved-hero__copy {
        text-align: center;
        align-items: center;
      }

      .saved-surface {
        margin-top: -0.08rem;
        padding-top: 1.25rem;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -6px 22px rgba(2, 18, 54, 0.08);
      }

      .saved-surface__content {
        width: 100%;
        max-width: 440px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: calc(1.2rem + env(safe-area-inset-bottom));
      }

      .saved-stack,
      .skeleton-stack {
        display: flex;
        flex-direction: column;
        gap: 0.95rem;
      }

      .saved-card,
      .state-card {
        background: #ffffff;
        border-radius: 22px;
        box-shadow: 0 14px 36px rgba(6, 21, 74, 0.1);
      }

      .saved-card {
        padding: 1rem 1.05rem;
      }

      .saved-card--interactive {
        width: 100%;
        border: 0;
        text-align: left;
        transition: transform 120ms ease-out, box-shadow 120ms ease-out;
        will-change: transform;
        cursor: pointer;
      }

      .saved-card--interactive:active {
        transform: scale(0.985);
        box-shadow: 0 10px 24px rgba(6, 21, 74, 0.12);
      }

      .saved-card--interactive:focus-visible {
        outline: 3px solid rgba(11, 29, 115, 0.18);
        outline-offset: 3px;
      }

      .saved-action {
        margin-top: 0.95rem;
        width: 100%;
        min-height: 48px;
        border: 0;
        border-radius: 999px;
        background: #f5b628;
        color: #0b1d73;
        font-size: 0.95rem;
        font-weight: 700;
        box-shadow: 0 10px 22px rgba(245, 182, 40, 0.24);
      }

      .saved-action:active {
        background: #d79d1f;
      }

      .saved-card__top {
        display: flex;
        justify-content: space-between;
        gap: 0.9rem;
      }

      .saved-copy {
        min-width: 0;
      }

      .saved-copy h2,
      .saved-copy p {
        margin: 0;
      }

      .saved-copy h2 {
        color: #03173f;
        font-size: 1.08rem;
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -0.01em;
      }

      .saved-copy p {
        margin-top: 0.32rem;
        color: rgba(3, 23, 63, 0.58);
        font-size: 0.87rem;
        line-height: 1.4;
      }

      .saved-status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        align-self: flex-start;
        min-width: 92px;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        background: rgba(45, 166, 95, 0.12);
        color: #217447;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .saved-status--inactive {
        background: rgba(220, 53, 69, 0.12);
        color: #b02f3b;
      }

      .saved-meta {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        margin-top: 0.85rem;
        padding-top: 0.8rem;
        border-top: 1px solid rgba(3, 23, 63, 0.08);
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: baseline;
      }

      .meta-row span {
        color: rgba(3, 23, 63, 0.58);
        font-size: 0.82rem;
      }

      .meta-row strong {
        color: #03173f;
        font-size: 0.92rem;
        font-weight: 600;
        text-align: right;
        overflow-wrap: anywhere;
      }

      .state-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.8rem;
      }

      .state-copy {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      .state-copy h2,
      .state-copy p {
        margin: 0;
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
        animation: pulse 1.2s infinite ease-in-out;
      }

      .skeleton-row {
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        margin-bottom: 0.8rem;
      }

      .skeleton-pill,
      .skeleton-line {
        display: block;
        background: rgba(11, 26, 115, 0.08);
        border-radius: 999px;
      }

      .skeleton-pill {
        width: 92px;
        height: 24px;
      }

      .skeleton-line--title {
        width: 56%;
        height: 16px;
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

      @media (max-height: 760px) {
        .saved-hero {
          padding-bottom: 1.8rem;
        }

        .saved-surface {
          padding-top: 1.1rem;
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
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadSavedChurches();
  }

  loadSavedChurches(): void {
    this.loading = true;
    this.errorMessage = '';
    this.savedChurches = [];

    this.authService.getCurrentUser().subscribe({
      next: (profile) => {
        if (!profile) {
          void this.router.navigate(['/login']);
          return;
        }

        this.fetchSavedChurches();
      },
      error: () => {
        void this.router.navigate(['/login']);
      },
    });
  }

  formatHierarchy(saved: SavedChurch): string {
    const parts: string[] = [];
    if (saved.church.district?.name) {
      parts.push(`${saved.church.district.name} District`);
    }
    if (saved.church.area?.name) {
      parts.push(`${saved.church.area.name} Area`);
    }
    return parts.join(' • ');
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
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

      void this.router.navigate(['/donate']);
    } catch {
      void this.router.navigate(['/branches']);
    }
  }

  goToBranches(): void {
    void this.router.navigate(['/branches']);
  }

  goBack(): void {
    void this.router.navigate(['/profile']);
  }

  private fetchSavedChurches(): void {
    this.authService.getSavedChurches().subscribe({
      next: (savedChurches) => {
        this.savedChurches = savedChurches;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Please check your connection and try again.';
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
