import { DealDTO } from '../types/dtos';
import { DealStage } from '../types/enums';

export const mapDealToDTO = (row: any): DealDTO => {
  return {
    id: row.id,
    company_id: row.company_id,
    municipality_id: row.municipality_id || '-',
    title: row.title || '-',
    estimated_value: row.estimated_value || 0,
    status: row.status || 'lead',
    created_at: row.created_at,
    updated_at: row.updated_at,
    account_name: row.municipalities?.name || undefined,
  };
};
