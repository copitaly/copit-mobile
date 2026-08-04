import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PublicBranch } from '../../core/models/branch.model';
import { SavedChurch } from '../../core/models/user.model';
import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { AppToastService } from '../../core/services/app-toast.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { BranchesService } from '../../core/services/branches.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';

type BrowseLevel = 'areas' | 'districts' | 'churches';

interface DistrictBrowseGroup {
  key: string;
  id: number | null;
  name: string;
  areaName: string;
  branches: PublicBranch[];
}

interface AreaBrowseGroup {
  key: string;
  id: number | null;
  name: string;
  districts: DistrictBrowseGroup[];
}

type SearchResultItem =
  | { kind: 'area'; area: AreaBrowseGroup }
  | { kind: 'district'; area: AreaBrowseGroup; district: DistrictBrowseGroup }
  | { kind: 'church'; branch: PublicBranch };

interface SearchResultSection {
  title: string;
  items: SearchResultItem[];
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, FeaturePageShellComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-branch-select',
  template: `
    <ion-page>
      <ion-content
        fullscreen
        class="branch-content feature-page-content"
        [class.branch-content--areas]="useEditorialAreaLayout"
      >
          <app-feature-page-shell
            class="branch-shell"
            [class.branch-shell--areas]="useEditorialAreaLayout"
            style="flex:1;min-height:100%"
            [title]="'churchSelector.title' | t"
            [subtitle]="currentHelperText"
            [backFallbackRoute]="backFallbackRoute"
            [headerTone]="useEditorialAreaLayout ? 'editorial' : 'inverse'"
            [surfaceTone]="useEditorialAreaLayout ? 'flat' : 'sheet'"
            [contentMaxWidth]="useEditorialAreaLayout ? '100%' : '520px'"
          >
            <ion-searchbar
              [(ngModel)]="searchTerm"
              [placeholder]="searchPlaceholder"
              debounce="250"
              (ionInput)="onSearchChange()"
              class="branch-search"
              [class.branch-search--areas]="useEditorialAreaLayout"
            ></ion-searchbar>

            <div *ngIf="loading" class="skeleton-stack" aria-live="polite">
              <div class="branch-card skeleton" *ngFor="let item of [1, 2, 3]">
                <span class="icon-placeholder"></span>
                <div class="label-top">
                  <span class="skeleton-line title"></span>
                  <span class="skeleton-line hierarchy"></span>
                </div>
              </div>
            </div>

            <div *ngIf="!loading && error" class="state-card">
              <ion-text>{{ error }}</ion-text>
              <ion-button fill="clear" (click)="loadBranches()">{{ 'churchSelector.retryLoad' | t }}</ion-button>
            </div>

            <div *ngIf="!loading && !error && allBranches.length === 0" class="state-card empty-state">
              <div class="empty-copy">
                <h3>{{ 'churchSelector.noBranchesTitle' | t }}</h3>
                <p>{{ 'churchSelector.noBranchesBody' | t }}</p>
              </div>
            </div>

            <ng-container *ngIf="!loading && !error && allBranches.length > 0">
              <ng-container *ngIf="isSearching; else hierarchyBrowser">
                <div *ngIf="searchResultSections.length > 0; else noSearchResults" class="district-section">
                  <div *ngFor="let section of searchResultSections" class="district-section">
                    <div class="district-header">{{ section.title }}</div>
                    <ion-list lines="none">
                      <ng-container *ngFor="let item of section.items">
                        <ion-item
                          *ngIf="item.kind === 'area'"
                          button
                          [detail]="false"
                          lines="none"
                          (click)="openArea(item.area)"
                          class="branch-card hierarchy-card"
                        >
                          <ion-icon name="map-outline" slot="start" aria-hidden="true"></ion-icon>
                          <ion-label>
                            <div class="label-top">
                              <h2>{{ item.area.name }}</h2>
                              <p class="hierarchy">
                                {{ districtCountLabel(item.area.districts.length) }}
                              </p>
                            </div>
                          </ion-label>
                          <span class="branch-card__chevron" aria-hidden="true">
                            <ion-icon name="chevron-forward"></ion-icon>
                          </span>
                        </ion-item>

                        <ion-item
                          *ngIf="item.kind === 'district'"
                          button
                          [detail]="false"
                          lines="none"
                          (click)="openDistrict(item.area, item.district)"
                          class="branch-card hierarchy-card"
                        >
                          <ion-icon name="business-outline" slot="start" aria-hidden="true"></ion-icon>
                          <ion-label>
                            <div class="label-top">
                              <h2>{{ item.district.name }}</h2>
                              <p class="hierarchy" *ngIf="item.district.areaName">{{ item.district.areaName }}</p>
                            </div>
                          </ion-label>
                          <span class="branch-card__chevron" aria-hidden="true">
                            <ion-icon name="chevron-forward"></ion-icon>
                          </span>
                        </ion-item>

                        <ion-item
                          *ngIf="item.kind === 'church'"
                          button
                          [detail]="false"
                          lines="none"
                          (click)="selectBranch(item.branch)"
                          class="branch-card"
                        >
                          <ion-icon name="location" slot="start" aria-hidden="true"></ion-icon>

                          <ion-label>
                            <div class="label-top">
                              <h2>{{ item.branch.name }}</h2>
                              <p class="hierarchy" *ngIf="getHierarchy(item.branch) as hierarchy">{{ hierarchy }}</p>
                              <p class="code" *ngIf="item.branch.branch_code">{{ item.branch.branch_code }}</p>
                            </div>
                          </ion-label>

                          <ion-button
                            *ngIf="isAuthenticated"
                            fill="clear"
                            slot="end"
                            class="save-button"
                            [class.save-button--saved]="isSaved(item.branch.id)"
                            [class.save-button--animating-save]="heartAnimationState(item.branch.id) === 'save'"
                            [class.save-button--animating-unsave]="heartAnimationState(item.branch.id) === 'unsave'"
                            [disabled]="isSaving(item.branch.id)"
                            [attr.aria-label]="savedChurchAriaLabel(item.branch.id)"
                            (click)="toggleSavedChurch(item.branch, $event)"
                          >
                            <ion-icon
                              [name]="isSaved(item.branch.id) ? 'heart' : 'heart-outline'"
                              aria-hidden="true"
                            ></ion-icon>
                          </ion-button>

                          <span class="branch-card__chevron" aria-hidden="true">
                            <ion-icon name="chevron-forward"></ion-icon>
                          </span>
                        </ion-item>
                      </ng-container>
                    </ion-list>
                  </div>
                </div>
              </ng-container>

              <ng-template #hierarchyBrowser>
                <div *ngIf="savedBranches.length > 0" class="district-section">
                  <div class="district-header">{{ 'churchSelector.savedChurches' | t }}</div>
                  <ion-list lines="none">
                    <ion-item
                      button
                      [detail]="false"
                      lines="none"
                      *ngFor="let branch of savedBranches"
                      (click)="selectBranch(branch)"
                      class="branch-card"
                    >
                      <ion-icon name="location" slot="start" aria-hidden="true"></ion-icon>

                      <ion-label>
                        <div class="label-top">
                          <h2>{{ branch.name }}</h2>
                          <p class="hierarchy" *ngIf="getHierarchy(branch) as hierarchy">{{ hierarchy }}</p>
                          <p class="code" *ngIf="branch.branch_code">{{ branch.branch_code }}</p>
                        </div>
                      </ion-label>

                      <ion-button
                        fill="clear"
                        slot="end"
                        class="save-button"
                        [class.save-button--saved]="isSaved(branch.id)"
                        [class.save-button--animating-save]="heartAnimationState(branch.id) === 'save'"
                        [class.save-button--animating-unsave]="heartAnimationState(branch.id) === 'unsave'"
                        [disabled]="isSaving(branch.id)"
                        [attr.aria-label]="savedChurchAriaLabel(branch.id)"
                        (click)="toggleSavedChurch(branch, $event)"
                      >
                        <ion-icon [name]="isSaved(branch.id) ? 'heart' : 'heart-outline'" aria-hidden="true"></ion-icon>
                      </ion-button>

                      <span class="branch-card__chevron" aria-hidden="true">
                        <ion-icon name="chevron-forward"></ion-icon>
                      </span>
                    </ion-item>
                  </ion-list>
                </div>

                <div
                  class="browse-shell"
                  [class.browse-shell--areas]="useEditorialAreaLayout"
                  *ngIf="hierarchyBaseBranches.length > 0; else noHierarchyBranches"
                >
                  <div class="browse-header" [class.browse-header--areas]="useEditorialAreaLayout">
                    <div>
                      <div class="district-header">{{ currentSectionTitle }}</div>
                      <p class="browse-helper" *ngIf="currentLevel !== 'churches'">{{ currentHelperText }}</p>
                      <p class="browse-context" *ngIf="currentLevel === 'churches'">{{ currentChurchContextLabel }}</p>
                    </div>
                    <button
                      *ngIf="currentLevel !== 'areas'"
                      type="button"
                      class="hierarchy-back"
                      (click)="stepBack()"
                    >
                      <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
                      <span>{{ currentLevel === 'churches' ? ('churchSelector.backToDistricts' | t) : ('churchSelector.backToAreas' | t) }}</span>
                    </button>
                  </div>

                  <div class="breadcrumb" *ngIf="breadcrumbs.length > 0">
                    <button type="button" class="breadcrumb__crumb" (click)="resetHierarchy()">{{ 'churchSelector.areasBreadcrumb' | t }}</button>
                    <ng-container *ngFor="let crumb of breadcrumbs">
                      <span class="breadcrumb__divider">&rsaquo;</span>
                      <button
                        type="button"
                        class="breadcrumb__crumb"
                        [class.is-current]="crumb.current"
                        (click)="navigateToBreadcrumb(crumb.level)"
                      >
                        {{ crumb.label }}
                      </button>
                    </ng-container>
                  </div>

                  <ion-list lines="none" *ngIf="currentLevel === 'areas'" class="area-list">
                    <ion-item
                      button
                      [detail]="false"
                      lines="none"
                      *ngFor="let area of areaGroups"
                      (click)="selectArea(area)"
                      class="branch-card hierarchy-card branch-card--area"
                    >
                      <ion-icon name="map-outline" slot="start" aria-hidden="true"></ion-icon>
                      <ion-label>
                        <div class="label-top">
                          <h2>{{ area.name }}</h2>
                          <p class="hierarchy">
                            {{ districtCountLabel(area.districts.length) }}
                          </p>
                        </div>
                      </ion-label>
                      <span class="branch-card__chevron" aria-hidden="true">
                        <ion-icon name="chevron-forward"></ion-icon>
                      </span>
                    </ion-item>
                  </ion-list>

                  <ion-list lines="none" *ngIf="currentLevel === 'districts'">
                    <ion-item
                      button
                      [detail]="false"
                      lines="none"
                      *ngFor="let district of currentDistrictGroups"
                      (click)="selectDistrict(district)"
                      class="branch-card hierarchy-card"
                    >
                      <ion-icon name="business-outline" slot="start" aria-hidden="true"></ion-icon>
                      <ion-label>
                        <div class="label-top">
                          <h2>{{ district.name }}</h2>
                          <p class="hierarchy">
                            {{ churchCountLabel(district.branches.length) }}
                          </p>
                        </div>
                      </ion-label>
                      <span class="branch-card__chevron" aria-hidden="true">
                        <ion-icon name="chevron-forward"></ion-icon>
                      </span>
                    </ion-item>
                  </ion-list>

                  <ion-list lines="none" *ngIf="currentLevel === 'churches'">
                    <ion-item
                      button
                      [detail]="false"
                      lines="none"
                      *ngFor="let branch of currentChurches"
                      (click)="selectBranch(branch)"
                      class="branch-card"
                    >
                      <ion-icon name="location" slot="start" aria-hidden="true"></ion-icon>

                      <ion-label>
                        <div class="label-top">
                          <h2>{{ branch.name }}</h2>
                          <p class="hierarchy" *ngIf="getBranchCardSecondaryText(branch) as hierarchy">{{ hierarchy }}</p>
                          <p class="code" *ngIf="branch.branch_code">{{ branch.branch_code }}</p>
                        </div>
                      </ion-label>

                      <ion-button
                        *ngIf="isAuthenticated"
                        fill="clear"
                        slot="end"
                        class="save-button"
                        [class.save-button--saved]="isSaved(branch.id)"
                        [class.save-button--animating-save]="heartAnimationState(branch.id) === 'save'"
                        [class.save-button--animating-unsave]="heartAnimationState(branch.id) === 'unsave'"
                        [disabled]="isSaving(branch.id)"
                        [attr.aria-label]="savedChurchAriaLabel(branch.id)"
                        (click)="toggleSavedChurch(branch, $event)"
                      >
                        <ion-icon [name]="isSaved(branch.id) ? 'heart' : 'heart-outline'" aria-hidden="true"></ion-icon>
                      </ion-button>

                      <span class="branch-card__chevron" aria-hidden="true">
                        <ion-icon name="chevron-forward"></ion-icon>
                      </span>
                    </ion-item>
                  </ion-list>
                </div>
              </ng-template>
            </ng-container>

            <ng-template #noSearchResults>
              <div class="state-card empty-state">
                <div class="empty-copy">
                  <h3>{{ 'churchSelector.noMatchesTitle' | t }}</h3>
                  <p>{{ 'churchSelector.noMatchesBody' | t }}</p>
                </div>
              </div>
            </ng-template>

            <ng-template #noHierarchyBranches>
              <div class="state-card empty-state">
                <div class="empty-copy">
                  <h3>{{ 'churchSelector.noHierarchyTitle' | t }}</h3>
                  <p>{{ 'churchSelector.noHierarchyBody' | t }}</p>
                </div>
              </div>
            </ng-template>
          </app-feature-page-shell>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .skeleton-stack {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .branch-card.skeleton {
        display: flex;
        align-items: center;
        padding: var(--app-card-padding);
        border-radius: var(--app-card-radius);
        box-shadow: none;
        background: #ffffff;
        animation: pulse 1.2s infinite ease-in-out;
      }

      .icon-placeholder {
        width: var(--app-icon-container-size);
        height: var(--app-icon-container-size);
        border-radius: var(--app-icon-container-radius);
        background: rgba(11, 26, 115, 0.1);
        margin-right: 0.5rem;
      }

      .branch-card.skeleton .label-top {
        gap: 0.35rem;
      }

      .skeleton-line {
        display: block;
        background: rgba(11, 26, 115, 0.08);
        border-radius: 999px;
      }

      .skeleton-line.title {
        width: 120px;
        height: 14px;
      }

      .skeleton-line.hierarchy {
        width: 80px;
        height: 10px;
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

      @keyframes branch-heart-pop {
        0% {
          transform: scale(1);
        }
        55% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
        }
      }

      @keyframes branch-heart-fade {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(0.94);
          opacity: 0.72;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      ion-list {
        margin-top: 0.15rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .branch-search {
        --background: rgba(255, 255, 255, 0.96);
        --border-radius: 14px;
        border: 1px solid rgba(8, 31, 92, 0.08);
        box-shadow: 0 8px 18px rgba(7, 24, 69, 0.04);
        --padding-start: 1rem;
        --padding-end: 1rem;
        height: 40px;
        --placeholder-color: rgba(3, 23, 63, 0.45);
      }

      .branch-search::part(search-icon) {
        opacity: 0.45;
      }

      .branch-card {
        background: #ffffff;
        border-radius: 16px;
        padding: var(--app-card-padding);
        border: 1px solid rgba(8, 31, 92, 0.06);
        box-shadow: 0 10px 22px rgba(7, 24, 69, 0.05);
        --background: transparent;
        align-items: center;
        transition: transform 120ms ease-out, box-shadow 120ms ease-out;
      }

      .hierarchy-card {
        --padding-end: 1rem;
      }

      .branch-card ion-label {
        border: none;
        flex: 1;
      }

      .save-button {
        --color: rgba(3, 23, 63, 0.48);
        --padding-start: 0;
        --padding-end: 0;
        min-width: 40px;
        min-height: 40px;
        width: 40px;
        height: 40px;
        margin-right: 0.25rem;
        align-self: center;
        justify-content: center;
      }

      .save-button--saved {
        --color: #d7a31a;
      }

      .save-button ion-icon {
        font-size: 1.1rem;
        transition: transform 180ms ease-out, opacity 150ms ease-out;
      }

      .save-button--animating-save ion-icon {
        animation: branch-heart-pop 180ms ease-out;
      }

      .save-button--animating-unsave ion-icon {
        animation: branch-heart-fade 160ms ease-out;
      }

      ion-icon[slot='start'] {
        color: #0b1d73;
        font-size: 24px;
        align-self: center;
        margin-right: 0.35rem;
      }

      .branch-card__chevron {
        width: 28px;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .branch-card__chevron ion-icon {
        color: rgba(3, 23, 63, 0.55);
        font-size: 18px;
      }

      .branch-card:active {
        transform: scale(0.98);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
      }

      .district-section,
      .browse-shell {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }

      .browse-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .browse-helper {
        margin: 0.25rem 0 0;
        font-size: 0.92rem;
        color: var(--app-secondary-text-color);
      }

      .browse-context {
        margin: 0.2rem 0 0;
        font-size: 0.86rem;
        color: var(--app-secondary-text-color);
      }

      .hierarchy-back {
        display: inline-flex;
        align-items: center;
        gap: 0.32rem;
        border: 1px solid rgba(8, 31, 92, 0.08);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        padding: 0.38rem 0.72rem;
        color: rgba(3, 23, 63, 0.74);
        font-size: 0.82rem;
        font-weight: 600;
        box-shadow: 0 6px 16px rgba(7, 24, 69, 0.04);
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .breadcrumb__crumb {
        border: 0;
        background: transparent;
        padding: 0;
        color: rgba(3, 23, 63, 0.7);
        font-size: 0.86rem;
        font-weight: 600;
      }

      .breadcrumb__crumb.is-current {
        color: #03173f;
      }

      .breadcrumb__divider {
        color: rgba(3, 23, 63, 0.4);
        font-size: 0.9rem;
      }

      .district-header {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--app-secondary-text-color);
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .browse-shell .branch-card:first-of-type {
        margin-top: 0;
      }

      .label-top {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
      }

      h2 {
        margin: 0;
        font-size: 1.02rem;
        font-weight: 700;
        line-height: 1.2;
        color: #03173f;
      }

      .hierarchy {
        margin: 0;
        font-size: 0.82rem;
        font-weight: 400;
        line-height: 1.35;
        color: rgba(3, 23, 63, 0.56);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .code {
        font-size: 0.8rem;
        color: #06113b;
        margin: 0.25rem 0 0;
        padding: 0.15rem 0.7rem;
        background: rgba(3, 23, 63, 0.08);
        border-radius: 999px;
        align-self: flex-start;
        letter-spacing: 0.15em;
      }

      ion-icon {
        font-size: 24px;
      }
    `,
  ],
})
export class BranchSelectPage implements OnInit {
  searchTerm = '';
  loading = false;
  error: string | null = null;
  allBranches: PublicBranch[] = [];
  isAuthenticated = false;
  backFallbackRoute = '/tabs/home';

  private selectedAreaKey: string | null = null;
  private selectedDistrictKey: string | null = null;
  private savedChurchIdsByBranchId = new Map<number, number>();
  private savingBranchIds = new Set<number>();
  private heartAnimationByBranchId = new Map<number, 'save' | 'unsave'>();

  constructor(
    private readonly branchesService: BranchesService,
    private readonly authService: AuthService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly localeService: LocaleService,
    private readonly appToast: AppToastService,
    private readonly analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.backFallbackRoute = this.resolveBackFallbackRoute();
    this.loadBranches();
  }

  loadBranches(): void {
    this.loading = true;
    this.error = null;
    this.allBranches = [];

    const savedChurches$ = this.authService.isAuthenticatedSnapshot
      ? this.authService.getSavedChurches().pipe(catchError(() => of([] as SavedChurch[])))
      : of([] as SavedChurch[]);

    forkJoin({
      branches: this.branchesService.getAllBranches(),
      savedChurches: savedChurches$,
    }).subscribe({
      next: ({ branches, savedChurches }) => {
        this.allBranches = branches;
        this.isAuthenticated = this.authService.isAuthenticatedSnapshot || savedChurches.length > 0;
        this.savedChurchIdsByBranchId = new Map(
          savedChurches.map((savedChurch) => [savedChurch.church.id, savedChurch.id])
        );
        this.ensureHierarchySelectionIsValid();
        this.loading = false;
      },
      error: () => {
        this.error = this.localeService.translate('churchSelector.loadError');
        this.loading = false;
      },
    });
  }

  onSearchChange(): void {
    this.searchTerm = this.searchTerm ?? '';
  }

  get isSearching(): boolean {
    return Boolean(this.searchTerm.trim());
  }

  get currentLevel(): BrowseLevel {
    if (this.selectedAreaKey && this.selectedDistrictKey) {
      return 'churches';
    }
    if (this.selectedAreaKey) {
      return 'districts';
    }
    return 'areas';
  }

  get useEditorialAreaLayout(): boolean {
    return this.currentLevel === 'areas';
  }

  get currentSectionTitle(): string {
    if (this.currentLevel === 'churches') {
      return this.localeService.translate('churchSelector.locals');
    }
    if (this.currentLevel === 'districts') {
      return this.localeService.translate('churchSelector.districts');
    }
    return this.localeService.translate('churchSelector.areas');
  }

  get currentHelperText(): string {
    if (this.currentLevel === 'churches') {
      return this.localeService.translate('churchSelector.selectLocal');
    }
    if (this.currentLevel === 'districts') {
      return this.localeService.translate('churchSelector.selectDistrict');
    }
    return this.localeService.translate('churchSelector.selectArea');
  }

  get searchPlaceholder(): string {
    if (this.currentLevel === 'churches') {
      return this.localeService.translate('churchSelector.searchLocalsPlaceholder');
    }
    if (this.currentLevel === 'districts') {
      return this.localeService.translate('churchSelector.searchDistrictsPlaceholder');
    }
    return this.localeService.translate('churchSelector.searchAreasPlaceholder');
  }

  get currentChurchContext(): string {
    const districtName = this.currentDistrictGroup?.name?.trim();
    const areaName = this.currentAreaGroup?.name?.trim();
    const parts = [];

    if (districtName) {
      parts.push(`${districtName} ${this.localeService.translate('churchSelector.districtLabelSuffix')}`);
    }
    if (areaName) {
      parts.push(`${areaName} ${this.localeService.translate('churchSelector.areaLabelSuffix')}`);
    }

    return parts.join(' · ');
  }

  get currentChurchContextLabel(): string {
    const districtName = this.currentDistrictGroup?.name?.trim();
    const areaName = this.currentAreaGroup?.name?.trim();
    const parts: string[] = [];

    if (districtName) {
      parts.push(`${districtName} ${this.localeService.translate('churchSelector.districtLabelSuffix')}`);
    }
    if (areaName) {
      parts.push(`${areaName} ${this.localeService.translate('churchSelector.areaLabelSuffix')}`);
    }

    return parts.join(' · ');
  }

  get savedBranches(): PublicBranch[] {
    if (!this.isAuthenticated) {
      return [];
    }

    return [...this.allBranches.filter((branch) => this.isSaved(branch.id))].sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  get hierarchyBaseBranches(): PublicBranch[] {
    return this.isAuthenticated
      ? this.allBranches.filter((branch) => !this.isSaved(branch.id))
      : this.allBranches;
  }

  get areaGroups(): AreaBrowseGroup[] {
    const areaMap = new Map<string, AreaBrowseGroup>();
    const districtMapByArea = new Map<string, Map<string, DistrictBrowseGroup>>();

    this.hierarchyBaseBranches.forEach((branch) => {
      const areaName = branch.area?.name?.trim() || this.localeService.translate('churchSelector.otherAreas');
      const areaId = branch.area?.id ?? null;
      const areaKey = this.buildHierarchyKey('area', areaId, areaName);

      if (!areaMap.has(areaKey)) {
        areaMap.set(areaKey, {
          key: areaKey,
          id: areaId,
          name: areaName,
          districts: [],
        });
        districtMapByArea.set(areaKey, new Map<string, DistrictBrowseGroup>());
      }

      const districtName = branch.district?.name?.trim() || this.localeService.translate('churchSelector.otherDistricts');
      const districtId = branch.district?.id ?? null;
      const districtKey = this.buildHierarchyKey('district', districtId, `${areaKey}:${districtName}`);
      const districtsForArea = districtMapByArea.get(areaKey)!;

      if (!districtsForArea.has(districtKey)) {
        const districtGroup: DistrictBrowseGroup = {
          key: districtKey,
          id: districtId,
          name: districtName,
          areaName,
          branches: [],
        };
        districtsForArea.set(districtKey, districtGroup);
        areaMap.get(areaKey)!.districts.push(districtGroup);
      }

      districtsForArea.get(districtKey)!.branches.push(branch);
    });

    return [...areaMap.values()]
      .map((area) => ({
        ...area,
        districts: [...area.districts]
          .map((district) => ({
            ...district,
            branches: [...district.branches].sort((left, right) => left.name.localeCompare(right.name)),
          }))
          .sort((left, right) => left.name.localeCompare(right.name)),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  get currentAreaGroup(): AreaBrowseGroup | null {
    if (!this.selectedAreaKey) {
      return null;
    }

    return this.areaGroups.find((area) => area.key === this.selectedAreaKey) ?? null;
  }

  get currentDistrictGroups(): DistrictBrowseGroup[] {
    return this.currentAreaGroup?.districts ?? [];
  }

  get currentDistrictGroup(): DistrictBrowseGroup | null {
    if (!this.selectedDistrictKey) {
      return null;
    }

    return this.currentDistrictGroups.find((district) => district.key === this.selectedDistrictKey) ?? null;
  }

  get currentChurches(): PublicBranch[] {
    return this.currentDistrictGroup?.branches ?? [];
  }

  get breadcrumbs(): Array<{ label: string; level: BrowseLevel; current: boolean }> {
    const crumbs: Array<{ label: string; level: BrowseLevel; current: boolean }> = [];
    const area = this.currentAreaGroup;
    const district = this.currentDistrictGroup;

    if (area) {
      crumbs.push({ label: area.name, level: 'areas', current: this.currentLevel === 'districts' && !district });
    }
    if (district) {
      crumbs.push({ label: district.name, level: 'districts', current: this.currentLevel === 'churches' });
    }

    return crumbs;
  }

  get searchResultSections(): SearchResultSection[] {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return [];
    }

    const areas = this.areaGroups.filter((area) => area.name.toLowerCase().includes(normalizedTerm));
    const districts: Array<{ area: AreaBrowseGroup; district: DistrictBrowseGroup }> = [];
    this.areaGroups.forEach((area) => {
      area.districts.forEach((district) => {
        if (district.name.toLowerCase().includes(normalizedTerm)) {
          districts.push({ area, district });
        }
      });
    });
    const churches = [...this.allBranches]
      .filter((branch) => {
        const haystack = [
          branch.name,
          branch.district?.name ?? '',
          branch.area?.name ?? '',
          branch.branch_code ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedTerm);
      })
      .sort((left, right) => {
        const savedDelta = Number(this.isSaved(right.id)) - Number(this.isSaved(left.id));
        if (savedDelta !== 0) {
          return -savedDelta;
        }
        return left.name.localeCompare(right.name);
      });

    const sections: SearchResultSection[] = [];

    if (areas.length > 0) {
      sections.push({
        title: this.localeService.translate('churchSelector.areas'),
        items: areas.map((area) => ({ kind: 'area' as const, area })),
      });
    }

    if (districts.length > 0) {
      sections.push({
        title: this.localeService.translate('churchSelector.districts'),
        items: districts.map((entry) => ({
          kind: 'district' as const,
          area: entry.area,
          district: entry.district,
        })),
      });
    }

    if (churches.length > 0) {
      sections.push({
        title: this.localeService.translate('churchSelector.locals'),
        items: churches.map((branch) => ({ kind: 'church' as const, branch })),
      });
    }

    return sections;
  }

  selectArea(area: AreaBrowseGroup): void {
    this.openArea(area);
  }

  selectDistrict(district: DistrictBrowseGroup): void {
    const area = this.currentAreaGroup;
    if (!area) {
      return;
    }
    this.openDistrict(area, district);
  }

  openArea(area: AreaBrowseGroup): void {
    this.selectedAreaKey = area.key;
    this.selectedDistrictKey = null;
    this.searchTerm = '';
  }

  openDistrict(area: AreaBrowseGroup, district: DistrictBrowseGroup): void {
    this.selectedAreaKey = area.key;
    this.selectedDistrictKey = district.key;
    this.searchTerm = '';
  }

  navigateToBreadcrumb(level: BrowseLevel): void {
    if (level === 'areas') {
      this.selectedDistrictKey = null;
      return;
    }

    if (level === 'districts') {
      this.selectedDistrictKey = null;
    }
  }

  resetHierarchy(): void {
    this.selectedAreaKey = null;
    this.selectedDistrictKey = null;
  }

  stepBack(): void {
    if (this.currentLevel === 'churches') {
      this.selectedDistrictKey = null;
      return;
    }

    if (this.currentLevel === 'districts') {
      this.selectedAreaKey = null;
    }
  }

  selectBranch(branch: PublicBranch): void {
    if (!this.selectedBranchService.setBranch(branch)) {
      void this.router.navigate(['/branches']);
      return;
    }

    void this.analyticsService.trackBranchSelected({
      church_id: branch.id,
      district_id: branch.district?.id ?? undefined,
      area_id: branch.area?.id ?? undefined,
      user_type: this.analyticsService.getUserType(),
    });
    void this.router.navigate(['/tabs/donate']);
  }

  getHierarchy(branch: PublicBranch): string {
    const parts = [];
    if (branch.district?.name) {
      parts.push(`${branch.district.name} ${this.localeService.translate('churchSelector.districtLabelSuffix')}`);
    }
    if (branch.area?.name) {
      parts.push(`${branch.area.name} ${this.localeService.translate('churchSelector.areaLabelSuffix')}`);
    }
    return parts.join(' - ');
  }

  districtCountLabel(count: number): string {
    return this.localeService.translate(
      count === 1 ? 'churchSelector.districtCountOne' : 'churchSelector.districtCountOther',
      { count }
    );
  }

  churchCountLabel(count: number): string {
    return this.localeService.translate(
      count === 1 ? 'churchSelector.churchCountOne' : 'churchSelector.churchCountOther',
      { count }
    );
  }

  savedChurchAriaLabel(branchId: number): string {
    return this.localeService.translate(
      this.isSaved(branchId) ? 'churchSelector.removeSavedChurchAria' : 'churchSelector.saveChurchAria'
    );
  }

  getBranchCardSecondaryText(branch: PublicBranch): string {
    return branch.district?.name?.trim() || '';
  }

  isSaved(branchId: number): boolean {
    return this.savedChurchIdsByBranchId.has(branchId);
  }

  isSaving(branchId: number): boolean {
    return this.savingBranchIds.has(branchId);
  }

  heartAnimationState(branchId: number): 'save' | 'unsave' | null {
    return this.heartAnimationByBranchId.get(branchId) ?? null;
  }

  toggleSavedChurch(branch: PublicBranch, event: Event): void {
    event.stopPropagation();

    if (!this.authService.isAuthenticatedSnapshot) {
      void this.handleUnauthenticatedSaveAttempt();
      return;
    }

    if (this.savingBranchIds.has(branch.id)) {
      return;
    }

    const existingSavedChurchId = this.savedChurchIdsByBranchId.get(branch.id);
    const wasSaved = existingSavedChurchId !== undefined;
    this.savingBranchIds.add(branch.id);

    if (wasSaved) {
      this.savedChurchIdsByBranchId.delete(branch.id);
      this.animateHeart(branch.id, 'unsave');
      this.ensureHierarchySelectionIsValid();
      this.authService.unsaveChurch(existingSavedChurchId).subscribe({
        next: async () => {
          this.savingBranchIds.delete(branch.id);
          await this.appToast.success(this.localeService.translate('savedChurches.removedSuccess'));
        },
        error: async () => {
          this.savedChurchIdsByBranchId.set(branch.id, existingSavedChurchId);
          this.animateHeart(branch.id, 'save');
          this.savingBranchIds.delete(branch.id);
          this.ensureHierarchySelectionIsValid();
          await this.appToast.error(this.localeService.translate('savedChurches.removeFailed'));
        },
      });
      return;
    }

    const optimisticSavedChurchId = -branch.id;
    this.savedChurchIdsByBranchId.set(branch.id, optimisticSavedChurchId);
    this.animateHeart(branch.id, 'save');
    this.ensureHierarchySelectionIsValid();
    this.authService.saveChurch(branch.id).subscribe({
      next: async (savedChurch) => {
        this.savedChurchIdsByBranchId.set(branch.id, savedChurch.id);
        this.savingBranchIds.delete(branch.id);
        this.ensureHierarchySelectionIsValid();
        await this.appToast.success(this.localeService.translate('savedChurches.savedSuccess'));
      },
      error: async () => {
        this.savedChurchIdsByBranchId.delete(branch.id);
        this.animateHeart(branch.id, 'unsave');
        this.savingBranchIds.delete(branch.id);
        this.ensureHierarchySelectionIsValid();
        await this.appToast.error(this.localeService.translate('savedChurches.saveFailed'));
      },
    });
  }

  private ensureHierarchySelectionIsValid(): void {
    const area = this.currentAreaGroup;
    if (!area) {
      this.selectedAreaKey = null;
      this.selectedDistrictKey = null;
      return;
    }

    if (!area.districts.some((district) => district.key === this.selectedDistrictKey)) {
      this.selectedDistrictKey = null;
    }
  }

  private resolveBackFallbackRoute(): string {
    const requestedFallback = this.activatedRoute.snapshot.queryParamMap.get('fallback')?.trim();
    if (requestedFallback) {
      return requestedFallback;
    }

    return this.selectedBranchService.getBranch() ? '/tabs/donate' : '/tabs/home';
  }

  private buildHierarchyKey(prefix: string, id: number | null, fallback: string): string {
    return id !== null ? `${prefix}:${id}` : `${prefix}:${fallback.toLowerCase()}`;
  }

  private async handleUnauthenticatedSaveAttempt(): Promise<void> {
    await this.appToast.warning(this.localeService.translate('churchSelector.signInToSave'));
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/branches' },
    });
  }

  private animateHeart(branchId: number, state: 'save' | 'unsave'): void {
    this.heartAnimationByBranchId.set(branchId, state);
    window.setTimeout(() => {
      if (this.heartAnimationByBranchId.get(branchId) === state) {
        this.heartAnimationByBranchId.delete(branchId);
      }
    }, 220);
  }
}
