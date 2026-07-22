import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import {
  CommunityPrayerRequest,
  PrayerHierarchyDependency,
  PrayerRequestSubmissionPayload,
  PrayerRequestSubmissionResponse,
  PrayerCategory,
  PrayerScope,
} from '../models/prayer.model';
import { AuthService } from './auth.service';
import { SentryTelemetryService } from './sentry-telemetry.service';
import { environment } from '../../../environments/environment';
import { ApiService, QueryParams } from './api.service';
import { PaginatedResponse } from '../models/pagination.model';

export interface CommunityPrayerFilters extends QueryParams {
  category?: PrayerCategory;
  scope?: PrayerScope;
  page?: number;
}

@Injectable({ providedIn: 'root' })
export class PrayerService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly sentryTelemetry = inject(SentryTelemetryService);

  private readonly submitEndpoint = 'public/prayer-requests/submit/';
  private readonly communityEndpoint = 'public/prayer-requests/';

  readonly hierarchyDependency: PrayerHierarchyDependency = {
    available: false,
    reason:
      'Area, district, and local prayer scopes need a public church hierarchy endpoint that is not available in the current backend.',
  };

  submitPrayerRequest(
    payload: PrayerRequestSubmissionPayload
  ): Observable<PrayerRequestSubmissionResponse> {
    this.sentryTelemetry.addFeatureBreadcrumb('app', 'Prayer request submission started', {
      scope: payload.scope,
      category: payload.category,
      visibility: payload.visibility,
      anonymous: payload.is_anonymous_publicly,
      has_church_id: payload.church_id ?? null,
    });

    return this.withOptionalAuth((token) =>
      this.http.post<PrayerRequestSubmissionResponse>(this.buildUrl(this.submitEndpoint), payload, {
        headers: token ? this.buildAuthHeaders(token) : undefined,
      })
    ).pipe(
      tap((response) => {
        this.sentryTelemetry.addFeatureBreadcrumb('app', 'Prayer request submission succeeded', {
          prayer_request_id: response.id,
          status: response.status,
        });
      }),
      catchError((error) => {
        this.sentryTelemetry.captureFeatureError('app', 'Prayer request submission failed', error, {
          status: this.getHttpStatus(error),
        });
        return throwError(() => error);
      })
    );
  }

  getCommunityPrayers(
    filters?: CommunityPrayerFilters,
    pathOrUrl: string = this.communityEndpoint
  ): Observable<PaginatedResponse<CommunityPrayerRequest>> {
    const params = pathOrUrl === this.communityEndpoint ? this.buildCommunityFilters(filters) : undefined;

    this.sentryTelemetry.addFeatureBreadcrumb('app', 'Community prayers load started', {
      category: filters?.category ?? null,
      scope: filters?.scope ?? null,
      path: pathOrUrl === this.communityEndpoint ? this.communityEndpoint : 'paginated-next',
    });

    return this.api.get<PaginatedResponse<CommunityPrayerRequest>>(pathOrUrl, params).pipe(
      map((response) => ({
        ...response,
        results: response.results.map((prayer) => ({
          ...prayer,
          church: prayer.church ?? null,
          title: prayer.title ?? '',
          display_name: prayer.display_name ?? 'Anonymous',
        })),
      })),
      tap((response) => {
        this.sentryTelemetry.addFeatureBreadcrumb('app', 'Community prayers load succeeded', {
          count: response.results.length,
          has_next_page: !!response.next,
        });
      }),
      catchError((error) => {
        this.sentryTelemetry.captureFeatureError('app', 'Community prayers load failed', error, {
          status: this.getHttpStatus(error),
        });
        return throwError(() => error);
      })
    );
  }

  private buildUrl(path: string): string {
    const baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/*/, '').replace(/\/+$/, '');
    return `${baseUrl}/${normalizedPath}/`;
  }

  private buildAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private buildCommunityFilters(filters?: CommunityPrayerFilters): CommunityPrayerFilters {
    return {
      page: 1,
      ...filters,
    };
  }

  private withOptionalAuth<T>(requestFactory: (token: string | null) => Observable<T>): Observable<T> {
    const token = this.authService.accessTokenSnapshot;
    if (!token) {
      return requestFactory(null);
    }

    return requestFactory(token).pipe(
      catchError((error) => {
        if (!this.isUnauthenticated(error)) {
          return throwError(() => error);
        }

        return this.authService.getCurrentUser().pipe(
          switchMap(() => requestFactory(this.authService.accessTokenSnapshot))
        );
      })
    );
  }

  private isUnauthenticated(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
  }

  private getHttpStatus(error: unknown): number | null {
    return error instanceof HttpErrorResponse ? error.status : null;
  }
}
