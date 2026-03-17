import { createClient } from '@/lib/supabase/client';
import { TaskDTO } from '../types/dtos';
import { TaskEntity } from '../types/entities';
import { mapTaskToDTO } from '../mappers/tasks';

const supabase = createClient();

export const taskService = {
  async getAll(companyId: string): Promise<TaskDTO[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, municipalities(name)')
      .eq('company_id', companyId)
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('SUPABASE ERROR (tasks.getAll):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return (data || []).map(mapTaskToDTO);
  },

  async create(task: Omit<TaskEntity, 'id' | 'created_at'>): Promise<TaskDTO> {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select('*')
      .single();
    
    if (error) {
      console.error('SUPABASE ERROR (tasks.create):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return mapTaskToDTO(data);
  },

  async update(id: string, updates: Partial<TaskEntity>): Promise<TaskDTO> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error('SUPABASE ERROR (tasks.update):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return mapTaskToDTO(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
