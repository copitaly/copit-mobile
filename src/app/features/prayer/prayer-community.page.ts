import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

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
  imports: [CommonModule, IonicModule, MobileHeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-prayer-community',
  templateUrl: './prayer-community.page.html',
  styleUrls: ['./prayer-community.page.scss'],
})
export class PrayerCommunityPage implements OnInit {
  private readonly prayerService = inject(PrayerService);
  private readonly router = inject(Router);

  prayers: CommunityPrayerRequest[] = [];
  loading = true;
  loadingMore = false;
  errorMessage = '';
  loadMoreErrorMessage = '';
  nextPageUrl: string | null = null;

  selectedCategory: CommunityPrayerCategoryFilter = 'all';
  selectedScope: CommunityPrayerScopeFilter = 'all';

  readonly skeletonItems = [1, 2, 3];
  readonly categoryOptions: ReadonlyArray<{ value: CommunityPrayerCategoryFilter; label: string }> = [
    { value: 'all', label: 'All Categories' },
    { value: 'personal', label: 'Personal' },
    { value: 'family', label: 'Family' },
    { value: 'health', label: 'Health' },
    { value: 'spiritual', label: 'Spiritual' },
    { value: 'work', label: 'Work' },
    { value: 'thanksgiving', label: 'Thanksgiving' },
    { value: 'other', label: 'Other' },
  ];
  readonly scopeOptions: ReadonlyArray<{ value: CommunityPrayerScopeFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'global', label: 'Global' },
    { value: 'area', label: 'Area' },
    { value: 'district', label: 'District' },
    { value: 'local', label: 'Local Church' },
  ];

  ngOnInit(): void {
    this.loadInitialPrayers();
  }

  get hasActiveFilters(): boolean {
    return this.selectedCategory !== 'all' || this.selectedScope !== 'all';
  }

  loadInitialPrayers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.loadMoreErrorMessage = '';
    this.prayers = [];
    this.nextPageUrl = null;

    this.prayerService.getCommunityPrayers(this.buildFilters()).subscribe({
      next: (response) => {
        this.prayers = response.results;
        this.nextPageUrl = response.next;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = "We couldn't load community prayers right now.";
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

  loadMore(): void {
    if (!this.nextPageUrl || this.loading || this.loadingMore) {
      return;
    }

    this.loadingMore = true;
    this.loadMoreErrorMessage = '';

    this.prayerService.getCommunityPrayers(undefined, this.nextPageUrl).subscribe({
      next: (response) => {
        this.prayers = [...this.prayers, ...response.results];
        this.nextPageUrl = response.next;
        this.loadingMore = false;
      },
      error: () => {
        this.loadingMore = false;
        this.loadMoreErrorMessage = "We couldn't load more community prayers right now. Please try again.";
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
    return this.categoryOptions.find((option) => option.value === category)?.label ?? 'Other';
  }

  formatScopeContext(prayer: CommunityPrayerRequest): string {
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

  formatDate(value: string): string {
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
}
