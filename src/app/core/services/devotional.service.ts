import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { LocaleService } from '../localization/locale.service';
import { DevotionalListFilters, DevotionalPublicDetail, DevotionalPublicListItem } from '../models/devotional.model';
import { PaginatedResponse } from '../models/pagination.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DevotionalService {
  private readonly api = inject(ApiService);
  private readonly locale = inject(LocaleService);
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
    const localDate = this.getLocalDateKey(new Date());
    this.logTodaySelection('resolve:start', { localDate });

    return this.api
      .get<DevotionalPublicDetail>(`${this.publicDevotionalsEndpoint}today/`)
      .pipe(
        map((response) => this.normalizeDetailResponse(response)),
        switchMap((response) => {
          const mismatchReason = this.getTodaySelectionMismatchReason(response, localDate);
          if (!mismatchReason) {
            this.logTodaySelection('resolve:today-endpoint', {
              localDate,
              selectedId: response.id,
              publicationDate: response.publication_date,
            });
            return of(response);
          }

          this.logTodaySelection('resolve:fallback', {
            localDate,
            publicationDate: response.publication_date,
            reason: mismatchReason,
          });

          return this.resolveTodayDevotionalFromList(localDate, mismatchReason);
        }),
        catchError((error: unknown) => {
          this.logTodaySelection('resolve:today-endpoint-error', {
            localDate,
            reason: this.describeError(error),
          });
          return this.resolveTodayDevotionalFromList(localDate, 'today-endpoint-error').pipe(
            catchError(() => throwError(() => error))
          );
        }),
        switchMap((response) =>
          response
            ? of(response)
            : throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }))
        )
      );
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
    const fallbackTitle = this.locale.translate('devotions.itemLabel');
    const normalizedBase = this.normalizeListItem(response) ?? {
      id: 0,
      title: fallbackTitle,
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

    const fallbackTitle = this.locale.translate('devotions.itemLabel');

    return {
      id,
      title: this.normalizeOptionalText(item?.title) ?? fallbackTitle,
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

  private resolveTodayDevotionalFromList(
    localDate: string,
    reason: string
  ): Observable<DevotionalPublicDetail | null> {
    return this.getDevotionals({ page: 1 }).pipe(
      map((response) => this.selectTodayDevotionalCandidate(response.results, localDate)),
      switchMap((candidate) => {
        if (!candidate?.slug) {
          this.logTodaySelection('resolve:no-match', { localDate, reason });
          return of(null);
        }

        this.logTodaySelection('resolve:list-match', {
          localDate,
          selectedId: candidate.id,
          publicationDate: candidate.publication_date,
          reason,
        });

        return this.getDevotionalBySlug(candidate.slug).pipe(
          map((detail) => {
            this.logTodaySelection('resolve:detail-match', {
              localDate,
              selectedId: detail.id,
              publicationDate: detail.publication_date,
            });
            return detail;
          })
        );
      })
    );
  }

  private selectTodayDevotionalCandidate(
    devotionals: DevotionalPublicListItem[],
    localDate: string
  ): DevotionalPublicListItem | null {
    return devotionals.find((devotional) => devotional.publication_date === localDate) ?? null;
  }

  private getTodaySelectionMismatchReason(
    devotional: DevotionalPublicDetail | null | undefined,
    localDate: string
  ): string | null {
    if (!devotional) {
      return 'empty-response';
    }

    if (!this.isRenderableDevotional(devotional)) {
      return 'missing-renderable-content';
    }

    if (devotional.publication_date !== localDate) {
      return 'publication-date-mismatch';
    }

    return null;
  }

  private isRenderableDevotional(devotional: DevotionalPublicDetail | null | undefined): boolean {
    if (!devotional) {
      return false;
    }

    return !!(
      this.normalizeOptionalText(devotional.title) ||
      this.normalizeOptionalText(devotional.content) ||
      this.normalizeOptionalText(devotional.scripture_reference)
    );
  }

  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return `http-${error.status || 0}`;
    }

    const name = typeof error === 'object' && error && 'name' in error ? String((error as { name?: unknown }).name) : '';
    return name || 'unknown-error';
  }

  private logTodaySelection(message: string, details: Record<string, unknown>): void {
    if (environment.production) {
      return;
    }

    console.info('[DevotionalService]', message, details);
  }
}
