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
  DonationMobileCheckoutResponse,
  DonationMobileVerificationResponse,
} from '../models/donation.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

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
    return this.api.post<DonationCheckoutResponse>(this.endpoint, payload);
  }

  verifyCheckoutSession(sessionId: string): Observable<DonationCheckoutVerificationResponse> {
    return this.api.get<DonationCheckoutVerificationResponse>(this.verifyEndpoint, {
      session_id: sessionId,
    } as const);
  }

  createMobileCheckout(
    payload: DonationCheckoutRequest
  ): Observable<DonationMobileCheckoutResponse> {
    return this.api.post<DonationMobileCheckoutResponse>('donations/mobile/checkout/', payload);
  }

  createRecurringCheckout(
    payload: RecurringDonationCreateRequest
  ): Observable<RecurringDonationCreateResponse> {
    const token = this.authService.accessTokenSnapshot;
    if (token) {
      return this.postRecurringCheckout(token, payload).pipe(
        catchError((error) => {
          if (!this.isUnauthorized(error)) {
            return throwError(() => error);
          }

          return this.authService.getCurrentUser().pipe(
            switchMap(() => {
              const refreshedToken = this.authService.accessTokenSnapshot;
              if (!refreshedToken) {
                return throwError(() => error);
              }
              return this.postRecurringCheckout(refreshedToken, payload);
            })
          );
        })
      );
    }

    return this.authService.getCurrentUser().pipe(
      switchMap(() => {
        const refreshedToken = this.authService.accessTokenSnapshot;
        if (!refreshedToken) {
          return throwError(() => new Error('Authentication required for recurring donations.'));
        }
        return this.postRecurringCheckout(refreshedToken, payload);
      })
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
    return this.http.post<RecurringDonationCreateResponse>(
      this.buildUrl('donations/recurring/create/'),
      payload,
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      }
    );
  }

  private buildUrl(path: string): string {
    const baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/*/, '').replace(/\/+$/, '');
    return `${baseUrl}/${normalizedPath}/`;
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
  }
}
