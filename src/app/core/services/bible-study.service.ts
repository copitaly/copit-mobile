import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { LocaleService } from '../localization/locale.service';
import { PaginatedResponse } from '../models/pagination.model';
import {
  BibleStudyManualDetail,
  BibleStudyManualListFilters,
  BibleStudyManualListItem,
  BibleStudyPublicationStatus,
} from '../models/bible-study.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BibleStudyService {
  private readonly api = inject(ApiService);
  private readonly locale = inject(LocaleService);
  private readonly publicManualsEndpoint = 'public/bible-study/manuals/';
  private readonly supportedStatuses = new Set<BibleStudyPublicationStatus>(['draft', 'published', 'archived']);

  getPublishedManuals(
    filters: BibleStudyManualListFilters = {},
    pathOrUrl: string = this.publicManualsEndpoint
  ): Observable<PaginatedResponse<BibleStudyManualListItem>> {
    const params =
      pathOrUrl === this.publicManualsEndpoint
        ? {
            ...(filters.year ? { year: filters.year } : {}),
            ...(filters.language?.trim() ? { language: filters.language.trim() } : {}),
          }
        : undefined;

    return this.api.get<PaginatedResponse<BibleStudyManualListItem>>(pathOrUrl, params).pipe(
      map((response) => ({
        ...response,
        results: this.normalizeManualListResults(response.results),
      }))
    );
  }

  getPublishedManualDetail(id: number): Observable<BibleStudyManualDetail> {
    return this.api
      .get<BibleStudyManualDetail>(`${this.publicManualsEndpoint}${id}/`)
      .pipe(map((manual) => this.normalizeManualDetail(manual)));
  }

  normalizeDocumentUrl(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return null;
    }

    const protocol = parsedUrl.protocol.toLowerCase();
    if (protocol === 'https:') {
      return parsedUrl.toString();
    }

    const isLocalHttp =
      protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsedUrl.hostname.toLowerCase());

    return isLocalHttp ? parsedUrl.toString() : null;
  }

  private normalizeManualListResults(results: BibleStudyManualListItem[] | null | undefined): BibleStudyManualListItem[] {
    return (results ?? [])
      .map((manual) => this.normalizeManualListItem(manual))
      .filter((manual): manual is BibleStudyManualListItem => manual !== null);
  }

  private normalizeManualListItem(manual: BibleStudyManualListItem | null | undefined): BibleStudyManualListItem | null {
    const id = Number(manual?.id);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }

    return {
      id,
      title: this.normalizeTitle(manual?.title),
      year: this.normalizeYear(manual?.year),
      language: this.normalizeText(manual?.language, 'manual'),
      language_display: this.normalizeText(manual?.language_display, 'Manual'),
      volume: this.normalizeText(manual?.volume),
      start_week: this.normalizeWeek(manual?.start_week),
      end_week: this.normalizeWeek(manual?.end_week),
      cover_image_url: this.normalizeOptionalUrl(manual?.cover_image_url),
      pdf_url: this.normalizeDocumentUrl(manual?.pdf_url),
    };
  }

  private normalizeManualDetail(manual: BibleStudyManualDetail | null | undefined): BibleStudyManualDetail {
    return {
      id: Number(manual?.id) > 0 ? Number(manual?.id) : 0,
      title: this.normalizeTitle(manual?.title),
      year: this.normalizeYear(manual?.year),
      language: this.normalizeText(manual?.language, 'manual'),
      language_display: this.normalizeText(manual?.language_display, 'Manual'),
      volume: this.normalizeText(manual?.volume),
      start_week: this.normalizeWeek(manual?.start_week),
      end_week: this.normalizeWeek(manual?.end_week),
      publication_status: this.supportedStatuses.has(manual?.publication_status as BibleStudyPublicationStatus)
        ? (manual?.publication_status as BibleStudyPublicationStatus)
        : 'unknown',
      published_at: this.normalizeDateString(manual?.published_at),
      cover_image_url: this.normalizeOptionalUrl(manual?.cover_image_url),
      pdf_url: this.normalizeDocumentUrl(manual?.pdf_url),
    };
  }

  private normalizeTitle(value: unknown): string {
    const fallback = this.locale.translate('bibleStudy.manualLabel');
    const normalized = this.normalizeText(value, fallback);
    return normalized || fallback;
  }

  private normalizeText(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private normalizeOptionalUrl(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private normalizeYear(value: unknown): number {
    const year = Number(value);
    return Number.isInteger(year) && year > 0 ? year : 0;
  }

  private normalizeWeek(value: unknown): number | null {
    const week = Number(value);
    return Number.isInteger(week) && week > 0 ? week : null;
  }

  private normalizeDateString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
