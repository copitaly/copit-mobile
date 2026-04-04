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
