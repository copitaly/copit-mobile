import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { firstValueFrom, forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, takeUntil, timeout } from 'rxjs/operators';

import { AnalyticsService } from '../../core/services/analytics.service';
import { BibleStudyManualListItem } from '../../core/models/bible-study.model';
import { PublicBranch } from '../../core/models/branch.model';
import { DevotionalPublicDetail } from '../../core/models/devotional.model';
import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import { MemberRecentDonation, SavedChurch } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { BibleStudyMetadataService } from '../../core/services/bible-study-metadata.service';
import { BibleStudyService } from '../../core/services/bible-study.service';
import { DevotionalService } from '../../core/services/devotional.service';
import { SelectedBranchService } from '../../core/services/selected-branch.service';
import {
  BuildSafetyLabelComponent,
  shouldShowBuildSafetyLabel,
} from '../../shared/components/build-safety-label.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, BuildSafetyLabelComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  private static readonly requestTimeoutMs = 15000;

  private readonly authService = inject(AuthService);
  private readonly bibleStudyService = inject(BibleStudyService);
  private readonly bibleStudyMetadataService = inject(BibleStudyMetadataService);
  private readonly devotionalService = inject(DevotionalService);
  private readonly selectedBranchService = inject(SelectedBranchService);
  private readonly router = inject(Router);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly localeService = inject(LocaleService);

  readonly isAuthenticated$: Observable<boolean>;
  readonly showBuildSafetyLabel = shouldShowBuildSafetyLabel();
  readonly devotionalPreviewMaxLength = 140;
  readonly scriptureSnippetMaxLength = 92;
  readonly bannerImagePath = 'assets/img/cop-home-images/banner2.jpeg';
  readonly offeringImagePath = 'assets/img/cop-home-images/offering.png';
  readonly studyImagePath = 'assets/img/cop-home-images/bible-study.png';
  readonly devotionImagePath = 'assets/img/cop-home-images/daily-devotion.png';
  private readonly destroy$ = new Subject<void>();
  private savedChurches: SavedChurch[] = [];
  private defaultBranch: PublicBranch | null = null;
  private personalizationRequestId = 0;
  private todayDevotionalRequestId = 0;
  private featuredManualRequestId = 0;
  private todayDevotionalRequestInFlight = false;
  private personalizationRequestInFlight = false;
  private featuredManualRequestInFlight = false;
  private featuredManualImageFailed = false;
  private todayDevotionalImageFailed = false;
  private navigationPending = false;
  private homeRefreshInFlight = false;

  todayDevotional: DevotionalPublicDetail | null = null;
  featuredManual: BibleStudyManualListItem | null = null;
  todayDevotionalLoading = true;
  featuredManualLoading = true;
  todayDevotionalRefreshing = false;
  todayDevotionalError = false;
  featuredManualError = false;
  todayDevotionalEmpty = false;
  hasTodayDevotional = false;
  todayDevotionalStatusMessage = '';
  liveStatusMessage = '';

  constructor() {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  ngOnInit(): void {
    void this.loadFeaturedManual();
    void this.loadTodayDevotional();

    this.isAuthenticated$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((isAuthenticated) => {
        if (!isAuthenticated) {
          this.resetGuestState();
          return;
        }

        void this.loadPersonalization();
      });
  }

  ionViewWillEnter(): void {
    if (!this.authService.isAuthenticatedSnapshot) {
      this.resetGuestState();
    } else {
      void this.loadPersonalization({ preserveCurrent: true });
    }

    void this.loadFeaturedManual({ preserveCurrent: !!this.featuredManual });
    void this.loadTodayDevotional({ preserveCurrent: this.hasTodayDevotional });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return this.localeService.translate('home.greeting.morning');
    }
    if (hour < 18) {
      return this.localeService.translate('home.greeting.afternoon');
    }
    return this.localeService.translate('home.greeting.evening');
  }

  get greetingTitle(): string {
    const firstName = this.normalizeText(this.authService.currentUserSnapshot?.first_name);
    if (!firstName) {
      return this.localeService.translate('home.title');
    }

    const shortenedName = firstName.length > 24 ? `${firstName.slice(0, 24).trim()}...` : firstName;
    return this.localeService.translate('home.personalizedTitle', { name: shortenedName });
  }

  get greetingSupportText(): string {
    return this.localeService.translate('home.subtitle');
  }

  get hasTodayDevotionalRefreshMessage(): boolean {
    return this.todayDevotionalError && this.hasTodayDevotional && !!this.todayDevotionalStatusMessage;
  }

  get featuredHeroEyebrow(): string {
    return this.localeService.translate(this.featuredManual ? 'home.featuredEyebrow' : 'home.featuredFallbackEyebrow');
  }

  get featuredHeroTitle(): string {
    return this.featuredManual?.title || this.localeService.translate('home.featuredFallbackTitle');
  }

  get featuredHeroMeta(): string {
    if (!this.featuredManual) {
      return this.localeService.translate('home.featuredFallbackMeta');
    }

    return this.bibleStudyMetadataService.formatMetadata(this.featuredManual);
  }

  get featuredHeroActionLabel(): string {
    return this.localeService.translate('home.featuredCta');
  }

  get featuredHeroImageAlt(): string {
    return this.featuredManual?.title ? `${this.featuredManual.title} ${this.localeService.translate('common.coverImage')}` : this.localeService.translate('home.featuredImageAltFallback');
  }

  get featuredHeroAriaLabel(): string {
    if (this.featuredManual?.title) {
      return this.localeService.translate('bibleStudy.openManualAria', { title: this.featuredManual.title });
    }

    return this.localeService.translate('home.featuredAriaFallback');
  }

  get latestBibleStudyImage(): string {
    const manualCover = this.normalizeText(this.featuredManual?.cover_image_url);
    return manualCover && !this.featuredManualImageFailed ? manualCover : this.studyImagePath;
  }

  get latestDevotionImage(): string {
    const devotionCover = this.normalizeText(this.todayDevotional?.cover_image);
    return devotionCover && !this.todayDevotionalImageFailed ? devotionCover : this.devotionImagePath;
  }

  get latestDevotionPreview(): string {
    return this.todayDevotionalScriptureSnippet || this.getTodayDevotionalPreview();
  }

  get todayDevotionalDateLabel(): string | null {
    const rawDate = this.normalizeText(this.todayDevotional?.publication_date);
    if (!rawDate) {
      return null;
    }

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(this.getIntlLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(parsed);
  }

  get todayDevotionalScriptureSnippet(): string | null {
    const snippet = this.normalizeText(this.todayDevotional?.scripture_text);
    if (!snippet) {
      return null;
    }

    return snippet.length > this.scriptureSnippetMaxLength
      ? `${snippet.slice(0, this.scriptureSnippetMaxLength).trim()}...`
      : snippet;
  }

  get showUpcomingServiceCard(): boolean {
    return false;
  }

  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    if (
      this.homeRefreshInFlight ||
      this.todayDevotionalRequestInFlight ||
      this.personalizationRequestInFlight ||
      this.featuredManualRequestInFlight
    ) {
      await event.target.complete();
      return;
    }

    this.homeRefreshInFlight = true;
    this.liveStatusMessage = this.localeService.translate('home.refreshing');

    try {
      await Promise.all([
        this.loadFeaturedManual({ preserveCurrent: !!this.featuredManual }),
        this.loadTodayDevotional({
          preserveCurrent: this.hasTodayDevotional,
          isRefresh: true,
        }),
        this.authService.isAuthenticatedSnapshot
          ? this.loadPersonalization({ preserveCurrent: true })
          : Promise.resolve(),
      ]);
    } finally {
      await event.target.complete();
      this.homeRefreshInFlight = false;
    }
  }

  openAccount(): void {
    this.goToAccount(this.authService.isAuthenticatedSnapshot);
  }

  handlePrimaryCta(): void {
    void this.runNavigationAction(async () => {
      if (this.defaultBranch) {
        await this.analyticsService.trackGiveNowTapped('saved_church');
        if (!this.selectedBranchService.setBranch(this.defaultBranch)) {
          await this.router.navigate(['/branches']);
          return;
        }
        await this.analyticsService.trackBranchSelected({
          church_id: this.defaultBranch.id,
          district_id: this.defaultBranch.district?.id ?? undefined,
          area_id: this.defaultBranch.area?.id ?? undefined,
          user_type: this.analyticsService.getUserType(),
        });
        await this.router.navigate(['/donate']);
        return;
      }

      if (this.savedChurches.length > 1) {
        await this.analyticsService.trackGiveNowTapped('saved_churchs_list');
        await this.router.navigate(['/saved-churches']);
        return;
      }

      await this.analyticsService.trackGiveNowTapped('default');
      await this.router.navigate(['/branches']);
    });
  }

  goToBranches(): void {
    void this.navigateTo(['/branches']);
  }

  goToCommunity(): void {
    void this.navigateTo('/tabs/prayer/community', true);
  }

  goToGive(): void {
    this.handlePrimaryCta();
  }

  goToPrayer(): void {
    void this.navigateTo('/tabs/prayer', true);
  }

  goToProfile(): void {
    void this.navigateTo(this.authService.isAuthenticatedSnapshot ? '/tabs/profile' : '/login', true);
  }

  goToBibleStudy(): void {
    void this.navigateTo('/tabs/bible-study', true);
  }

  goToDevotionals(): void {
    void this.navigateTo('/tabs/devotionals', true);
  }

  openFeaturedManual(): void {
    if (this.featuredManual?.id) {
      void this.navigateTo(`/bible-study/${this.featuredManual.id}/read`, true);
      return;
    }

    void this.navigateTo(['/tabs/bible-study']);
  }

  async openTodayDevotional(): Promise<void> {
    const detailRoute = this.getTodayDevotionalDetailRoute() ?? '/devotionals';
    await this.navigateTo(detailRoute, true);
  }

  retryTodayDevotional(): void {
    void this.loadTodayDevotional({ preserveCurrent: this.hasTodayDevotional });
  }

  handleFeaturedManualImageError(): void {
    this.featuredManualImageFailed = true;
  }

  hasTodayScriptureReference(): boolean {
    return !!this.normalizeText(this.todayDevotional?.scripture_reference);
  }

  shouldShowTodayDevotionalImage(): boolean {
    return !!this.normalizeText(this.todayDevotional?.cover_image) && !this.todayDevotionalImageFailed;
  }

  handleTodayDevotionalImageError(): void {
    this.todayDevotionalImageFailed = true;
  }

  getTodayDevotionalTitle(): string {
    return this.normalizeText(this.todayDevotional?.title) || this.localeService.translate('home.dailyFallbackTitle');
  }

  getTodayDevotionalPreview(): string {
    const content = this.normalizeText(this.todayDevotional?.content).replace(/\s+/g, ' ');

    if (!content) {
      return this.localeService.translate('home.dailyFallbackPreview');
    }

    if (content.length <= this.devotionalPreviewMaxLength) {
      return content;
    }

    const clipped = content.slice(0, this.devotionalPreviewMaxLength + 1);
    const lastSpace = clipped.lastIndexOf(' ');
    const safePreview = (
      lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped.slice(0, this.devotionalPreviewMaxLength)
    ).trim();
    return `${safePreview}...`;
  }

  buildTodayDevotionalAriaLabel(): string {
    if (!this.todayDevotional) {
      return this.localeService.translate('home.dailyAriaFallback');
    }

    const parts = [this.localeService.translate('home.dailyAriaFallback'), this.getTodayDevotionalTitle()];
    if (this.hasTodayScriptureReference()) {
      parts.push(this.normalizeText(this.todayDevotional?.scripture_reference));
    }

    return parts.join(', ');
  }

  getTodayDevotionalImageAlt(): string {
    const title = this.getTodayDevotionalTitle();
    return title ? `${title} ${this.localeService.translate('common.coverImage')}` : this.localeService.translate('home.dailyImageAltFallback');
  }

  getEmptyDevotionalAriaLabel(): string {
    return this.localeService.translate('home.dailyEmptyAria');
  }

  goToAccount(isAuthenticated: boolean | null): void {
    void this.navigateTo(isAuthenticated ? '/tabs/profile' : '/login', true);
  }

  private async loadPersonalization(options?: { preserveCurrent?: boolean }): Promise<void> {
    if (this.personalizationRequestInFlight || !this.authService.isAuthenticatedSnapshot) {
      return;
    }

    const requestId = ++this.personalizationRequestId;
    const preserveCurrent = !!options?.preserveCurrent;
    const previousSavedChurches = [...this.savedChurches];
    const previousDefaultBranch = this.defaultBranch;
    const snapshotRecentDonations = this.authService.currentUserSnapshot?.recent_donations ?? [];
    const recentDonationSource$ = snapshotRecentDonations.length > 0
      ? of(this.authService.currentUserSnapshot)
      : this.authService.getCurrentUser().pipe(catchError(() => of(this.authService.currentUserSnapshot)));

    this.personalizationRequestInFlight = true;

    try {
      const result = await firstValueFrom(
        forkJoin({
          savedChurches: this.authService.getSavedChurches().pipe(catchError(() => of(previousSavedChurches))),
          currentUser: recentDonationSource$,
        })
      );

      if (requestId !== this.personalizationRequestId || !this.authService.isAuthenticatedSnapshot) {
        return;
      }

      const savedChurches = Array.isArray(result.savedChurches) ? result.savedChurches : previousSavedChurches;
      const recentDonations = Array.isArray(result.currentUser?.recent_donations)
        ? result.currentUser?.recent_donations ?? []
        : snapshotRecentDonations;

      this.savedChurches = savedChurches;
      this.defaultBranch = this.resolveDefaultBranch(savedChurches, recentDonations);
    } catch {
      if (requestId !== this.personalizationRequestId) {
        return;
      }

      if (!preserveCurrent) {
        this.savedChurches = previousSavedChurches;
        this.defaultBranch = previousDefaultBranch;
      }
    } finally {
      if (requestId === this.personalizationRequestId) {
        this.personalizationRequestInFlight = false;
      }
    }
  }

  private async loadFeaturedManual(options?: { preserveCurrent?: boolean }): Promise<void> {
    if (this.featuredManualRequestInFlight) {
      return;
    }

    const requestId = ++this.featuredManualRequestId;
    const preserveCurrent = !!options?.preserveCurrent && !!this.featuredManual;

    this.featuredManualRequestInFlight = true;
    this.featuredManualLoading = !preserveCurrent;
    this.featuredManualError = false;

    if (!preserveCurrent) {
      this.featuredManual = null;
      this.featuredManualImageFailed = false;
    }

    try {
      const response = await firstValueFrom(
        this.bibleStudyService.getPublishedManuals().pipe(timeout(HomePage.requestTimeoutMs))
      );

      if (requestId !== this.featuredManualRequestId) {
        return;
      }

      this.featuredManual = Array.isArray(response.results) && response.results.length > 0 ? response.results[0] : null;
      this.featuredManualImageFailed = false;
      this.featuredManualError = false;
    } catch {
      if (requestId !== this.featuredManualRequestId) {
        return;
      }

      if (!preserveCurrent) {
        this.featuredManual = null;
      }
      this.featuredManualError = !preserveCurrent;
    } finally {
      if (requestId === this.featuredManualRequestId) {
        this.featuredManualLoading = false;
        this.featuredManualRequestInFlight = false;
      }
    }
  }

  private async loadTodayDevotional(options?: { preserveCurrent?: boolean; isRefresh?: boolean }): Promise<void> {
    if (this.todayDevotionalRequestInFlight) {
      return;
    }

    const preserveCurrent = !!options?.preserveCurrent && this.hasTodayDevotional && !!this.todayDevotional;
    const requestId = ++this.todayDevotionalRequestId;

    this.todayDevotionalRequestInFlight = true;
    this.todayDevotionalLoading = !preserveCurrent;
    this.todayDevotionalRefreshing = preserveCurrent || !!options?.isRefresh;
    this.todayDevotionalError = false;
    this.todayDevotionalEmpty = false;
    this.todayDevotionalStatusMessage = '';

    if (!preserveCurrent) {
      this.todayDevotional = null;
      this.hasTodayDevotional = false;
      this.todayDevotionalImageFailed = false;
    }

    try {
      const devotional = await firstValueFrom(
        this.devotionalService.getTodayDevotional().pipe(timeout(HomePage.requestTimeoutMs))
      );

      if (requestId !== this.todayDevotionalRequestId) {
        return;
      }

      if (!this.isRenderableTodayDevotional(devotional)) {
        this.setTodayDevotionalEmptyState(options?.isRefresh === true);
        return;
      }

      this.todayDevotional = devotional;
      this.hasTodayDevotional = true;
      this.todayDevotionalError = false;
      this.todayDevotionalEmpty = false;
      this.todayDevotionalStatusMessage = '';
      this.todayDevotionalImageFailed = false;
      this.liveStatusMessage = options?.isRefresh ? this.localeService.translate('home.refreshed') : '';
    } catch (error: unknown) {
      if (requestId !== this.todayDevotionalRequestId) {
        return;
      }

      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.setTodayDevotionalEmptyState(options?.isRefresh === true);
        return;
      }

      this.todayDevotionalError = true;
      this.todayDevotionalEmpty = false;
      this.todayDevotionalStatusMessage = this.getTodayDevotionalFailureMessage(error);

      if (!preserveCurrent) {
        this.todayDevotional = null;
        this.hasTodayDevotional = false;
        this.liveStatusMessage = this.todayDevotionalStatusMessage;
      } else {
        this.liveStatusMessage = this.localeService.translate('home.refreshFailed');
      }
    } finally {
      if (requestId === this.todayDevotionalRequestId) {
        this.todayDevotionalLoading = false;
        this.todayDevotionalRefreshing = false;
        this.todayDevotionalRequestInFlight = false;
      }
    }
  }

  private setTodayDevotionalEmptyState(isRefresh: boolean): void {
    this.todayDevotional = null;
    this.hasTodayDevotional = false;
    this.todayDevotionalError = false;
    this.todayDevotionalEmpty = true;
    this.todayDevotionalStatusMessage = '';
    this.todayDevotionalImageFailed = false;
    this.liveStatusMessage = isRefresh
      ? this.localeService.translate('home.refreshedNoDevotion')
      : this.localeService.translate('home.noDevotion');
  }

  private getTodayDevotionalFailureMessage(error: unknown): string {
    if (this.isTimeoutError(error)) {
      return this.localeService.translate('home.devotionTimeout');
    }

    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.localeService.translate('home.devotionOffline');
    }

    return this.localeService.translate('home.devotionLoadError');
  }

  private isTimeoutError(error: unknown): boolean {
    return !!error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'TimeoutError';
  }

  private getTodayDevotionalDetailRoute(): string | null {
    const normalizedSlug = this.normalizeText(this.todayDevotional?.slug);
    if (!normalizedSlug) {
      return null;
    }

    return `/tabs/devotionals/${encodeURIComponent(normalizedSlug)}`;
  }

  private isRenderableTodayDevotional(devotional: DevotionalPublicDetail | null | undefined): devotional is DevotionalPublicDetail {
    if (!devotional) {
      return false;
    }

    return !!(
      this.normalizeText(devotional.title) ||
      this.normalizeText(devotional.content) ||
      this.normalizeText(devotional.scripture_reference)
    );
  }

  private resetGuestState(): void {
    this.personalizationRequestId++;
    this.savedChurches = [];
    this.defaultBranch = null;
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

  private normalizeText(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private getIntlLocale(): string {
    switch (this.localeService.getCurrentLocale()) {
      case 'it':
        return 'it-IT';
      case 'fr':
        return 'fr-FR';
      default:
        return 'en-GB';
    }
  }

  private async navigateTo(target: string | readonly unknown[], byUrl = false): Promise<void> {
    await this.runNavigationAction(async () => {
      if (typeof target === 'string' && byUrl) {
        await this.router.navigateByUrl(target);
        return;
      }

      await this.router.navigate(target as readonly unknown[]);
    });
  }

  private async runNavigationAction(action: () => Promise<void>): Promise<void> {
    if (this.navigationPending) {
      return;
    }

    this.navigationPending = true;

    try {
      await action();
    } finally {
      this.navigationPending = false;
    }
  }
}

