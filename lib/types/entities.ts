import { AccountStatus, ContactStatus, ProposalStatus, ContractStatus, DealStage, Region, TaskPriority, TaskStatus } from './enums';

/**
 * Base Entities representing the Database Schema
 */

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface MunicipalityEntity extends BaseEntity {
  name: string;
  mayor_name?: string;
  city: string;
  state: string;
  zip_code?: string;
  address?: string;
  ddd?: string;
  phone?: string;
  email?: string;
  website?: string;
  population?: number;
  region?: Region;
  area_km2?: number;
  installation_year?: number;
  population_range?: string;
  status?: AccountStatus;
}

export interface ContactEntity extends BaseEntity {
  company_id: string;
  municipality_id?: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  status: ContactStatus;
  bio?: string;
  department?: string;
  secretariat?: string;
  location?: string;
}

export interface ProposalEntity extends BaseEntity {
  company_id: string;
  municipality_id?: string;
  title: string;
  value: number;
  date: string;
  status: ProposalStatus;
  department?: string;
  secretariat?: string;
}

export interface ContractEntity extends BaseEntity {
  company_id: string;
  municipality_id?: string;
  title: string;
  value: number;
  start_date: string;
  end_date: string;
  notes?: string;
  status: ContractStatus;
  department?: string;
  secretariat?: string;
}

export interface DealEntity extends BaseEntity {
  company_id: string;
  municipality_id: string;
  title: string;
  estimated_value: number;
  status: string; // lead, proposta, ganho, perdido
}

export interface TaskEntity extends BaseEntity {
  company_id: string;
  municipality_id?: string;
  title: string;
  description?: string;
  due_date: string;
  priority: string; // baixa, média, alta
  status: string; // pendente, concluído
}

export interface TimelineEventEntity extends BaseEntity {
  company_id: string;
  contact_id?: string;
  municipality_id?: string;
  type: string;
  title: string;
  description?: string;
  date: string;
}
