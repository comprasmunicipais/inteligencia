import { ContractDTO } from '../types/dtos';
import { ContractStatus } from '../types/enums';

export const mapContractToDTO = (row: any): ContractDTO => {
  const endDate = row.end_date || row.end;
  const isExpiringSoon = endDate ? (new Date(endDate).getTime() - new Date().getTime()) < (30 * 24 * 60 * 60 * 1000) : false;

  return {
    id: row.id,
    company_id: row.company_id,
    municipality_id: row.municipality_id || undefined,
    title: row.title || '-',
    value: row.value || 0,
    start_date: row.start_date || row.start || new Date().toISOString(),
    end_date: endDate || new Date().toISOString(),
    notes: row.notes || undefined,
    status: row.status as ContractStatus || ContractStatus.ACTIVE,
    department: row.department,
    secretariat: row.secretariat,
    created_at: row.created_at,
    updated_at: row.updated_at,
    account_name: row.municipalities?.name || undefined,
    is_expiring_soon: isExpiringSoon,
  };
};
