import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  DonationCheckoutRequest,
  DonationCheckoutResponse,
  DonationCheckoutVerificationResponse,
  DonationMobileCheckoutResponse,
} from '../models/donation.model';

@Injectable({ providedIn: 'root' })
export class DonationsService {
  private readonly endpoint = 'donations/checkout/';
  private readonly verifyEndpoint = 'donations/verify-checkout-session/';

  constructor(private readonly api: ApiService) {}

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
}
