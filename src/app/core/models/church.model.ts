export interface ChurchSummary {
  id: number;
  name: string;
  slug: string;
  level: string;
  district?: string | null;
  area?: string | null;
  donations_enabled: boolean;
  is_active: boolean;
}

export interface Church extends ChurchSummary {
  parent?: ChurchSummary | null;
  children?: ChurchSummary[];
}
