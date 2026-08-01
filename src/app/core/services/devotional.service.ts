import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { DevotionalListFilters, DevotionalPublicDetail, DevotionalPublicListItem } from '../models/devotional.model';
import { PaginatedResponse } from '../models/pagination.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DevotionalService {
  private readonly api = inject(ApiService);
  private readonly publicDevotionalsEndpoint = 'public/devotionals/';

  getDevotionals(
    filters: DevotionalListFilters = {},
    pathOrUrl: string = this.publicDevotionalsEndpoint
  ): Observable<PaginatedResponse<DevotionalPublicListItem>> {
    const params = pathOrUrl === this.publicDevotionalsEndpoint
      ? {
          ...(filters.page ? { page: filters.page } : {}),
        }
      : undefined;

    return this.api
      .get<PaginatedResponse<DevotionalPublicListItem>>(pathOrUrl, params)
      .pipe(map((response) => this.normalizeListResponse(response)));
  }

  getDevotionalBySlug(slug: string): Observable<DevotionalPublicDetail> {
    const normalizedSlug = slug.trim();
    return this.api
      .get<DevotionalPublicDetail>(`${this.publicDevotionalsEndpoint}${encodeURIComponent(normalizedSlug)}`)
      .pipe(map((response) => this.normalizeDetailResponse(response)));
  }

  getTodayDevotional(): Observable<DevotionalPublicDetail> {
    return this.api
      .get<DevotionalPublicDetail>(`${this.publicDevotionalsEndpoint}today/`)
      .pipe(map((response) => this.normalizeDetailResponse(response)));
  }

  normalizeImageUrl(value: string | null | undefined): string | null {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return null;
    }

    try {
      const parsed = new URL(normalized);
      if (parsed.protocol === 'https:') {
        return parsed.toString();
      }

      if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        return parsed.toString();
      }
    } catch {
      return null;
    }

    return null;
  }

  private normalizeListResponse(
    response: PaginatedResponse<DevotionalPublicListItem> | null | undefined
  ): PaginatedResponse<DevotionalPublicListItem> {
    const rawResults = Array.isArray(response?.results) ? response.results : [];
    const results = rawResults
      .map((item) => this.normalizeListItem(item))
      .filter((item): item is DevotionalPublicListItem => item !== null);

    return {
      count: typeof response?.count === 'number' && Number.isFinite(response.count) ? response.count : results.length,
      next: this.normalizeOptionalText(response?.next),
      previous: this.normalizeOptionalText(response?.previous),
      results,
    };
  }

  private normalizeDetailResponse(
    response: DevotionalPublicDetail | null | undefined
  ): DevotionalPublicDetail {
    const normalizedBase = this.normalizeListItem(response) ?? {
      id: 0,
      title: 'Devotion',
      slug: '',
      scripture_reference: '',
      author_name: null,
      cover_image: null,
      publication_date: null,
    };

    return {
      ...normalizedBase,
      scripture_text: this.normalizeOptionalText(response?.scripture_text),
      content: this.normalizeOptionalText(response?.content) ?? '',
      reflection_question: this.normalizeOptionalText(response?.reflection_question),
      prayer: this.normalizeOptionalText(response?.prayer),
    };
  }

  private normalizeListItem(item: DevotionalPublicListItem | DevotionalPublicDetail | null | undefined): DevotionalPublicListItem | null {
    const id = this.normalizeId(item?.id);
    if (id === null) {
      return null;
    }

    return {
      id,
      title: this.normalizeOptionalText(item?.title) ?? 'Devotion',
      slug: this.normalizeOptionalText(item?.slug) ?? '',
      scripture_reference: this.normalizeOptionalText(item?.scripture_reference) ?? '',
      author_name: this.normalizeOptionalText(item?.author_name),
      cover_image: this.normalizeImageUrl(item?.cover_image),
      publication_date: this.normalizePublicationDate(item?.publication_date),
    };
  }

  private normalizeId(value: number | null | undefined): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
  }

  private normalizePublicationDate(value: string | null | undefined): string | null {
    const normalized = this.normalizeOptionalText(value);
    return normalized || null;
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized || null;
  }
}
