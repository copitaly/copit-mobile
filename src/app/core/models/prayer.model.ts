export type PrayerScope = 'global' | 'area' | 'district' | 'local';

export type PrayerCategory =
  | 'personal'
  | 'family'
  | 'health'
  | 'spiritual'
  | 'work'
  | 'thanksgiving'
  | 'other';

export type PrayerVisibility = 'private' | 'public';

export interface PrayerChurchSummary {
  id: number;
  name: string;
  level: string;
  branch_code?: string;
  district?: {
    id: number;
    name: string;
    level?: string;
  } | null;
  area?: {
    id: number;
    name: string;
    level?: string;
  } | null;
}

export interface PublicChurchHierarchySummary {
  id: number;
  name: string;
  level: string;
}

export interface PublicChurchHierarchy {
  id: number;
  name: string;
  level: string;
  parent: PublicChurchHierarchySummary | null;
  district: PublicChurchHierarchySummary | null;
  area: PublicChurchHierarchySummary | null;
  is_active: boolean;
}

export interface PrayerRequestSubmissionPayload {
  scope: PrayerScope;
  church_id?: number | null;
  category: PrayerCategory;
  title?: string;
  request_text: string;
  visibility: PrayerVisibility;
  is_anonymous_publicly: boolean;
  submitter_name?: string;
}

export interface PrayerRequestSubmissionResponse {
  id: number;
  scope: PrayerScope;
  church: PrayerChurchSummary | null;
  category: PrayerCategory;
  title: string;
  request_text: string;
  visibility: PrayerVisibility;
  status: string;
  is_anonymous_publicly: boolean;
  submitter_name?: string | null;
  created_at: string;
}

export interface CommunityPrayerRequest {
  id: number;
  scope: PrayerScope;
  church: PrayerChurchSummary | null;
  category: PrayerCategory;
  title: string | null;
  request_text: string;
  display_name: string;
  created_at: string;
}

export interface PrayerHierarchyDependency {
  available: boolean;
  reason: string;
}
