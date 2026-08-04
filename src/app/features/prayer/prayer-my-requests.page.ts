import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import {
  MemberPrayerRequest,
  PrayerScope,
  PrayerStatus,
  PrayerVisibility,
} from '../../core/models/prayer.model';
import { MyPrayerRequestFilters, PrayerService } from '../../core/services/prayer.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

type PrayerStatusFilter = PrayerStatus | 'all';
type PrayerVisibilityFilter = PrayerVisibility | 'all';
type PrayerScopeFilter = PrayerScope | 'all';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-prayer-my-requests',
  templateUrl: './prayer-my-requests.page.html',
  styleUrls: ['./prayer-my-requests.page.scss'],
})
export class PrayerMyRequestsPage implements OnInit {
  private readonly prayerService = inject(PrayerService);
  private readonly router = inject(Router);
  private readonly localeService = inject(LocaleService);

  prayers: MemberPrayerRequest[] = [];
  loading = true;
  refreshing = false;
  loadingMore = false;
  errorMessage = '';
  loadMoreErrorMessage = '';
  nextPageUrl: string | null = null;

  selectedStatus: PrayerStatusFilter = 'all';
  selectedVisibility: PrayerVisibilityFilter = 'all';
  selectedScope: PrayerScopeFilter = 'all';

  isDetailOpen = false;
  detailLoading = false;
  detailErrorMessage = '';
  selectedPrayerDetailId: number | null = null;
  selectedPrayerDetail: MemberPrayerRequest | null = null;

  readonly skeletonItems = [1, 2, 3];
  readonly statusOptions: ReadonlyArray<{ value: PrayerStatusFilter; label: string }> = [
    { value: 'all', label: 'prayer.allStatuses' },
    { value: 'pending', label: 'prayer.pendingReview' },
    { value: 'approved', label: 'prayer.approved' },
    { value: 'rejected', label: 'prayer.notApproved' },
    { value: 'resolved', label: 'prayer.resolved' },
  ];
  readonly visibilityOptions: ReadonlyArray<{ value: PrayerVisibilityFilter; label: string }> = [
    { value: 'all', label: 'prayer.allVisibility' },
    { value: 'private', label: 'prayer.visibilityPrivate' },
    { value: 'public', label: 'prayer.visibilityPublic' },
  ];
  readonly scopeOptions: ReadonlyArray<{ value: PrayerScopeFilter; label: string }> = [
    { value: 'all', label: 'prayer.allScopes' },
    { value: 'global', label: 'prayer.global' },
    { value: 'area', label: 'prayer.area' },
    { value: 'district', label: 'prayer.district' },
    { value: 'local', label: 'prayer.local' },
  ];

  private listRequestId = 0;
  private detailRequestId = 0;

  ngOnInit(): void {
    this.loadInitialPrayers();
  }

  get selectedStatusLabel(): string {
    return this.translateOptionLabel(this.statusOptions, this.selectedStatus, 'prayer.statusFilter');
  }

  get selectedVisibilityLabel(): string {
    return this.translateOptionLabel(this.visibilityOptions, this.selectedVisibility, 'prayer.visibilityFilter');
  }

  get selectedScopeLabel(): string {
    return this.translateOptionLabel(this.scopeOptions, this.selectedScope, 'prayer.scopeFilter');
  }

  get hasActiveFilters(): boolean {
    return this.selectedStatus !== 'all' || this.selectedVisibility !== 'all' || this.selectedScope !== 'all';
  }

  loadInitialPrayers(refreshComplete?: () => void): void {
    this.loadPrayerList({ complete: refreshComplete });
  }

  loadPrayerList(options?: { preserveExisting?: boolean; complete?: () => void }): void {
    const preserveExisting = !!options?.preserveExisting && this.prayers.length > 0;
    const requestId = ++this.listRequestId;
    this.loading = !preserveExisting;
    this.refreshing = preserveExisting;
    this.errorMessage = '';
    this.loadMoreErrorMessage = '';
    this.loadingMore = false;
    if (!preserveExisting) {
      this.prayers = [];
      this.nextPageUrl = null;
    }

    this.prayerService.getMyPrayerRequests(this.buildFilters()).subscribe({
      next: (response) => {
        if (requestId !== this.listRequestId) {
          options?.complete?.();
          return;
        }

        this.prayers = this.mergeUniquePrayers([], response.results);
        this.nextPageUrl = response.next;
        this.loading = false;
        this.refreshing = false;
        options?.complete?.();
      },
      error: () => {
        if (requestId !== this.listRequestId) {
          options?.complete?.();
          return;
        }

        this.loading = false;
        this.refreshing = false;
        if (preserveExisting) {
          this.loadMoreErrorMessage = this.localeService.translate('prayer.myRequestsRefreshError');
        } else {
          this.errorMessage = this.localeService.translate('prayer.myRequestsLoadError');
        }
        options?.complete?.();
      },
    });
  }

  onStatusChange(value: string | null): void {
    const nextValue = this.isPrayerStatusFilter(value) ? value : 'all';
    if (nextValue === this.selectedStatus) {
      return;
    }

    this.selectedStatus = nextValue;
    this.loadInitialPrayers();
  }

  onVisibilityChange(value: string | null): void {
    const nextValue = this.isPrayerVisibilityFilter(value) ? value : 'all';
    if (nextValue === this.selectedVisibility) {
      return;
    }

    this.selectedVisibility = nextValue;
    this.loadInitialPrayers();
  }

  onScopeChange(value: string | null): void {
    const nextValue = this.isPrayerScopeFilter(value) ? value : 'all';
    if (nextValue === this.selectedScope) {
      return;
    }

    this.selectedScope = nextValue;
    this.loadInitialPrayers();
  }

  resetFilters(): void {
    if (!this.hasActiveFilters) {
      return;
    }

    this.selectedStatus = 'all';
    this.selectedVisibility = 'all';
    this.selectedScope = 'all';
    this.loadInitialPrayers();
  }

  refresh(event: CustomEvent<{ complete: () => void }>): void {
    if (this.refreshing) {
      event.detail.complete();
      return;
    }

    this.loadPrayerList({ preserveExisting: true, complete: () => event.detail.complete() });
  }

  loadMore(): void {
    if (!this.nextPageUrl || this.loading || this.loadingMore) {
      return;
    }

    const requestId = this.listRequestId;
    this.loadingMore = true;
    this.loadMoreErrorMessage = '';

    this.prayerService.getMyPrayerRequests(undefined, this.nextPageUrl).subscribe({
      next: (response) => {
        if (requestId !== this.listRequestId) {
          return;
        }

        this.prayers = this.mergeUniquePrayers(this.prayers, response.results);
        this.nextPageUrl = response.next;
        this.loadingMore = false;
      },
      error: () => {
        if (requestId !== this.listRequestId) {
          return;
        }

        this.loadingMore = false;
        this.loadMoreErrorMessage = this.localeService.translate('prayer.myRequestsLoadMoreError');
      },
    });
  }

  retryLoad(): void {
    this.loadInitialPrayers();
  }

  goToSubmit(): void {
    void this.router.navigateByUrl('/prayer/submit');
  }

  openPrayerDetails(prayer: MemberPrayerRequest): void {
    if (this.detailLoading && this.selectedPrayerDetailId === prayer.id) {
      return;
    }

    this.isDetailOpen = true;
    this.selectedPrayerDetailId = prayer.id;
    this.selectedPrayerDetail = prayer;
    this.loadPrayerDetail(prayer.id);
  }

  closePrayerDetail(): void {
    this.isDetailOpen = false;
    this.detailLoading = false;
    this.detailErrorMessage = '';
    this.selectedPrayerDetailId = null;
    this.selectedPrayerDetail = null;
  }

  retryDetailLoad(): void {
    if (this.selectedPrayerDetailId) {
      this.loadPrayerDetail(this.selectedPrayerDetailId);
    }
  }

  formatCategoryLabel(category: MemberPrayerRequest['category']): string {
    switch (category) {
      case 'personal':
        return this.localeService.translate('prayer.personal');
      case 'family':
        return this.localeService.translate('prayer.family');
      case 'health':
        return this.localeService.translate('prayer.health');
      case 'spiritual':
        return this.localeService.translate('prayer.spiritual');
      case 'work':
        return this.localeService.translate('prayer.work');
      case 'thanksgiving':
        return this.localeService.translate('prayer.thanksgiving');
      default:
        return this.localeService.translate('prayer.other');
    }
  }

  formatStatusLabel(status: PrayerStatus): string {
    switch (status) {
      case 'pending':
        return this.localeService.translate('prayer.pendingReview');
      case 'approved':
        return this.localeService.translate('prayer.approved');
      case 'rejected':
        return this.localeService.translate('prayer.notApproved');
      case 'resolved':
        return this.localeService.translate('prayer.resolved');
      case 'unknown':
        return this.localeService.translate('prayer.statusUnavailable');
      default:
        return this.localeService.translate('prayer.statusUnavailable');
    }
  }

  statusClass(status: PrayerStatus): string {
    return ['pending', 'approved', 'rejected', 'resolved'].includes(status) ? `status-chip--${status}` : 'status-chip--unknown';
  }

  formatVisibilityLabel(visibility: PrayerVisibility): string {
    if (visibility === 'public') {
      return this.localeService.translate('prayer.visibilityPublic');
    }

    if (visibility === 'private') {
      return this.localeService.translate('prayer.visibilityPrivate');
    }

    return this.localeService.translate('prayer.visibilityUnavailable');
  }

  formatVisibilityHelper(visibility: PrayerVisibility): string {
    if (visibility === 'public') {
      return this.localeService.translate('prayer.publicVisibilityHelper');
    }

    if (visibility === 'private') {
      return this.localeService.translate('prayer.privateVisibilityHelper');
    }

    return this.localeService.translate('prayer.visibilityUnavailable');
  }

  formatScopeContext(prayer: Pick<MemberPrayerRequest, 'scope' | 'church'>): string {
    switch (prayer.scope) {
      case 'global':
        return this.localeService.translate('prayer.copItaly');
      case 'area':
        return prayer.church?.name
          ? `${prayer.church.name} ${this.localeService.translate('prayer.area')}`
          : this.localeService.translate('prayer.area');
      case 'district': {
        const parts = prayer.church?.name ? [`${prayer.church.name} ${this.localeService.translate('prayer.district')}`] : [];
        if (prayer.church?.area?.name) {
          parts.push(`${prayer.church.area.name} ${this.localeService.translate('prayer.area')}`);
        }
        return parts.join(' - ') || this.localeService.translate('prayer.district');
      }
      case 'local': {
        const parts = prayer.church?.name ? [prayer.church.name] : [];
        if (prayer.church?.district?.name) {
          parts.push(`${prayer.church.district.name} ${this.localeService.translate('prayer.district')}`);
        }
        if (prayer.church?.area?.name) {
          parts.push(`${prayer.church.area.name} ${this.localeService.translate('prayer.area')}`);
        }
        return parts.join(' - ') || this.localeService.translate('prayer.local');
      }
      case 'unknown':
        return this.localeService.translate('prayer.scopeUnavailable');
      default:
        return this.localeService.translate('prayer.copItaly');
    }
  }

  formatDate(value: string | null): string {
    if (!value) {
      return this.localeService.translate('prayer.dateUnavailable');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.localeService.translate('prayer.dateUnavailable');
    }

    return new Intl.DateTimeFormat(this.localeTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  requestPreview(requestText: string, limit = 165): string {
    const normalized = String(requestText ?? '').trim();
    if (!normalized) {
      return this.localeService.translate('prayer.requestUnavailable');
    }

    if (normalized.length <= limit) {
      return normalized;
    }

    return `${normalized.slice(0, limit).replace(/\s+$/, '')}...`;
  }

  private buildFilters(): MyPrayerRequestFilters {
    const filters: MyPrayerRequestFilters = { page: 1 };

    if (this.selectedStatus !== 'all') {
      filters.status = this.selectedStatus;
    }

    if (this.selectedVisibility !== 'all') {
      filters.visibility = this.selectedVisibility;
    }

    if (this.selectedScope !== 'all') {
      filters.scope = this.selectedScope;
    }

    return filters;
  }

  private loadPrayerDetail(id: number): void {
    const requestId = ++this.detailRequestId;
    this.detailLoading = true;
    this.detailErrorMessage = '';

    this.prayerService.getMyPrayerRequest(id).subscribe({
      next: (prayer) => {
        if (requestId !== this.detailRequestId || this.selectedPrayerDetailId !== id) {
          return;
        }

        this.selectedPrayerDetail = prayer;
        this.detailLoading = false;
      },
      error: () => {
        if (requestId !== this.detailRequestId || this.selectedPrayerDetailId !== id) {
          return;
        }

        this.detailLoading = false;
        this.detailErrorMessage = this.localeService.translate('prayer.detailLoadError');
      },
    });
  }

  private isPrayerStatusFilter(value: string | null): value is PrayerStatusFilter {
    return !!value && this.statusOptions.some((option) => option.value === value);
  }

  private isPrayerVisibilityFilter(value: string | null): value is PrayerVisibilityFilter {
    return !!value && this.visibilityOptions.some((option) => option.value === value);
  }

  private isPrayerScopeFilter(value: string | null): value is PrayerScopeFilter {
    return !!value && this.scopeOptions.some((option) => option.value === value);
  }

  trackByPrayerId(_: number, prayer: MemberPrayerRequest): number {
    return prayer.id;
  }

  private mergeUniquePrayers(existing: MemberPrayerRequest[], incoming: MemberPrayerRequest[]): MemberPrayerRequest[] {
    const prayersById = new Map<number, MemberPrayerRequest>();
    for (const prayer of [...existing, ...incoming]) {
      prayersById.set(prayer.id, prayer);
    }

    return Array.from(prayersById.values());
  }

  private get localeTag(): string {
    switch (this.localeService.getCurrentLocale()) {
      case 'it':
        return 'it-IT';
      case 'fr':
        return 'fr-FR';
      default:
        return 'en-GB';
    }
  }

  private translateOptionLabel<T extends string>(
    options: ReadonlyArray<{ value: T; label: string }>,
    value: T,
    fallbackKey: string
  ): string {
    const option = options.find((entry) => entry.value === value);
    return this.localeService.translate(option?.label ?? fallbackKey);
  }
}
