import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

import { PrayerHierarchyDependency, PrayerRequestSubmissionPayload, PrayerRequestSubmissionResponse } from '../models/prayer.model';
import { AuthService } from './auth.service';
import { SentryTelemetryService } from './sentry-telemetry.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PrayerService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly sentryTelemetry = inject(SentryTelemetryService);

  private readonly submitEndpoint = 'public/prayer-requests/submit/';

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
