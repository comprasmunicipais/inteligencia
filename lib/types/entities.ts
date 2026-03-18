export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface MunicipalityEntity extends BaseEntity {
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
}

export interface ContactEntity extends BaseEntity {
  company_id: string;
  municipality_id: string;
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
}

export interface TimelineEventEntity extends BaseEntity {
  company_id: string;
  municipality_id: string;
  contact_id?: string;
  title: string;
  description?: string;
  type?: string;
  date?: string;
}

export interface DealEntity extends BaseEntity {
  company_id: string;
  municipality_id?: string;
  title: string;
  estimated_value: number;
  status: string;
}

export interface ProposalEntity extends BaseEntity {
  company_id: string;
  municipality_id?: string;
  title: string;
  value: number;
  status: string;
  date?: string;
  notes?: string;
  department?: string;
  secretariat?: string;
}

export interface ContractEntity extends BaseEntity {
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
}

export interface TaskEntity extends BaseEntity {
  company_id: string;
  municipality_id?: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: string;
  status: string;
}

export interface OpportunityEntity extends BaseEntity {
  company_id: string;
  source: string;
  external_id: string;
  municipality_id?: string;
  municipality_match_status: string;
  organ_name: string;
  city: string;
  state: string;
  title: string;
  description?: string;
  modality?: string;
  situation?: string;
  publication_date?: string;
  opening_date?: string;
  estimated_value?: number;
  official_url?: string;
  sync_hash: string;
  match_score: number;
  match_reason?: string;
  internal_status: string;
  last_synced_at?: string;
}