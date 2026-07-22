import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

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
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-prayer-my-requests',
  templateUrl: './prayer-my-requests.page.html',
  styleUrls: ['./prayer-my-requests.page.scss'],
})
export class PrayerMyRequestsPage implements OnInit {
  private readonly prayerService = inject(PrayerService);
  private readonly router = inject(Router);

  prayers: MemberPrayerRequest[] = [];
  loading = true;
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
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Not Approved' },
    { value: 'resolved', label: 'Resolved' },
  ];
  readonly visibilityOptions: ReadonlyArray<{ value: PrayerVisibilityFilter; label: string }> = [
    { value: 'all', label: 'All Visibility' },
    { value: 'private', label: 'Private' },
    { value: 'public', label: 'Public' },
  ];
  readonly scopeOptions: ReadonlyArray<{ value: PrayerScopeFilter; label: string }> = [
    { value: 'all', label: 'All Scopes' },
    { value: 'global', label: 'Global' },
    { value: 'area', label: 'Area' },
    { value: 'district', label: 'District' },
    { value: 'local', label: 'Local Church' },
  ];

  private listRequestId = 0;
  private detailRequestId = 0;

  ngOnInit(): void {
    this.loadInitialPrayers();
  }

  get hasActiveFilters(): boolean {
    return this.selectedStatus !== 'all' || this.selectedVisibility !== 'all' || this.selectedScope !== 'all';
  }

  loadInitialPrayers(refreshComplete?: () => void): void {
    const requestId = ++this.listRequestId;
    this.loading = true;
    this.errorMessage = '';
    this.loadMoreErrorMessage = '';
    this.loadingMore = false;
    this.prayers = [];
    this.nextPageUrl = null;

    this.prayerService.getMyPrayerRequests(this.buildFilters()).subscribe({
      next: (response) => {
        if (requestId !== this.listRequestId) {
          refreshComplete?.();
          return;
        }

        this.prayers = response.results;
        this.nextPageUrl = response.next;
        this.loading = false;
        refreshComplete?.();
      },
      error: () => {
        if (requestId !== this.listRequestId) {
          refreshComplete?.();
          return;
        }

        this.loading = false;
        this.errorMessage = "We couldn't load your prayer requests right now.";
        refreshComplete?.();
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
    this.loadInitialPrayers(() => event.detail.complete());
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

        this.prayers = [...this.prayers, ...response.results];
        this.nextPageUrl = response.next;
        this.loadingMore = false;
      },
      error: () => {
        if (requestId !== this.listRequestId) {
          return;
        }

        this.loadingMore = false;
        this.loadMoreErrorMessage = "We couldn't load more prayer requests right now. Please try again.";
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
        return 'Personal';
      case 'family':
        return 'Family';
      case 'health':
        return 'Health';
      case 'spiritual':
        return 'Spiritual';
      case 'work':
        return 'Work';
      case 'thanksgiving':
        return 'Thanksgiving';
      default:
        return 'Other';
    }
  }

  formatStatusLabel(status: PrayerStatus): string {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Not Approved';
      case 'resolved':
        return 'Resolved';
      default:
        return 'Pending Review';
    }
  }

  statusClass(status: PrayerStatus): string {
    return `status-chip--${status}`;
  }

  formatVisibilityLabel(visibility: PrayerVisibility): string {
    return visibility === 'public' ? 'Public' : 'Private';
  }

  formatVisibilityHelper(visibility: PrayerVisibility): string {
    return visibility === 'public'
      ? 'May appear in Community Prayers after approval.'
      : 'Visible only to authorized prayer administrators.';
  }

  formatScopeContext(prayer: Pick<MemberPrayerRequest, 'scope' | 'church'>): string {
    switch (prayer.scope) {
      case 'global':
        return 'COP Italy';
      case 'area':
        return prayer.church?.name ? `${prayer.church.name} Area` : 'Area';
      case 'district': {
        const parts = prayer.church?.name ? [`${prayer.church.name} District`] : [];
        if (prayer.church?.area?.name) {
          parts.push(`${prayer.church.area.name} Area`);
        }
        return parts.join(' - ') || 'District';
      }
      case 'local': {
        const parts = prayer.church?.name ? [prayer.church.name] : [];
        if (prayer.church?.district?.name) {
          parts.push(`${prayer.church.district.name} District`);
        }
        if (prayer.church?.area?.name) {
          parts.push(`${prayer.church.area.name} Area`);
        }
        return parts.join(' - ') || 'Local Church';
      }
      default:
        return 'COP Italy';
    }
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '';
    }

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

  requestPreview(requestText: string, limit = 165): string {
    const normalized = requestText.trim();
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
        this.detailErrorMessage = "We couldn't load this prayer request right now.";
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
}
