import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { PublicBranch } from '../../core/models/branch.model';
import { SavedChurch } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  readonly isAuthenticated$: Observable<boolean>;
  ctaLabel = 'Give Now';
  helperText = '';
  private readonly destroy$ = new Subject<void>();
  private savedChurches: SavedChurch[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  ngOnInit(): void {
    this.isAuthenticated$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((isAuthenticated) => {
        if (!isAuthenticated) {
          this.savedChurches = [];
          this.applyGuestCta();
          return;
        }

        this.loadSavedChurches();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handlePrimaryCta(): void {
    if (this.savedChurches.length === 1) {
      const branch = this.toPublicBranch(this.savedChurches[0]);
      if (!this.selectedBranchService.setBranch(branch)) {
        void this.router.navigate(['/branches']);
        return;
      }

      void this.router.navigate(['/donate']);
      return;
    }

    if (this.savedChurches.length > 1) {
      void this.router.navigate(['/saved-churches']);
      return;
    }

    void this.router.navigate(['/branches']);
  }

  goToAccount(isAuthenticated: boolean | null): void {
    void this.router.navigate([isAuthenticated ? '/profile' : '/login']);
  }

  private loadSavedChurches(): void {
    this.authService.getSavedChurches().subscribe({
      next: (savedChurches) => {
        this.savedChurches = savedChurches;
        this.applyAuthenticatedCta(savedChurches);
      },
      error: () => {
        this.savedChurches = [];
        this.applyGuestCta();
      },
    });
  }

  private applyGuestCta(): void {
    this.ctaLabel = 'Give Now';
    this.helperText = '';
  }

  private applyAuthenticatedCta(savedChurches: SavedChurch[]): void {
    if (savedChurches.length === 1) {
      this.ctaLabel = `Give to ${savedChurches[0].church.name}`;
      this.helperText = 'Your saved church is ready for giving';
      return;
    }

    if (savedChurches.length > 1) {
      this.ctaLabel = 'Give to saved church';
      this.helperText = 'Choose one of your saved churches';
      return;
    }

    this.ctaLabel = 'Give Now';
    this.helperText = 'Choose and save a church for faster giving';
  }

  private toPublicBranch(savedChurch: SavedChurch): PublicBranch {
    return {
      id: savedChurch.church.id,
      name: savedChurch.church.name,
      branch_code: savedChurch.church.branch_code || '',
      level: 'local',
      district: savedChurch.church.district ?? null,
      area: savedChurch.church.area ?? null,
      donations_enabled: savedChurch.church.donations_enabled,
      is_active: savedChurch.church.is_active,
    };
  }
}
