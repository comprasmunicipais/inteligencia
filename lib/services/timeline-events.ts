import { createClient } from '@/lib/supabase/client';
import { TimelineEventDTO } from '../types/dtos';
import { TimelineEventEntity } from '../types/entities';
import { mapTimelineEventToDTO } from '../mappers/timeline-events';

export const timelineService = {
  async getByMunicipality(municipalityId: string): Promise<TimelineEventDTO[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('municipality_id', municipalityId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('SUPABASE ERROR (timeline.getByMunicipality):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return (data || []).map(mapTimelineEventToDTO);
  },

  async create(event: Omit<TimelineEventEntity, 'id' | 'created_at' | 'updated_at'>): Promise<TimelineEventDTO> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('timeline_events')
      .insert([event])
      .select('*')
      .single();
    
    if (error) {
      console.error('SUPABASE ERROR (timeline.create):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return mapTimelineEventToDTO(data);
  },

  async update(id: string, updates: Partial<TimelineEventEntity>): Promise<TimelineEventDTO> {
    const supabase = createClient();
    // Remove fields that might not exist in the table or shouldn't be updated directly
    const { id: _id, created_at, updated_at, ...rest } = updates as any;
    
    const { data, error } = await supabase
      .from('timeline_events')
      .update(rest)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error('SUPABASE ERROR (timeline.update):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    return mapTimelineEventToDTO(data);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('timeline_events')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('SUPABASE ERROR (timeline.delete):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
  }
};
