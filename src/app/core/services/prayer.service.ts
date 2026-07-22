import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import {
  CommunityPrayerRequest,
  MemberPrayerRequest,
  PublicChurchHierarchy,
  PrayerHierarchyDependency,
  PrayerRequestSubmissionPayload,
  PrayerRequestSubmissionResponse,
  PrayerCategory,
  PrayerScope,
  PrayerStatus,
  PrayerVisibility,
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

export interface MyPrayerRequestFilters extends QueryParams {
  category?: PrayerCategory;
  scope?: PrayerScope;
  status?: PrayerStatus;
  visibility?: PrayerVisibility;
  page?: number;
}

export interface PublicChurchHierarchyFilters extends QueryParams {
  level: PrayerScope;
  parent?: number;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class PrayerService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly sentryTelemetry = inject(SentryTelemetryService);

  private readonly submitEndpoint = 'public/prayer-requests/submit/';
  private readonly communityEndpoint = 'public/prayer-requests/';
  private readonly publicChurchesEndpoint = 'public/churches/';
  private readonly myPrayerRequestsEndpoint = 'members/me/prayer-requests/';
  private readonly hierarchyPageSize = 100;

  readonly hierarchyDependency: PrayerHierarchyDependency = {
    available: true,
    reason: '',
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

  getPublicChurches(
    level: Exclude<PrayerScope, 'global'>,
    parentId?: number
  ): Observable<PublicChurchHierarchy[]> {
    const params: PublicChurchHierarchyFilters = {
      level,
      page: 1,
      page_size: this.hierarchyPageSize,
      ...(parentId ? { parent: parentId } : {}),
    };

    return this.api.get<PaginatedResponse<PublicChurchHierarchy>>(this.publicChurchesEndpoint, params).pipe(
      map((response) => response.results.map((church) => this.normalizePublicChurch(church)))
    );
  }

  getMyPrayerRequests(
    filters?: MyPrayerRequestFilters,
    pathOrUrl: string = this.myPrayerRequestsEndpoint
  ): Observable<PaginatedResponse<MemberPrayerRequest>> {
    const params =
      pathOrUrl === this.myPrayerRequestsEndpoint
        ? this.toHttpQueryParams(this.buildMyPrayerFilters(filters))
        : undefined;

    this.sentryTelemetry.addFeatureBreadcrumb('app', 'Member prayer requests load started', {
      scope: filters?.scope ?? null,
      status: filters?.status ?? null,
      visibility: filters?.visibility ?? null,
      path: pathOrUrl === this.myPrayerRequestsEndpoint ? this.myPrayerRequestsEndpoint : 'paginated-next',
    });

    return this.withAuth((token) =>
      this.http.get<PaginatedResponse<MemberPrayerRequest>>(this.buildUrl(pathOrUrl), {
        headers: this.buildAuthHeaders(token),
        params,
      })
    ).pipe(
      map((response) => ({
        ...response,
        results: response.results.map((prayer) => this.normalizeMemberPrayerRequest(prayer)),
      })),
      tap((response) => {
        this.sentryTelemetry.addFeatureBreadcrumb('app', 'Member prayer requests load succeeded', {
          count: response.results.length,
          has_next_page: !!response.next,
        });
      }),
      catchError((error) => {
        this.sentryTelemetry.captureFeatureError('app', 'Member prayer requests load failed', error, {
          status: this.getHttpStatus(error),
        });
        return throwError(() => error);
      })
    );
  }

  getMyPrayerRequest(id: number): Observable<MemberPrayerRequest> {
    const path = `${this.myPrayerRequestsEndpoint}${id}/`;

    this.sentryTelemetry.addFeatureBreadcrumb('app', 'Member prayer request detail load started', {
      prayer_request_id: id,
    });

    return this.withAuth((token) =>
      this.http.get<MemberPrayerRequest>(this.buildUrl(path), {
        headers: this.buildAuthHeaders(token),
      })
    ).pipe(
      map((response) => this.normalizeMemberPrayerRequest(response)),
      tap((response) => {
        this.sentryTelemetry.addFeatureBreadcrumb('app', 'Member prayer request detail load succeeded', {
          prayer_request_id: response.id,
        });
      }),
      catchError((error) => {
        this.sentryTelemetry.captureFeatureError('app', 'Member prayer request detail load failed', error, {
          prayer_request_id: id,
          status: this.getHttpStatus(error),
        });
        return throwError(() => error);
      })
    );
  }

  private buildUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

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

  private buildMyPrayerFilters(filters?: MyPrayerRequestFilters): MyPrayerRequestFilters {
    return {
      page: 1,
      ...filters,
    };
  }

  private toHttpQueryParams(params?: QueryParams): Record<string, string | number | boolean> | undefined {
    if (!params) {
      return undefined;
    }

    const normalized: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        continue;
      }
      normalized[key] = value;
    }

    return normalized;
  }

  private normalizePublicChurch(church: PublicChurchHierarchy): PublicChurchHierarchy {
    return {
      ...church,
      parent: church.parent ?? null,
      district: church.district ?? null,
      area: church.area ?? null,
    };
  }

  private normalizeMemberPrayerRequest(prayer: MemberPrayerRequest): MemberPrayerRequest {
    return {
      ...prayer,
      church: prayer.church ?? null,
      title: prayer.title ?? '',
      resolved_at: prayer.resolved_at ?? null,
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

  private withAuth<T>(requestFactory: (token: string) => Observable<T>): Observable<T> {
    const token = this.authService.accessTokenSnapshot;
    if (token) {
      return requestFactory(token).pipe(
        catchError((error) => {
          if (!this.isUnauthenticated(error)) {
            return throwError(() => error);
          }

          return this.authService.getCurrentUser().pipe(
            switchMap(() => {
              const refreshedToken = this.authService.accessTokenSnapshot;
              if (!refreshedToken) {
                return throwError(() => error);
              }

              return requestFactory(refreshedToken);
            })
          );
        })
      );
    }

    return this.authService.getCurrentUser().pipe(
      switchMap(() => {
        const refreshedToken = this.authService.accessTokenSnapshot;
        if (!refreshedToken) {
          return throwError(() => new Error('Authentication required.'));
        }

        return requestFactory(refreshedToken);
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
