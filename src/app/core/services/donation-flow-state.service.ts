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
  subscriptionId?: string;
  branchId?: number;
  timestamp?: number;
}

@Injectable({ providedIn: 'root' })
export class DonationFlowStateService {
  private readonly subject = new BehaviorSubject<DonationCheckoutSummary | null>(null);
  readonly summary$: Observable<DonationCheckoutSummary | null> = this.subject.asObservable();
  private readonly storageKey = 'donorCheckoutSummary';

  setSummary(summary: DonationCheckoutSummary): void {
    const sanitizedSummary = this.sanitizeForPersistence(summary);
    this.subject.next(sanitizedSummary);
    this.persist(sanitizedSummary);
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

  consumeStoredSummary(): DonationCheckoutSummary | null {
    const summary = this.getStoredSummary();
    this.clear();
    return summary;
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

  private sanitizeForPersistence(summary: DonationCheckoutSummary): DonationCheckoutSummary {
    return {
      branchName: summary.branchName,
      branchId: summary.branchId,
      category: summary.category,
      amount: summary.amount,
      currency: summary.currency,
      donorEmail: summary.donorEmail,
      transactionReference: summary.transactionReference,
      interval: summary.interval,
      recurringDonationId: summary.recurringDonationId,
      subscriptionId: summary.subscriptionId,
      timestamp: summary.timestamp,
    };
  }
}
