import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { DevotionalPublicDetail } from '../../core/models/devotional.model';
import { DevotionalService } from '../../core/services/devotional.service';
import { FeaturePageShellComponent } from '../../shared/feature-page-shell.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule, FeaturePageShellComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-devotional-detail',
  templateUrl: './devotional-detail.page.html',
  styleUrls: ['./devotional-detail.page.scss'],
})
export class DevotionalDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly devotionalService = inject(DevotionalService);
  private readonly publicationDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  devotional: DevotionalPublicDetail | null = null;
  loading = true;
  notFound = false;
  errorMessage = '';

  readonly skeletonItems = [1, 2, 3, 4];
  private coverImageFailed = false;
  private requestInFlight = false;
  private lastRequestedSlug: string | null = null;

  ngOnInit(): void {
    this.loadDevotional();
  }

  loadDevotional(): void {
    const slug = this.getValidatedSlug();
    if (!slug || this.requestInFlight) {
      if (!slug) {
        this.loading = false;
        this.devotional = null;
        this.notFound = false;
        this.errorMessage = 'Invalid devotional link.';
      }
      return;
    }

    this.requestInFlight = true;
    this.lastRequestedSlug = slug;
    this.loading = true;
    this.notFound = false;
    this.errorMessage = '';
    this.devotional = null;
    this.coverImageFailed = false;

    this.devotionalService.getDevotionalBySlug(slug).subscribe({
      next: (devotional) => {
        if (this.lastRequestedSlug !== slug) {
          return;
        }

        this.devotional = devotional;
        this.loading = false;
        this.requestInFlight = false;
      },
      error: (error: unknown) => {
        if (this.lastRequestedSlug !== slug) {
          return;
        }

        this.loading = false;
        this.requestInFlight = false;
        this.devotional = null;
        this.notFound = error instanceof HttpErrorResponse && error.status === 404;
        this.errorMessage = this.notFound
          ? ''
          : "We couldn't load this devotional right now.";
      },
    });
  }

  retryLoad(): void {
    this.loadDevotional();
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

  hasText(value: string | null | undefined): boolean {
    return !!value?.trim();
  }

  shouldShowCoverImage(): boolean {
    return !!this.devotional?.cover_image?.trim() && !this.coverImageFailed;
  }

  handleCoverImageError(): void {
    this.coverImageFailed = true;
  }

  getCoverImageAlt(): string {
    const title = this.devotional?.title?.trim();
    return title ? `${title} cover image` : 'Devotional cover preview';
  }

  getParagraphs(value: string | null | undefined): string[] {
    const normalized = value?.replace(/\r\n/g, '\n').trim() ?? '';
    if (!normalized) {
      return [];
    }

    return normalized
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);
  }

  private getValidatedSlug(): string | null {
    const rawSlug = this.route.snapshot.paramMap.get('slug');
    const normalizedSlug = rawSlug?.trim() ?? '';
    return normalizedSlug || null;
  }
}
