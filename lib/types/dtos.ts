export interface MunicipalityDTO {
  id: string;
  name: string;
  city: string;
  state: string;
  region?: string;
  status?: string;
  mayor_name?: string;
  website?: string;
  address?: string;
  zip_code?: string;
  population?: number;
  population_range?: string;
  area_km2?: number;
  installation_year?: number;
  ddd?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContactDTO {
  id: string;
  municipality_id: string;
  company_id: string;
  name: string;
  role?: string;
  department?: string;
  secretariat?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  location?: string;
  notes?: string;
  bio?: string;
  status?: string;
  account_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TimelineEventDTO {
  id: string;
  municipality_id: string;
  company_id: string;
  contact_id?: string;
  title: string;
  description?: string;
  type?: string;
  date?: string;
  contact_name?: string;
  municipality_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DealDTO {
  id: string;
  company_id: string;
  municipality_id?: string;
  title: string;
  estimated_value: number;
  status: string;
  account_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProposalDTO {
  id: string;
  company_id: string;
  municipality_id?: string;
  title: string;
  value: number;
  status: string;
  date?: string;
  notes?: string;
  department?: string;
  secretariat?: string;
  account_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContractDTO {
  id: string;
  company_id: string;
  municipality_id?: string;
  title: string;
  value: number;
  status: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  department?: string;
  secretariat?: string;
  is_expiring_soon?: boolean;
  account_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskDTO {
  id: string;
  company_id: string;
  municipality_id?: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: string;
  status: string;
  account_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OpportunityDTO {
  id: string;
  company_id?: string;
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
  municipality_name?: string;
  created_at?: string;
  updated_at?: string;
}