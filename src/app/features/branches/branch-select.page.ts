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
        <div class="branch-hero">
          <div class="hero-back" (click)="goBack()">
            <ion-icon name="chevron-back" aria-hidden="true"></ion-icon>
            <span>Back</span>
          </div>
          <div class="hero-copy">
            <h1>Choose your church</h1>
            <p class="hero-subtitle">Your donation goes directly to the selected branch.</p>
          </div>
        </div>

        <div class="branch-surface">
          <div class="surface-stack">
            <ion-searchbar
              [(ngModel)]="searchTerm"
              placeholder="Search by name or district..."
              debounce="300"
              (ionInput)="onSearchChange()"
              class="branch-search"
            ></ion-searchbar>
            <div *ngIf="loading" class="state-card">
              <ion-spinner name="crescent"></ion-spinner>
              <ion-text>Loading branches…</ion-text>
            </div>

            <div *ngIf="!loading && error" class="state-card">
              <ion-text>{{ error }}</ion-text>
              <ion-button fill="clear" (click)="loadBranches()">Retry</ion-button>
            </div>

            <div *ngIf="!loading && !error && branches.length === 0" class="state-card">
              <ion-text>No donation-ready branches found.</ion-text>
            </div>

            <ion-list *ngIf="branches.length > 0" lines="none">
              <ion-item
                button
                [detail]="false"
                lines="none"
              *ngFor="let branch of branches"
              (click)="selectBranch(branch)"
              class="branch-card"
            >
                <!-- disable Ionic detail indicator so only our chevron shows -->
                <ion-icon name="location" slot="start" aria-hidden="true"></ion-icon>

                <ion-label>
                  <div class="label-top">
                    <h2>{{ branch.name }}</h2>
                    <p class="hierarchy" *ngIf="getHierarchy(branch) as hierarchy">{{ hierarchy }}</p>
                    <p class="code" *ngIf="branch.branch_code">{{ branch.branch_code }}</p>
                  </div>
                </ion-label>

                <ion-icon name="chevron-forward" slot="end" aria-hidden="true"></ion-icon>
              </ion-item>
            </ion-list>
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
        background: linear-gradient(180deg, #081b61, #0b1d73 80%);
        padding: calc(1rem + env(safe-area-inset-top, 0px)) 1rem 0.6rem; /* safe-area-aware header spacing */
        border-bottom-left-radius: 28px;
        border-bottom-right-radius: 28px;
        box-shadow: 0 18px 45px rgba(2, 18, 54, 0.35);
      }

      .hero-back {
        display: inline-flex;
        align-items: center;
        gap: 0.15rem;
        color: #ffffff;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        margin-bottom: 0.6rem;
      }

      .hero-copy {
        color: #ffffff;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .hero-copy h1 {
        font-size: 1.85rem;
        margin: 0;
        font-weight: 600;
        line-height: 1.2;
      }

      .hero-subtitle {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.4;
        opacity: 0.75;
        max-width: 380px;
      }

      .branch-surface {
        background: #f5f6fa;
        border-top-left-radius: 22px;
        border-top-right-radius: 22px;
        margin-top: 0;
        padding: 0.9rem 1.25rem 1.8rem;
        display: flex;
        justify-content: center;
        flex: 1;
        overflow: hidden;
      }

      .surface-stack {
        width: 100%;
        max-width: 520px;
        display: flex;
        flex-direction: column;
        gap: 0.9rem; /* tighten spacing between search bar and card list */
        overflow: auto;
        padding-bottom: 2rem;
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
        transition: transform 0.2s ease, box-shadow 0.2s ease;
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

      ion-icon[slot='end'] {
        color: rgba(3, 23, 63, 0.65);
        font-size: 18px;
        margin-right: 0.25rem;
      }

      .branch-card:active {
        transform: scale(0.98);
        box-shadow: 0 12px 22px rgba(0, 0, 0, 0.08);
      }

      .label-top {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
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
          white-space: normal;
          word-break: break-word;
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

  selectBranch(branch: PublicBranch): void {
    this.selectedBranchService.setBranch(branch);
    this.router.navigate(['/donate']);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
