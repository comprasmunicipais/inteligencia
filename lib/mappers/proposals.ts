import { ProposalDTO } from '../types/dtos';
import { ProposalStatus } from '../types/enums';

export const mapProposalToDTO = (row: any): ProposalDTO => {
  return {
    id: row.id,
    company_id: row.company_id,
    municipality_id: row.municipality_id || undefined,
    opportunity_id: row.opportunity_id || undefined,
    title: row.title || '-',
    value: row.value || 0,
    date: row.date || new Date().toISOString(),
    status: row.status as ProposalStatus || ProposalStatus.DRAFT,
    department: row.department,
    secretariat: row.secretariat,
    ai_generated: Boolean(row.ai_generated),
    ai_content: row.ai_content || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    account_name: row.municipalities?.name || undefined,
  };
};
