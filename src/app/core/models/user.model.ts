export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  full_name?: string;
  access_scope?: string[];
  assigned_branches?: number[];
  phone?: string;
  language?: string;
}
