export interface AuthUser {
  id: number;
  email: string | null;
  first_name: string;
  last_name: string;
  role: string;
  full_name?: string;
  access_scope?: string[];
  assigned_branches?: number[];
  phone?: string;
  phone_number?: string;
  language?: string;
}

export interface MemberDonationSummary {
  total_paid_amount: string;
  total_paid_count: number;
  currency: string;
  last_donation_at: string | null;
}

export interface MemberRecentDonation {
  id: number;
  church: {
    id: number;
    name: string;
  } | null;
  category: string;
  amount: string;
  currency: string;
  status: string;
  transaction_reference: string;
  created_at: string;
  paid_at: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MemberProfile extends AuthUser {
  date_joined: string;
  donation_summary: MemberDonationSummary;
  recent_donations: MemberRecentDonation[];
}

export interface MemberLoginRequest {
  identifier: string;
  password: string;
}

export interface MemberRegisterRequest {
  first_name: string;
  last_name: string;
  phone_number: string;
  email?: string | null;
  password: string;
  confirm_password: string;
}

export interface AuthTokenResponse {
  access: string;
  user: AuthUser;
}
