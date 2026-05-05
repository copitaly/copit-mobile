export interface DonationCheckoutRequest {
  church_id: number;
  category?: string;
  category_id?: number;
  amount: number;
  donor_email?: string;
}

export type DonationFrequency = 'one_time' | 'monthly';

export interface RecurringDonationCreateRequest {
  church_id: number;
  category?: string;
  amount: number;
  interval: 'monthly';
}

export interface DonationCheckoutResponse {
  checkout_url: string;
  donation_id: number;
  transaction_reference: string;
}

export interface DonationCheckoutVerificationResponse {
  verified: boolean;
  payment_status: string;
  transaction_reference?: string;
  amount?: string;
  currency?: string;
  category?: string;
  donor_email?: string;
  church?: {
    id?: number;
    name?: string;
  };
}

export interface DonationMobileCheckoutResponse {
  client_secret: string;
  donation_id: number;
  transaction_reference: string;
}

export interface RecurringDonationCreateResponse {
  recurring_donation_id: number;
  subscription_id: string;
  client_secret: string;
  status: string;
  latest_invoice_id?: string | null;
  stripe_price_id?: string | null;
}

export interface RecurringDonationItem {
  id: number;
  church: {
    id: number;
    name: string;
  } | null;
  category: string;
  amount: string;
  currency: string;
  interval: string;
  status: string;
  start_date?: string | null;
  next_payment_date?: string | null;
  last_payment_date?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DonationMobileVerificationResponse {
  verified: boolean;
  donation_id: number;
  church?: {
    id?: number;
    name?: string;
  };
  category?: string;
  amount?: string;
  currency?: string;
  transaction_reference?: string;
  status?: string;
}
