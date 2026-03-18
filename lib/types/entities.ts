export interface OpportunityEntity {
  id: string;
  company_id: string;

  title: string;
  description?: string;
  organ_name: string;

  modality?: string;
  situation?: string;

  city?: string;
  state?: string;

  estimated_value?: number;
  opening_date?: string;
  publication_date?: string;

  official_url?: string;

  match_score: number;
  match_reason?: string;

  internal_status: string;

  municipality_id?: string;

  created_at: string;
  updated_at?: string;
}