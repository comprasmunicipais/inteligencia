export type OpportunityStatus = 'active' | 'inactive' | 'expired' | 'cancelled';

export interface Opportunity {
  id: string;
  source: 'pncp';
  source_external_id: string; // This will be the numero_controle_pncp
  numero_controle_pncp: string;
  source_url: string;
  title: string;
  description: string;
  buyer_name: string;
  buyer_cnpj?: string;
  buyer_type?: string;
  municipality: string;
  state: string;
  ibge_code?: string;
  modality_id?: string;
  modality_name: string;
  category: string;
  dispute_mode_id?: string;
  dispute_mode_name?: string;
  instrument_type_id?: string;
  instrument_type_name?: string;
  legal_basis_code?: string;
  legal_basis_name?: string;
  estimated_value: number;
  homologated_value?: number;
  publish_date: string;
  proposal_open_date?: string;
  proposal_close_date?: string;
  deadline_date: string; // Usually proposal_close_date or similar
  status: OpportunityStatus;
  source_created_at?: string;
  source_updated_at: string;
  imported_at: string;
  updated_at: string;
  raw_payload?: any;
  is_active: boolean;
}

export type SyncJobStatus = 'running' | 'success' | 'failed';

export interface SyncJob {
  id: string;
  source: 'pncp';
  started_at: string;
  finished_at?: string;
  status: SyncJobStatus;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  error_message?: string;
  sync_window_start: string;
  sync_window_end: string;
}

export interface CompanyIntelligenceProfile {
  id: string;
  company_id: string;
  company_name: string;
  main_segment: string;
  subsegments?: string;
  target_categories?: string;
  target_modalities?: string[];
  target_states?: string[];
  target_municipalities?: string;
  min_ticket: number;
  max_ticket: number;
  positive_keywords?: string;
  negative_keywords?: string;
  preferred_buyers?: string;
  excluded_buyers?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type MatchStatus = 'new' | 'saved' | 'dismissed' | 'reviewed';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CompanyOpportunityMatch {
  id: string;
  company_id: string;
  opportunity_id: string;
  match_score: number;
  match_reason: string;
  priority_level: PriorityLevel;
  flags?: string[];
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}
