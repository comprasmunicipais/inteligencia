import { ContactDTO } from '../types/dtos';
import { ContactStatus } from '../types/enums';

export const mapContactToDTO = (row: any): ContactDTO => {
  return {
    id: row.id,
    company_id: row.company_id,
    municipality_id: row.municipality_id || undefined,
    name: row.name || '-',
    role: row.role || '-',
    email: row.email || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    notes: row.notes || undefined,
    status: row.status as ContactStatus || ContactStatus.ACTIVE,
    bio: row.bio || undefined,
    department: row.department || undefined,
    secretariat: row.secretariat || undefined,
    location: row.location || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    account_name: row.municipalities?.name || undefined,
  };
};
