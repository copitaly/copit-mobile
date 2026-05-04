import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DonationCheckoutSummary {
  branchName?: string;
  category?: string;
  amount?: number;
  currency?: string;
  donorEmail?: string;
  transactionReference?: string;
  interval?: 'one_time' | 'monthly';
  recurringDonationId?: number;
  branchId?: number;
  timestamp?: number;
}

@Injectable({ providedIn: 'root' })
export class DonationFlowStateService {
  private readonly subject = new BehaviorSubject<DonationCheckoutSummary | null>(null);
  readonly summary$: Observable<DonationCheckoutSummary | null> = this.subject.asObservable();
  private readonly storageKey = 'donorCheckoutSummary';

  setSummary(summary: DonationCheckoutSummary): void {
    this.subject.next(summary);
    this.persist(summary);
  }

  clear(): void {
    this.subject.next(null);
    this.removeStorage();
  }

  getStoredSummary(): DonationCheckoutSummary | null {
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as DonationCheckoutSummary;
    } catch {
      return null;
    }
  }

  private persist(summary: DonationCheckoutSummary): void {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(summary));
    } catch {
      // ignore
    }
  }

  private removeStorage(): void {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
  }
}
