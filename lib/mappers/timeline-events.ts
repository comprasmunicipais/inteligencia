import { TimelineEventDTO } from '../types/dtos';

export const mapTimelineEventToDTO = (row: any): TimelineEventDTO => {
  return {
    id: row.id,
    company_id: row.company_id,
    contact_id: row.contact_id || undefined,
    municipality_id: row.municipality_id || undefined,
    type: row.type || 'other',
    title: row.title || '-',
    description: row.description || undefined,
    date: row.date || new Date().toISOString(),
    created_at: row.created_at,
    updated_at: row.updated_at,
    contact_name: row.contacts?.name || undefined,
    account_name: row.municipalities?.name || undefined,
  };
};
