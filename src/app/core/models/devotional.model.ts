export interface DevotionalPublicListItem {
  id: number;
  title: string;
  slug: string;
  scripture_reference: string;
  author_name: string | null;
  cover_image: string | null;
  publication_date: string | null;
}

export interface DevotionalPublicDetail extends DevotionalPublicListItem {
  scripture_text: string | null;
  content: string;
  reflection_question: string | null;
  prayer: string | null;
}

export interface DevotionalListFilters {
  page?: number;
}
