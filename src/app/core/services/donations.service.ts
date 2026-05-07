import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  DonationCheckoutRequest,
  DonationCheckoutResponse,
  DonationCheckoutVerificationResponse,
  RecurringDonationCreateRequest,
  RecurringDonationCreateResponse,
  RecurringDonationItem,
  DonationMobileCheckoutResponse,
  DonationMobileVerificationResponse,
} from '../models/donation.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class DonationsService {
  private readonly endpoint = 'donations/checkout/';
  private readonly verifyEndpoint = 'donations/verify-checkout-session/';

  constructor(
    private readonly api: ApiService,
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  createCheckout(
    payload: DonationCheckoutRequest
  ): Observable<DonationCheckoutResponse> {
    return this.withOptionalAuth((token) =>
      this.http.post<DonationCheckoutResponse>(this.buildUrl(this.endpoint), payload, {
        headers: token ? this.buildAuthHeaders(token) : undefined,
      })
    );
  }

  verifyCheckoutSession(sessionId: string): Observable<DonationCheckoutVerificationResponse> {
    return this.api.get<DonationCheckoutVerificationResponse>(this.verifyEndpoint, {
      session_id: sessionId,
    } as const);
  }

  createMobileCheckout(
    payload: DonationCheckoutRequest
  ): Observable<DonationMobileCheckoutResponse> {
    return this.withOptionalAuth((token) =>
      this.http.post<DonationMobileCheckoutResponse>(this.buildUrl('donations/mobile/checkout/'), payload, {
        headers: token ? this.buildAuthHeaders(token) : undefined,
      })
    );
  }

  createRecurringCheckout(
    payload: RecurringDonationCreateRequest
  ): Observable<RecurringDonationCreateResponse> {
    if (!environment.production) {
      console.log('[DonationsService] recurring create requested', {
        endpoint: 'donations/recurring/create/',
        isLoggedIn: this.authService.isAuthenticatedSnapshot,
        hasAccessToken: !!this.authService.accessTokenSnapshot,
      });
    }
    return this.withAuth((token) => this.postRecurringCheckout(token, payload));
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
    );
  }

  verifyMobilePayment(donationId: number): Observable<DonationMobileVerificationResponse> {
    return this.api.get<DonationMobileVerificationResponse>('donations/verify-mobile-payment/', {
      donation_id: donationId,
    } as const);
  }

  private postRecurringCheckout(
    token: string,
    payload: RecurringDonationCreateRequest
  ): Observable<RecurringDonationCreateResponse> {
    if (!environment.production) {
      console.log('[DonationsService] recurring create request headers', {
        endpoint: 'donations/recurring/create/',
        tokenAttached: !!token,
      });
    }
    return this.http.post<RecurringDonationCreateResponse>(
      this.buildUrl('donations/recurring/create/'),
      payload,
      {
        headers: this.buildAuthHeaders(token),
      }
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
    });
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
          if (!this.isUnauthorized(error)) {
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
        if (!this.isUnauthorized(error)) {
          return throwError(() => error);
        }

        return this.authService.getCurrentUser().pipe(
          switchMap(() => requestFactory(this.authService.accessTokenSnapshot))
        );
      })
    );
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
  }
}
