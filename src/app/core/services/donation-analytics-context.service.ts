import { Injectable } from '@angular/core';

export type AnalyticsUserType = 'guest' | 'member';
export type AnalyticsDonationFrequency = 'one_time' | 'monthly';
export type AnalyticsAmountBucket =
  | '0_10'
  | '10_25'
  | '25_50'
  | '50_100'
  | '100_250'
  | '250_plus';

export interface DonationAnalyticsContext {
  church_id?: number;
  district_id?: number;
  area_id?: number;
  category?: string;
  amount_bucket?: AnalyticsAmountBucket;
  frequency?: AnalyticsDonationFrequency;
  user_type?: AnalyticsUserType;
}

@Injectable({ providedIn: 'root' })
export class DonationAnalyticsContextService {
  private readonly storageKey = 'donationAnalyticsContext';
  private context: DonationAnalyticsContext | null = null;

  setContext(context: DonationAnalyticsContext): void {
    const sanitized = this.sanitize(context);
    this.context = sanitized;
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(sanitized));
    } catch {
      // Ignore storage failures.
    }
  }

  peekContext(): DonationAnalyticsContext | null {
    if (this.context) {
      return this.context;
    }

    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as DonationAnalyticsContext;
      this.context = this.sanitize(parsed);
      return this.context;
    } catch {
      return null;
    }
  }

  consumeContext(): DonationAnalyticsContext | null {
    const current = this.peekContext();
    this.clearContext();
    return current;
  }

  clearContext(): void {
    this.context = null;
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  private sanitize(context: DonationAnalyticsContext): DonationAnalyticsContext {
    return {
      church_id: context.church_id,
      district_id: context.district_id,
      area_id: context.area_id,
      category: context.category,
      amount_bucket: context.amount_bucket,
      frequency: context.frequency,
      user_type: context.user_type,
    };
  }
}
