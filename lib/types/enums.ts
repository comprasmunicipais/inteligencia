/**
 * Centralized Enums for CM Intelligence
 */

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PROSPECT = 'prospect',
}

export enum ContactStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ProposalStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum ContractStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum DealStage {
  LEAD = 'lead',
  PROPOSAL = 'proposta',
  WON = 'ganho',
  LOST = 'perdido',
}

export enum Region {
  NORTH = 'NORTE',
  NORTHEAST = 'NORDESTE',
  MIDWEST = 'CENTRO-OESTE',
  SOUTHEAST = 'SUDESTE',
  SOUTH = 'SUL',
}

export enum TaskPriority {
  LOW = 'baixa',
  MEDIUM = 'média',
  HIGH = 'alta',
}

export enum TaskStatus {
  PENDING = 'pendente',
  COMPLETED = 'concluído',
}
