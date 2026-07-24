export interface BibleStudyManualListItem {
  id: number;
  title: string;
  year: number;
  language: string;
  language_display: string;
  volume: string;
  start_week: number | null;
  end_week: number | null;
  cover_image_url: string | null;
  pdf_url: string | null;
}

export interface BibleStudyManualDetail {
  id: number;
  title: string;
  year: number;
  language: string;
  language_display: string;
  volume: string;
  start_week: number | null;
  end_week: number | null;
  publication_status: string;
  published_at: string | null;
  cover_image_url: string | null;
  pdf_url: string | null;
}

export interface BibleStudyManualListFilters {
  year?: number;
  language?: string;
}
