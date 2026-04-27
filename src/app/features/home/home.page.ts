import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { PublicBranch } from '../../core/models/branch.model';
import { MemberRecentDonation, SavedChurch } from '../../core/models/user.model';
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
  private defaultBranch: PublicBranch | null = null;

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
          this.defaultBranch = null;
          this.applyGuestCta();
          return;
        }

        this.loadPersonalization();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handlePrimaryCta(): void {
    if (this.defaultBranch) {
      if (!this.selectedBranchService.setBranch(this.defaultBranch)) {
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

  goToBranches(): void {
    void this.router.navigate(['/branches']);
  }

  goToAccount(isAuthenticated: boolean | null): void {
    void this.router.navigate([isAuthenticated ? '/profile' : '/login']);
  }

  private loadPersonalization(): void {
    const snapshotRecentDonations = this.authService.currentUserSnapshot?.recent_donations ?? [];
    const recentDonations$ = snapshotRecentDonations.length > 0
      ? of(snapshotRecentDonations)
      : this.authService.getCurrentUser().pipe(
          takeUntil(this.destroy$),
        );

    forkJoin({
      savedChurches: this.authService.getSavedChurches(),
      recentDonationSource: recentDonations$,
    }).subscribe({
      next: ({ savedChurches, recentDonationSource }) => {
        this.savedChurches = savedChurches;
        const recentDonations = Array.isArray(recentDonationSource)
          ? recentDonationSource
          : recentDonationSource?.recent_donations ?? [];
        this.defaultBranch = this.resolveDefaultBranch(savedChurches, recentDonations);
        this.applyAuthenticatedCta(savedChurches, this.defaultBranch);
      },
      error: () => {
        this.savedChurches = [];
        this.defaultBranch = null;
        this.applyGuestCta();
      },
    });
  }

  private applyGuestCta(): void {
    this.ctaLabel = 'Give Now';
    this.helperText = '';
  }

  private applyAuthenticatedCta(savedChurches: SavedChurch[], defaultBranch: PublicBranch | null): void {
    if (defaultBranch) {
      this.ctaLabel = `Give to ${defaultBranch.name}`;
      this.helperText = 'Your giving shortcut is ready';
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

  private resolveDefaultBranch(
    savedChurches: SavedChurch[],
    recentDonations: MemberRecentDonation[]
  ): PublicBranch | null {
    const recentDonationChurch = recentDonations.find((donation) => donation.church)?.church;
    if (recentDonationChurch) {
      const matchingSavedChurch = savedChurches.find(
        (savedChurch) => savedChurch.church.id === recentDonationChurch.id
      );
      if (matchingSavedChurch) {
        return this.toPublicBranch(matchingSavedChurch);
      }

      return {
        id: recentDonationChurch.id,
        name: recentDonationChurch.name,
        branch_code: '',
        level: 'local',
        district: null,
        area: null,
        donations_enabled: true,
        is_active: true,
      };
    }

    if (savedChurches.length > 0) {
      const mostRecentlySavedChurch = [...savedChurches].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      )[0];
      return this.toPublicBranch(mostRecentlySavedChurch);
    }

    return null;
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
