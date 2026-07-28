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

        this.devotionals = response.results;
        this.nextPageUrl = response.next;
        this.loading = false;
        this.refreshing = false;
        options?.onComplete?.();
      },
      error: () => {
        if (requestId !== this.listRequestId) {
          options?.onComplete?.();
          return;
        }

        this.loading = false;
        this.refreshing = false;
        if (preserveList && this.devotionals.length > 0) {
          this.loadMoreErrorMessage = "We couldn't refresh devotionals right now. Please try again.";
        } else {
          this.errorMessage = "We couldn't load devotionals right now.";
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
      error: () => {
        if (requestId !== this.listRequestId) {
          return;
        }

        this.loadingMore = false;
        this.loadMoreErrorMessage = "We couldn't load more devotionals right now. Please try again.";
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
    if (!detailRoute) {
      return;
    }

    await this.router.navigateByUrl(detailRoute);
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

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
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
