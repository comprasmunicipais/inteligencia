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

export enum OpportunityStatus {
  NEW = 'new',
  UPDATED = 'updated',
  UNDER_REVIEW = 'under_review',
  RELEVANT = 'relevant',
  DISCARDED = 'discarded',
  CONVERTED_TO_TASK = 'converted_to_task',
  CONVERTED_TO_DEAL = 'converted_to_deal',
  CONVERTED_TO_PROPOSAL = 'converted_to_proposal',
}

export enum OpportunityMatchStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  NO_MATCH = 'no_match',
  MANUAL = 'manual',
}