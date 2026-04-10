import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { BranchesService } from '../../core/services/branches.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { PublicBranch } from '../../core/models/branch.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-branch-select',
  template: `
    <ion-page>
      <ion-content fullscreen class="branch-content">
        <div class="branch-hero app-header app-header--inner">
          <div class="app-header__inner">
            <button class="hero-back app-header__back" type="button" (click)="goBack()">
              <ion-icon class="app-back-icon" name="chevron-back" aria-hidden="true"></ion-icon>
              <span>Back</span>
            </button>
            <div class="app-header__copy">
              <h1 class="app-header__title">Choose your church</h1>
              <p class="app-header__subtitle">Your donation goes directly to the selected branch.</p>
            </div>
          </div>
        </div>

        <div class="surface branch-surface">
          <div class="surface__content">
            <ion-searchbar
              [(ngModel)]="searchTerm"
              placeholder="Search by name or district..."
              debounce="300"
              (ionInput)="onSearchChange()"
              class="branch-search"
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
              <ion-button fill="clear" (click)="loadBranches()">Retry</ion-button>
            </div>

            <div *ngIf="!loading && !error && branches.length === 0" class="state-card empty-state">
              <div class="empty-copy">
                <h3>{{ searchTerm ? 'No matching branches' : 'No branches available' }}</h3>
                <p>
                  {{ searchTerm
                    ? 'Try a different church name, district, or area.'
                    : 'There are currently no donation branches available. Please try again later.' }}
                </p>
              </div>
            </div>

            <ng-container *ngIf="!loading && branches.length > 0">
              <ng-container *ngIf="isSearching; else groupedList">
                <ion-list lines="none">
                  <ion-item
                    button
                    [detail]="false"
                    lines="none"
                    *ngFor="let branch of filteredBranches"
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

                    <span class="branch-card__chevron" aria-hidden="true">
                      <ion-icon name="chevron-forward"></ion-icon>
                    </span>
                  </ion-item>
                </ion-list>
              </ng-container>
              <ng-template #groupedList>
                <div *ngFor="let section of groupedBranches" class="district-section">
                  <div class="district-header">{{ section.district || 'Other districts' }}</div>
                  <ion-list lines="none">
                    <ion-item
                      button
                      [detail]="false"
                      lines="none"
                      *ngFor="let branch of section.branches"
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

                      <span class="branch-card__chevron" aria-hidden="true">
                        <ion-icon name="chevron-forward"></ion-icon>
                      </span>
                    </ion-item>
                  </ion-list>
                </div>
              </ng-template>
            </ng-container>
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

      ion-content.branch-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        --background: #0b1d73;
      }

      ion-content.branch-content::part(scroll) {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 100%;
      }

      .branch-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .branch-hero {
        border-bottom-left-radius: 28px;
        border-bottom-right-radius: 28px;
      }

      .skeleton-stack {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .branch-card.skeleton {
        display: flex;
        align-items: center;
        padding: 1rem 1.2rem;
        border-radius: 22px;
        box-shadow: none;
        background: #ffffff;
        animation: pulse 1.2s infinite ease-in-out;
      }

      .icon-placeholder {
        width: 32px;
        height: 32px;
        border-radius: 12px;
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

      ion-list {
        margin-top: 0.15rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .branch-search {
        --background: #ffffff;
        --border-radius: 16px;
        box-shadow: 0 6px 14px rgba(2, 18, 54, 0.06);
        --padding-start: 1rem;
        --padding-end: 1rem;
        height: 44px;
        --placeholder-color: rgba(3, 23, 63, 0.45);
      }

      .branch-search::part(search-icon) {
        opacity: 0.45;
      }

      .state-card {
        padding: 1rem 1.2rem;
        background: #ffffff;
        border-radius: 18px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.65rem;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
      }

      .state-card.empty-state {
        flex-direction: column;
        gap: 0.35rem;
        padding: 1.2rem 1.25rem;
      }

      .empty-copy {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .empty-copy h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: rgba(3, 23, 63, 0.9);
      }

      .empty-copy p {
        margin: 0;
        font-size: 0.9rem;
        color: rgba(3, 23, 63, 0.65);
      }

      ion-list {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .branch-card {
        background: #ffffff;
        border-radius: 22px;
        padding: 1rem 1.2rem;
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05);
        --background: transparent;
        align-items: center;
        transition: transform 120ms ease-out, box-shadow 120ms ease-out;
        will-change: transform;
      }

      .branch-card ion-label {
        border: none;
        flex: 1;
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

      .district-section {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }

      .district-header {
        font-size: 0.9rem;
        font-weight: 600;
        color: rgba(3, 23, 63, 0.7);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .label-top {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
      }

        h2 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.2;
          color: #03173f;
        }

        .hierarchy {
          margin: 0;
          font-size: 0.85rem;
          font-weight: 400;
          line-height: 1.35;
          color: rgba(3, 23, 63, 0.78);
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
    `
  ],
})
export class BranchSelectPage implements OnInit {
  searchTerm = '';
  loading = false;
  error: string | null = null;
  branches: PublicBranch[] = [];

  constructor(
    private readonly branchesService: BranchesService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(search?: string): void {
    this.loading = true;
    this.error = null;
    this.branches = [];

    this.branchesService
      .getBranches({
        search: search ?? this.searchTerm,
        page_size: 50,
      })
      .subscribe({
        next: response => {
          this.branches = response.results;
          this.loading = false;
        },
        error: () => {
          this.error = 'Unable to load branches. Please try again.';
          this.loading = false;
        },
      });
  }

  getHierarchy(branch: PublicBranch): string {
    const parts = [];
    if (branch.district?.name) {
      parts.push(`${branch.district.name} District`);
    }
    if (branch.area?.name) {
      parts.push(`${branch.area.name} Area`);
    }
    return parts.join(' • ');
  }

  onSearchChange(): void {
    this.loadBranches(this.searchTerm);
  }

  get isSearching(): boolean {
    return Boolean(this.searchTerm?.trim());
  }

  get filteredBranches(): PublicBranch[] {
    return this.branches;
  }

  get groupedBranches(): { district: string | null; branches: PublicBranch[] }[] {
    const groups = new Map<string | null, PublicBranch[]>();
    this.branches.forEach(branch => {
      const key = branch.district?.name?.trim() || 'Other districts';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(branch);
    });
    return Array.from(groups.entries()).map(([district, branches]) => ({ district, branches }));
  }

  selectBranch(branch: PublicBranch): void {
    this.selectedBranchService.setBranch(branch);
    this.router.navigate(['/donate']);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
