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
      <ion-header>
        <ion-toolbar>
          <ion-title>Choose a donation branch</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content fullscreen>
        <div class="branches-wrapper">
          <ion-searchbar
            [(ngModel)]="searchTerm"
            placeholder="Search branches"
            show-cancel-button="focus"
            debounce="300"
            (ionInput)="onSearchChange()"
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
              detail
              lines="full"
              *ngFor="let branch of branches"
              (click)="selectBranch(branch)"
            >
              <ion-label>
                <h2>{{ branch.name }}</h2>
                <p *ngIf="branch.district">{{ branch.district.name }}</p>
                <p *ngIf="branch.area">{{ branch.area.name }}</p>
                <p class="code" *ngIf="branch.branch_code">{{ branch.branch_code }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>
      </ion-content>
    </ion-page>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .branches-wrapper {
        padding: 1rem 1.25rem 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      ion-searchbar {
        --background: #fff;
        --border-radius: 14px;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
      }

      .state-card {
        padding: 1rem;
        background: #fff;
        border-radius: 14px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
      }

      ion-item {
        background: #fff;
        border-radius: 14px;
        margin: 0.4rem 0;
        padding: 0.75rem 1rem;
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
      }

      .code {
        font-size: 0.75rem;
        color: var(--ion-color-medium);
        margin-top: 0.25rem;
      }
    `,
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

  onSearchChange(): void {
    this.loadBranches(this.searchTerm);
  }

  selectBranch(branch: PublicBranch): void {
    this.selectedBranchService.setBranch(branch);
    this.router.navigate(['/donate']);
  }
}
