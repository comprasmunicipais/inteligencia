import { createClient } from '@/lib/supabase/client';
import { OpportunityDTO } from '../types/dtos';
import { mapOpportunityToDTO } from '../mappers/opportunities';

export const opportunityService = {
  async getAll(companyId: string, filters?: any): Promise<OpportunityDTO[]> {
    const supabase = createClient();

    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('company_id', companyId);

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,organ_name.ilike.%${filters.search}%`);
    }

    if (filters?.state) {
      query = query.eq('state', filters.state);
    }

    if (filters?.modality) {
      query = query.eq('modality', filters.modality);
    }

    if (filters?.internal_status) {
      query = query.eq('internal_status', filters.internal_status);
    }

    const { data, error } = await query.order('publication_date', { ascending: false });

    if (error) {
      console.error('SUPABASE ERROR (opportunities.getAll):', error);
      throw error;
    }

    return (data || []).map(mapOpportunityToDTO);
  },

  async getById(id: string): Promise<OpportunityDTO> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('SUPABASE ERROR (opportunities.getById):', error);
      throw error;
    }

    return mapOpportunityToDTO(data);
  },

  async updateStatus(id: string, status: string): Promise<OpportunityDTO> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('opportunities')
      .update({
        internal_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('SUPABASE ERROR (opportunities.updateStatus):', error);
      throw error;
    }

    return mapOpportunityToDTO(data);
  },

  async getStats(companyId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('opportunities')
      .select('internal_status, match_score, opening_date, created_at')
      .eq('company_id', companyId);

    if (error) {
      console.error('SUPABASE ERROR (opportunities.getStats):', error);
      throw error;
    }

    const total = data.length;
    const highMatch = data.filter(o => Number(o.match_score || 0) >= 80).length;
    const converted = data.filter(o => String(o.internal_status || '').startsWith('converted_')).length;

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const newLastSync = data.filter(o => o.created_at && o.created_at >= last24h).length;

    const nowIso = new Date().toISOString();
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const expiringSoon = data.filter(
      o => o.opening_date && o.opening_date <= soon && o.opening_date >= nowIso
    ).length;

    return {
      total,
      newLastSync,
      highMatch,
      expiringSoon,
      converted
    };
  }
};
