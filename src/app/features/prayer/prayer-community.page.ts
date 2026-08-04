import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { LocaleService } from '../../core/localization/locale.service';
import { TranslatePipe } from '../../core/localization/translate.pipe';
import {
  CommunityPrayerRequest,
  PrayerCategory,
  PrayerScope,
} from '../../core/models/prayer.model';
import {
  CommunityPrayerFilters,
  PrayerService,
} from '../../core/services/prayer.service';
import { MobileHeaderComponent } from '../../shared/mobile-header.component';

type CommunityPrayerCategoryFilter = PrayerCategory | 'all';
type CommunityPrayerScopeFilter = PrayerScope | 'all';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, MobileHeaderComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-prayer-community',
  templateUrl: './prayer-community.page.html',
  styleUrls: ['./prayer-community.page.scss'],
})
export class PrayerCommunityPage implements OnInit {
  private readonly prayerService = inject(PrayerService);
  private readonly router = inject(Router);
  private readonly localeService = inject(LocaleService);

  prayers: CommunityPrayerRequest[] = [];
  loading = true;
  refreshing = false;
  loadingMore = false;
  errorMessage = '';
  loadMoreErrorMessage = '';
  nextPageUrl: string | null = null;
  private listRequestId = 0;

  selectedCategory: CommunityPrayerCategoryFilter = 'all';
  selectedScope: CommunityPrayerScopeFilter = 'all';

  readonly skeletonItems = [1, 2, 3];
  readonly categoryOptions: ReadonlyArray<{ value: CommunityPrayerCategoryFilter; label: string }> = [
    { value: 'all', label: 'prayer.allCategories' },
    { value: 'personal', label: 'prayer.personal' },
    { value: 'family', label: 'prayer.family' },
    { value: 'health', label: 'prayer.health' },
    { value: 'spiritual', label: 'prayer.spiritual' },
    { value: 'work', label: 'prayer.work' },
    { value: 'thanksgiving', label: 'prayer.thanksgiving' },
    { value: 'other', label: 'prayer.other' },
  ];
  readonly scopeOptions: ReadonlyArray<{ value: CommunityPrayerScopeFilter; label: string }> = [
    { value: 'all', label: 'common.viewAll' },
    { value: 'global', label: 'prayer.global' },
    { value: 'area', label: 'prayer.area' },
    { value: 'district', label: 'prayer.district' },
    { value: 'local', label: 'prayer.local' },
  ];

  ngOnInit(): void {
    this.loadInitialPrayers();
  }

  get hasActiveFilters(): boolean {
    return this.selectedCategory !== 'all' || this.selectedScope !== 'all';
  }

  get selectedCategoryLabel(): string {
    return this.translateOptionLabel(this.categoryOptions, this.selectedCategory, 'prayer.allCategories');
  }

  get selectedScopeLabel(): string {
    return this.translateOptionLabel(this.scopeOptions, this.selectedScope, 'common.viewAll');
  }

  loadInitialPrayers(options?: { preserveExisting?: boolean; complete?: () => void }): void {
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

    this.prayerService.getCommunityPrayers(this.buildFilters()).subscribe({
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
          this.loadMoreErrorMessage = this.localeService.translate('prayer.communityRefreshError');
        } else {
          this.errorMessage = this.localeService.translate('prayer.communityLoadError');
        }
        options?.complete?.();
      },
    });
  }

  onCategoryChange(value: string | null): void {
    const nextValue = this.isPrayerCategory(value) ? value : 'all';
    if (this.selectedCategory === nextValue) {
      return;
    }

    this.selectedCategory = nextValue;
    this.loadInitialPrayers();
  }

  onScopeChange(value: string | null): void {
    const nextValue = this.isPrayerScope(value) ? value : 'all';
    if (this.selectedScope === nextValue) {
      return;
    }

    this.selectedScope = nextValue;
    this.loadInitialPrayers();
  }

  resetFilters(): void {
    if (!this.hasActiveFilters) {
      return;
    }

    this.selectedCategory = 'all';
    this.selectedScope = 'all';
    this.loadInitialPrayers();
  }

  refresh(event: CustomEvent<{ complete: () => void }>): void {
    if (this.refreshing) {
      event.detail.complete();
      return;
    }

    this.loadInitialPrayers({ preserveExisting: true, complete: () => event.detail.complete() });
  }

  loadMore(): void {
    if (!this.nextPageUrl || this.loading || this.loadingMore) {
      return;
    }

    const requestId = this.listRequestId;
    this.loadingMore = true;
    this.loadMoreErrorMessage = '';

    this.prayerService.getCommunityPrayers(undefined, this.nextPageUrl).subscribe({
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
        this.loadMoreErrorMessage = this.localeService.translate('prayer.communityLoadMoreError');
      },
    });
  }

  retryLoad(): void {
    this.loadInitialPrayers();
  }

  goToSubmit(): void {
    void this.router.navigateByUrl('/prayer/submit');
  }

  formatCategoryLabel(category: PrayerCategory): string {
    return this.translateOptionLabel(this.categoryOptions, category, 'prayer.other');
  }

  formatScopeContext(prayer: CommunityPrayerRequest): string {
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

  formatDate(value: string): string {
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

  formatDateLabel(value: string): string {
    const formatted = this.formatDate(value);
    return formatted === this.localeService.translate('prayer.dateUnavailable')
      ? formatted
      : this.localeService.translate('prayer.submittedOn', { date: formatted });
  }

  requestPreview(requestText: string, limit = 240): string {
    const normalized = String(requestText ?? '').trim();
    if (!normalized) {
      return this.localeService.translate('prayer.requestUnavailable');
    }

    if (normalized.length <= limit) {
      return normalized;
    }

    return `${normalized.slice(0, limit).replace(/\s+$/, '')}...`;
  }

  trackByPrayerId(_: number, prayer: CommunityPrayerRequest): number {
    return prayer.id;
  }

  private buildFilters(): CommunityPrayerFilters {
    const filters: CommunityPrayerFilters = { page: 1 };

    if (this.selectedCategory !== 'all') {
      filters.category = this.selectedCategory;
    }

    if (this.selectedScope !== 'all') {
      filters.scope = this.selectedScope;
    }

    return filters;
  }

  private isPrayerCategory(value: string | null): value is CommunityPrayerCategoryFilter {
    return !!value && this.categoryOptions.some((option) => option.value === value);
  }

  private isPrayerScope(value: string | null): value is CommunityPrayerScopeFilter {
    return !!value && this.scopeOptions.some((option) => option.value === value);
  }

  private mergeUniquePrayers(
    existing: CommunityPrayerRequest[],
    incoming: CommunityPrayerRequest[]
  ): CommunityPrayerRequest[] {
    const prayersById = new Map<number, CommunityPrayerRequest>();
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
