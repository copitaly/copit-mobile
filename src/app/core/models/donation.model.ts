export interface DonationCheckoutRequest {
  church_id: number;
  category?: string;
  category_id?: number;
  amount: number;
  donor_email?: string;
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
