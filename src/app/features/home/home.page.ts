import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { PublicBranch } from '../../core/models/branch.model';
import { DevotionalPublicDetail } from '../../core/models/devotional.model';
import { MemberRecentDonation, SavedChurch } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { DevotionalService } from '../../core/services/devotional.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import {
  BuildSafetyLabelComponent,
  shouldShowBuildSafetyLabel,
} from '../../shared/components/build-safety-label.component';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, BuildSafetyLabelComponent, PageHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  readonly isAuthenticated$: Observable<boolean>;
  readonly showBuildSafetyLabel = shouldShowBuildSafetyLabel();
  readonly devotionalPreviewMaxLength = 140;
  private readonly destroy$ = new Subject<void>();
  private savedChurches: SavedChurch[] = [];
  private defaultBranch: PublicBranch | null = null;
  private personalizationRequestId = 0;
  private todayDevotionalRequestId = 0;
  private todayDevotionalRequestInFlight = false;
  private todayDevotionalImageFailed = false;

  todayDevotional: DevotionalPublicDetail | null = null;
  todayDevotionalLoading = true;
  todayDevotionalRefreshing = false;
  todayDevotionalError = false;
  hasTodayDevotional = false;

  constructor(
    private readonly authService: AuthService,
    private readonly devotionalService: DevotionalService,
    private readonly selectedBranchService: SelectedBranchService,
    private readonly router: Router,
    private readonly analyticsService: AnalyticsService
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  ngOnInit(): void {
    this.loadTodayDevotional();

    this.isAuthenticated$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((isAuthenticated) => {
        if (!isAuthenticated) {
          this.resetGuestState();
          return;
        }

        this.loadPersonalization();
      });
  }

  ionViewWillEnter(): void {
    this.refreshForCurrentAuthState();
    this.loadTodayDevotional({ preserveCurrent: this.hasTodayDevotional });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get greeting(): string {
    const firstName = this.authService.currentUserSnapshot?.first_name?.trim();
    if (!firstName) {
      return 'Welcome';
    }
    return `Welcome back, ${firstName}`;
  }

  get selectedBranchName(): string | null {
    return this.defaultBranch?.name?.trim() || null;
  }

  get profileIcon(): string {
    return this.authService.isAuthenticatedSnapshot ? 'person-circle' : 'person-outline';
  }

  handlePrimaryCta(): void {
    if (this.defaultBranch) {
      void this.analyticsService.trackGiveNowTapped('saved_church');
      if (!this.selectedBranchService.setBranch(this.defaultBranch)) {
        void this.router.navigate(['/branches']);
        return;
      }
      void this.analyticsService.trackBranchSelected({
        church_id: this.defaultBranch.id,
        district_id: this.defaultBranch.district?.id ?? undefined,
        area_id: this.defaultBranch.area?.id ?? undefined,
        user_type: this.analyticsService.getUserType(),
      });
      void this.router.navigate(['/donate']);
      return;
    }

    if (this.savedChurches.length > 1) {
      void this.analyticsService.trackGiveNowTapped('saved_churchs_list');
      void this.router.navigate(['/saved-churches']);
      return;
    }

    void this.analyticsService.trackGiveNowTapped('default');
    void this.router.navigate(['/branches']);
  }

  goToBranches(): void {
    void this.router.navigate(['/branches']);
  }

  goToGive(): void {
    this.handlePrimaryCta();
  }

  goToPrayer(): void {
    void this.router.navigate(['/prayer']);
  }

  goToBibleStudy(): void {
    void this.router.navigate(['/bible-study']);
  }

  goToDevotionals(): void {
    void this.router.navigate(['/devotionals']);
  }

  async openTodayDevotional(): Promise<void> {
    const detailRoute = this.getTodayDevotionalDetailRoute();
    if (!detailRoute) {
      return;
    }

    await this.router.navigateByUrl(detailRoute);
  }

  retryTodayDevotional(): void {
    this.loadTodayDevotional({ preserveCurrent: this.hasTodayDevotional });
  }

  hasTodayScriptureReference(): boolean {
    return !!this.todayDevotional?.scripture_reference?.trim();
  }

  shouldShowTodayDevotionalImage(): boolean {
    return !!this.todayDevotional?.cover_image?.trim() && !this.todayDevotionalImageFailed;
  }

  handleTodayDevotionalImageError(): void {
    this.todayDevotionalImageFailed = true;
  }

  getTodayDevotionalPreview(): string {
    const content = this.todayDevotional?.content ?? '';
    const normalized = content.replace(/\s+/g, ' ').trim();

    if (!normalized) {
      return '';
    }

    if (normalized.length <= this.devotionalPreviewMaxLength) {
      return normalized;
    }

    const clipped = normalized.slice(0, this.devotionalPreviewMaxLength + 1);
    const lastSpace = clipped.lastIndexOf(' ');
    const safePreview = (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped.slice(0, this.devotionalPreviewMaxLength)).trim();
    return `${safePreview}…`;
  }

  buildTodayDevotionalAriaLabel(): string {
    if (!this.todayDevotional) {
      return "Read today's devotional";
    }

    const parts = ["Read today's devotional", this.todayDevotional.title];
    if (this.hasTodayScriptureReference()) {
      parts.push(this.todayDevotional.scripture_reference.trim());
    }

    return parts.join(', ');
  }

  getTodayDevotionalImageAlt(): string {
    const title = this.todayDevotional?.title?.trim();
    return title ? `${title} cover image` : 'Devotional cover image';
  }

  goToAccount(isAuthenticated: boolean | null): void {
    void this.router.navigate([isAuthenticated ? '/profile' : '/login']);
  }

  readonly openAccountFromHeader = (): void => {
    this.goToAccount(this.authService.isAuthenticatedSnapshot);
  };

  private loadPersonalization(): void {
    if (!this.authService.isAuthenticatedSnapshot) {
      this.resetGuestState();
      return;
    }

    const requestId = ++this.personalizationRequestId;
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
        if (!this.isRequestCurrent(requestId) || !this.authService.isAuthenticatedSnapshot) {
          return;
        }

        this.savedChurches = savedChurches;
        const recentDonations = Array.isArray(recentDonationSource)
          ? recentDonationSource
          : recentDonationSource?.recent_donations ?? [];
        this.defaultBranch = this.resolveDefaultBranch(savedChurches, recentDonations);
        this.applyAuthenticatedCta(savedChurches, this.defaultBranch);
      },
      error: () => {
        if (!this.isRequestCurrent(requestId)) {
          return;
        }

        this.resetGuestState();
      },
    });
  }

  private refreshForCurrentAuthState(): void {
    if (!this.authService.isAuthenticatedSnapshot) {
      this.resetGuestState();
      return;
    }

    this.loadPersonalization();
  }

  private loadTodayDevotional(options?: { preserveCurrent?: boolean }): void {
    if (this.todayDevotionalRequestInFlight) {
      return;
    }

    const preserveCurrent = !!options?.preserveCurrent && this.hasTodayDevotional && !!this.todayDevotional;
    const requestId = ++this.todayDevotionalRequestId;

    this.todayDevotionalRequestInFlight = true;
    this.todayDevotionalLoading = !preserveCurrent;
    this.todayDevotionalRefreshing = preserveCurrent;
    this.todayDevotionalError = false;

    if (!preserveCurrent) {
      this.todayDevotional = null;
      this.hasTodayDevotional = false;
      this.todayDevotionalImageFailed = false;
    }

    this.devotionalService.getTodayDevotional().subscribe({
      next: (devotional) => {
        if (requestId !== this.todayDevotionalRequestId) {
          return;
        }

        this.todayDevotional = devotional;
        this.hasTodayDevotional = true;
        this.todayDevotionalError = false;
        this.todayDevotionalLoading = false;
        this.todayDevotionalRefreshing = false;
        this.todayDevotionalImageFailed = false;
        this.todayDevotionalRequestInFlight = false;
      },
      error: (error: unknown) => {
        if (requestId !== this.todayDevotionalRequestId) {
          return;
        }

        this.todayDevotionalLoading = false;
        this.todayDevotionalRefreshing = false;
        this.todayDevotionalRequestInFlight = false;

        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.todayDevotional = null;
          this.hasTodayDevotional = false;
          this.todayDevotionalError = false;
          this.todayDevotionalImageFailed = false;
          return;
        }

        this.todayDevotionalError = true;
      },
    });
  }

  private getTodayDevotionalDetailRoute(): string | null {
    const normalizedSlug = this.todayDevotional?.slug?.trim() ?? '';
    if (!normalizedSlug) {
      return null;
    }

    return `/devotionals/${encodeURIComponent(normalizedSlug)}`;
  }

  private resetGuestState(): void {
    this.personalizationRequestId++;
    this.savedChurches = [];
    this.defaultBranch = null;
  }

  private isRequestCurrent(requestId: number): boolean {
    return requestId === this.personalizationRequestId;
  }

  private applyAuthenticatedCta(savedChurches: SavedChurch[], defaultBranch: PublicBranch | null): void {
    this.savedChurches = savedChurches;
    this.defaultBranch = defaultBranch;
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
