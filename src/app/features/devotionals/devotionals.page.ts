import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { DevotionalPublicListItem } from '../../core/models/devotional.model';
import { DevotionalService } from '../../core/services/devotional.service';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';

@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, FeaturePageShellComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-devotionals',
  templateUrl: './devotionals.page.html',
  styleUrls: ['./devotionals.page.scss'],
})
export class DevotionalsPage implements OnInit {
  private readonly devotionalService = inject(DevotionalService);
  private readonly router = inject(Router);
  private readonly publicationDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  devotionals: DevotionalPublicListItem[] = [];
  loading = true;
  refreshing = false;
  loadingMore = false;
  errorMessage = '';
  loadMoreErrorMessage = '';
  nextPageUrl: string | null = null;

  readonly skeletonItems = [1, 2, 3];
  private readonly brokenCoverIds = new Set<number>();
  private listRequestId = 0;
  private pendingDetailRoute: string | null = null;

  ngOnInit(): void {
    this.loadInitialDevotionals();
  }

  loadInitialDevotionals(options?: { preserveList?: boolean; onComplete?: () => void }): void {
    const requestId = ++this.listRequestId;
    const preserveList = !!options?.preserveList && this.devotionals.length > 0;

    this.loading = !preserveList;
    this.refreshing = preserveList;
    this.errorMessage = '';
    this.loadMoreErrorMessage = '';
    this.loadingMore = false;

    if (!preserveList) {
      this.devotionals = [];
      this.nextPageUrl = null;
      this.brokenCoverIds.clear();
    }

    this.devotionalService.getDevotionals({ page: 1 }).subscribe({
      next: (response) => {
        if (requestId !== this.listRequestId) {
          options?.onComplete?.();
          return;
        }

        this.devotionals = this.mergeUniqueDevotionals([], response.results);
        this.nextPageUrl = response.next;
        this.loading = false;
        this.refreshing = false;
        options?.onComplete?.();
      },
      error: (error: unknown) => {
        if (requestId !== this.listRequestId) {
          options?.onComplete?.();
          return;
        }

        this.loading = false;
        this.refreshing = false;
        if (preserveList && this.devotionals.length > 0) {
          this.loadMoreErrorMessage = this.resolveRefreshErrorMessage(error);
        } else {
          this.errorMessage = this.resolveLoadErrorMessage(error);
        }
        options?.onComplete?.();
      },
    });
  }

  refresh(event: CustomEvent<{ complete: () => void }>): void {
    if (this.loadingMore || this.refreshing) {
      event.detail.complete();
      return;
    }

    this.loadInitialDevotionals({
      preserveList: this.devotionals.length > 0,
      onComplete: () => event.detail.complete(),
    });
  }

  loadMore(): void {
    if (!this.nextPageUrl || this.loading || this.loadingMore || this.refreshing) {
      return;
    }

    const requestId = this.listRequestId;
    this.loadingMore = true;
    this.loadMoreErrorMessage = '';

    this.devotionalService.getDevotionals(undefined, this.nextPageUrl).subscribe({
      next: (response) => {
        if (requestId !== this.listRequestId) {
          return;
        }

        this.devotionals = this.mergeUniqueDevotionals(this.devotionals, response.results);
        this.nextPageUrl = response.next;
        this.loadingMore = false;
      },
      error: (error: unknown) => {
        if (requestId !== this.listRequestId) {
          return;
        }

        this.loadingMore = false;
        this.loadMoreErrorMessage = this.resolveLoadMoreErrorMessage(error);
      },
    });
  }

  retryLoad(): void {
    this.loadInitialDevotionals();
  }

  trackByDevotional(_: number, devotional: DevotionalPublicListItem): number {
    return devotional.id;
  }

  async openDevotional(devotional: DevotionalPublicListItem): Promise<void> {
    const detailRoute = this.getDevotionalDetailRoute(devotional.slug);
    if (!detailRoute || this.pendingDetailRoute === detailRoute) {
      return;
    }

    this.pendingDetailRoute = detailRoute;

    try {
      await this.router.navigateByUrl(detailRoute);
    } finally {
      this.pendingDetailRoute = null;
    }
  }

  getDevotionalDetailRoute(slug: string | null | undefined): string | null {
    const normalizedSlug = slug?.trim() ?? '';
    if (!normalizedSlug) {
      return null;
    }

    return `/devotionals/${encodeURIComponent(normalizedSlug)}`;
  }

  buildCardAriaLabel(devotional: DevotionalPublicListItem): string {
    const parts = [devotional.title];
    if (this.hasScriptureReference(devotional)) {
      parts.push(devotional.scripture_reference.trim());
    }
    if (this.hasAuthor(devotional)) {
      parts.push(`by ${devotional.author_name!.trim()}`);
    }
    parts.push(this.formatPublicationDate(devotional.publication_date));
    return parts.join(', ');
  }

  hasAuthor(devotional: DevotionalPublicListItem): boolean {
    return !!devotional.author_name?.trim();
  }

  hasScriptureReference(devotional: DevotionalPublicListItem): boolean {
    return !!devotional.scripture_reference?.trim();
  }

  formatPublicationDate(value: string | null): string {
    if (!value) {
      return 'Available now';
    }

    const parsed = this.parsePublicationDate(value);
    if (!parsed) {
      return value;
    }

    return this.publicationDateFormatter.format(parsed);
  }

  shouldShowCoverImage(devotional: DevotionalPublicListItem): boolean {
    return !!devotional.cover_image?.trim() && !this.brokenCoverIds.has(devotional.id);
  }

  handleCoverImageError(devotionalId: number): void {
    this.brokenCoverIds.add(devotionalId);
  }

  getCoverImageAlt(devotional: DevotionalPublicListItem): string {
    const title = devotional.title?.trim();
    return title ? `${title} cover image` : 'Devotional cover image';
  }

  private parsePublicationDate(value: string): Date | null {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }

    const [, yearValue, monthValue, dayValue] = match;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const parsed = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  private resolveLoadErrorMessage(error: unknown): string {
    return this.resolveErrorMessage(error, "We couldn't load devotionals right now.");
  }

  private resolveRefreshErrorMessage(error: unknown): string {
    return this.resolveErrorMessage(error, "We couldn't refresh devotionals right now. Please try again.");
  }

  private resolveLoadMoreErrorMessage(error: unknown): string {
    return this.resolveErrorMessage(error, "We couldn't load more devotionals right now. Please try again.");
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    const message = String((error as { message?: string } | undefined)?.message ?? '').toLowerCase();
    if (message.includes('timeout')) {
      return 'Loading devotionals timed out. Please try again.';
    }

    if (message.includes('offline') || message.includes('network')) {
      return 'You appear to be offline. Check your connection and try again.';
    }

    return fallback;
  }

  private mergeUniqueDevotionals(
    existing: DevotionalPublicListItem[],
    incoming: DevotionalPublicListItem[]
  ): DevotionalPublicListItem[] {
    const byId = new Map<number, DevotionalPublicListItem>();

    for (const devotional of existing) {
      byId.set(devotional.id, devotional);
    }

    for (const devotional of incoming) {
      byId.set(devotional.id, devotional);
    }

    return Array.from(byId.values());
  }
}
