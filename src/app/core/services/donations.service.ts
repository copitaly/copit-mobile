import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  DonationCategory,
  DonationCheckoutRequest,
  DonationCheckoutResponse,
  DonationCheckoutVerificationResponse,
  RecurringDonationCreateRequest,
  RecurringDonationCreateResponse,
  RecurringDonationItem,
  DonationMobileCheckoutResponse,
  DonationMobileVerificationRequest,
  DonationMobileVerificationResponse,
} from '../models/donation.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../models/user.model';
import { SentryTelemetryService } from './sentry-telemetry.service';

@Injectable({ providedIn: 'root' })
export class DonationsService {
  private readonly endpoint = 'donations/checkout/';
  private readonly verifyEndpoint = 'donations/verify-checkout-session/';

  constructor(
    private readonly api: ApiService,
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly injector: Injector
  ) {}

  createCheckout(
    payload: DonationCheckoutRequest
  ): Observable<DonationCheckoutResponse> {
    this.sentryTelemetry.addFeatureBreadcrumb('donations', 'One-time checkout started', {
      church_id: payload.church_id,
      category: payload.category ?? null,
      category_id: payload.category_id ?? null,
      amount: payload.amount,
    });
    return this.withOptionalAuth((token) =>
      this.http.post<DonationCheckoutResponse>(this.buildUrl(this.endpoint), payload, {
        headers: token ? this.buildAuthHeaders(token) : undefined,
      })
    ).pipe(
      tap(() => {
        this.sentryTelemetry.addFeatureBreadcrumb('donations', 'One-time checkout succeeded');
      }),
      catchError((error) => {
        this.sentryTelemetry.captureFeatureError('donations', 'One-time checkout failed', error, {
          status: this.getHttpStatus(error),
        });
        return throwError(() => error);
      })
    );
  }

  verifyCheckoutSession(sessionId: string): Observable<DonationCheckoutVerificationResponse> {
    return this.api.get<DonationCheckoutVerificationResponse>(this.verifyEndpoint, {
      session_id: sessionId,
    } as const);
  }

  getPublicDonationCategories(branchId: number): Observable<DonationCategory[]> {
    return this.api.get<DonationCategory[]>(`public/branches/${branchId}/donation-categories/`);
  }

  createMobileCheckout(
    payload: DonationCheckoutRequest
  ): Observable<DonationMobileCheckoutResponse> {
    this.sentryTelemetry.addFeatureBreadcrumb('donations', 'One-time checkout started', {
      church_id: payload.church_id,
      category: payload.category ?? null,
      category_id: payload.category_id ?? null,
      amount: payload.amount,
    });
    return this.withOptionalAuth((token) =>
      this.http.post<DonationMobileCheckoutResponse>(this.buildUrl('donations/mobile/checkout/'), payload, {
        headers: token ? this.buildAuthHeaders(token) : undefined,
      })
    ).pipe(
      tap((response) => {
        this.sentryTelemetry.addFeatureBreadcrumb('donations', 'One-time checkout succeeded', {
          donation_id: response.donation_id,
        });
      }),
      catchError((error) => {
        this.sentryTelemetry.captureFeatureError('donations', 'One-time checkout failed', error, {
          status: this.getHttpStatus(error),
        });
        return throwError(() => error);
      })
    );
  }

  createRecurringCheckout(
    payload: RecurringDonationCreateRequest
  ): Observable<RecurringDonationCreateResponse> {
    this.sentryTelemetry.addFeatureBreadcrumb('donations', 'Recurring checkout started', {
      church_id: payload.church_id,
      category: payload.category ?? null,
      category_id: payload.category_id ?? null,
      amount: payload.amount,
      interval: payload.interval,
    });
    if (!environment.production) {
      console.log('[DonationsService] recurring create requested', {
        endpoint: 'donations/recurring/create/',
        isLoggedIn: this.authService.isAuthenticatedSnapshot,
        hasAccessToken: !!this.authService.accessTokenSnapshot,
      });
    }
    return this.withAuth((token) => this.postRecurringCheckout(token, payload));
  }

  createRecurringDonation(
    payload: RecurringDonationCreateRequest
  ): Observable<RecurringDonationCreateResponse> {
    if (!environment.production) {
      console.log('[DonationsService] createRecurringDonation called', {
        endpoint: 'donations/recurring/create/',
        amount: payload.amount,
        category: payload.category,
        categoryId: payload.category_id,
        churchId: payload.church_id,
        interval: payload.interval,
      });
    }
    return this.createRecurringCheckout(payload);
  }

  getRecurringDonations(
    nextPageUrl?: string | null,
    filters?: { status?: string }
  ): Observable<PaginatedResponse<RecurringDonationItem>> {
    return this.withAuth((token) => this.fetchRecurringDonations(token, nextPageUrl, filters));
  }

  cancelRecurringDonation(recurringDonationId: number): Observable<RecurringDonationItem> {
    return this.withAuth((token) =>
      this.http.post<RecurringDonationItem>(
        this.buildUrl(`donations/recurring/${recurringDonationId}/cancel/`),
        {},
        {
          headers: this.buildAuthHeaders(token),
        }
      )
    ).pipe(
      tap((updatedDonation) => {
        this.sentryTelemetry.addFeatureBreadcrumb('donations', 'Recurring donation cancel succeeded', {
          recurring_donation_id: updatedDonation.id,
        });
      }),
      catchError((error) => {
        this.sentryTelemetry.captureFeatureError('donations', 'Recurring donation cancel failed', error, {
          recurring_donation_id: recurringDonationId,
          status: this.getHttpStatus(error),
        });
        return throwError(() => error);
      })
    );
  }

  verifyMobilePayment(
    payload: DonationMobileVerificationRequest
  ): Observable<DonationMobileVerificationResponse> {
    return this.api.get<DonationMobileVerificationResponse>('donations/verify-mobile-payment/', {
      donation_id: payload.donation_id,
      transaction_reference: payload.transaction_reference,
    } as const);
  }

  private postRecurringCheckout(
    token: string,
    payload: RecurringDonationCreateRequest
  ): Observable<RecurringDonationCreateResponse> {
    const url = this.buildUrl('donations/recurring/create/');
    const tokenAttached = !!token;
    if (!environment.production) {
      console.log('[DonationsService] recurring create request headers', {
        endpoint: 'donations/recurring/create/',
        tokenAttached,
      });
    }
    return this.http
      .post<RecurringDonationCreateResponse>(url, payload, {
        headers: this.buildAuthHeaders(token),
      })
      .pipe(
        tap((response) => {
          this.sentryTelemetry.addFeatureBreadcrumb('donations', 'Recurring checkout succeeded', {
            recurring_donation_id: response.recurring_donation_id,
          });
        }),
        catchError((error) => {
          this.sentryTelemetry.captureFeatureError('donations', 'Recurring checkout failed', error, {
            status: this.getHttpStatus(error),
          });
          return throwError(() => error);
        })
      );
  }

  private fetchRecurringDonations(
    token: string,
    nextPageUrl?: string | null,
    filters?: { status?: string }
  ): Observable<PaginatedResponse<RecurringDonationItem>> {
    const url = nextPageUrl || this.buildUrl('donations/recurring/');
    const params =
      !nextPageUrl && filters?.status
        ? { status: filters.status }
        : undefined;

    return this.http.get<PaginatedResponse<RecurringDonationItem>>(url, {
      headers: this.buildAuthHeaders(token),
      params,
    }).pipe(
      tap((response) => {
        this.sentryTelemetry.addFeatureBreadcrumb('donations', 'Recurring donations list load succeeded', {
          count: response.results.length,
          has_next_page: !!response.next,
        });
      }),
      catchError((error) => {
        this.sentryTelemetry.captureFeatureError('donations', 'Recurring donations list load failed', error, {
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

  private withAuth<T>(requestFactory: (token: string) => Observable<T>): Observable<T> {
    const token = this.authService.accessTokenSnapshot;
    if (token) {
      return requestFactory(token).pipe(
        catchError((error) => {
          if (!this.isUnauthenticated(error)) {
            return throwError(() => error);
          }

          if (!environment.production) {
            console.log('[DonationsService] auth request unauthorized, attempting refresh');
          }
          return this.authService.getCurrentUser().pipe(
            switchMap(() => {
              const refreshedToken = this.authService.accessTokenSnapshot;
              if (!refreshedToken) {
                return throwError(() => error);
              }
              if (!environment.production) {
                console.log('[DonationsService] auth refresh succeeded, retrying request once', {
                  hasAccessToken: !!refreshedToken,
                });
              }
              return requestFactory(refreshedToken);
            })
          );
        })
      );
    }

    if (!environment.production) {
      console.log('[DonationsService] no access token available, attempting auth refresh before request');
    }
    return this.authService.getCurrentUser().pipe(
      switchMap(() => {
        const refreshedToken = this.authService.accessTokenSnapshot;
        if (!refreshedToken) {
          return throwError(() => new Error('Authentication required.'));
        }
        if (!environment.production) {
          console.log('[DonationsService] auth refresh provided token, sending request', {
            hasAccessToken: !!refreshedToken,
          });
        }
        return requestFactory(refreshedToken);
      })
    );
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

  private get sentryTelemetry(): SentryTelemetryService {
    return this.injector.get(SentryTelemetryService);
  }

  private getHttpStatus(error: unknown): number | null {
    return error instanceof HttpErrorResponse ? error.status : null;
  }
}
