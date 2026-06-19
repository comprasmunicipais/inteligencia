import { TaskDTO } from '../types/dtos';
import { TaskPriority, TaskStatus } from '../types/enums';

export const mapTaskToDTO = (row: any): TaskDTO => {
  return {
    id: row.id,
    company_id: row.company_id,
    municipality_id: row.municipality_id,
    contact_id: row.contact_id || undefined,
    deal_id: row.deal_id || undefined,
    title: row.title || '-',
    description: row.description,
    due_date: row.due_date,
    priority: row.priority || 'média',
    status: row.status || 'pendente',
    created_at: row.created_at,
    updated_at: row.updated_at,
    account_name: row.municipalities?.name || undefined,
    contact_name: row.contacts?.name || undefined,
    deal_title: row.deals?.title || undefined,
  };
};
