import { MunicipalityEntity, ContactEntity, ProposalEntity, ContractEntity, DealEntity, TimelineEventEntity, TaskEntity } from './entities';

/**
 * Data Transfer Objects (DTOs) for the UI
 */

export interface MunicipalityDTO extends MunicipalityEntity {
  // Add any UI-specific computed fields here
}

export interface ContactDTO extends ContactEntity {
  account_name?: string;
}

export interface ProposalDTO extends ProposalEntity {
  account_name?: string;
}

export interface ContractDTO extends ContractEntity {
  account_name?: string;
  is_expiring_soon?: boolean;
}

export interface DealDTO extends DealEntity {
  account_name?: string;
}

export interface TaskDTO extends TaskEntity {
  account_name?: string;
}

export interface TimelineEventDTO extends TimelineEventEntity {
  contact_name?: string;
  account_name?: string;
}

// Listing vs Detail variations if needed
export type MunicipalityListItem = Pick<MunicipalityDTO, 'id' | 'name' | 'city' | 'state' | 'status' | 'population'>;
export type ContactListItem = Pick<ContactDTO, 'id' | 'name' | 'role' | 'account_name' | 'status' | 'email' | 'phone'>;
