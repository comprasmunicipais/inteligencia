import { createClient } from '@/lib/supabase/client';
import { OpportunityDTO } from '../types/dtos';
import { mapOpportunityToDTO } from '../mappers/opportunities';

export const opportunityService = {
  async getAll(companyId: string, filters?: any): Promise<OpportunityDTO[]> {
    const supabase = createClient();

    let query = supabase
      .from('opportunities')
      .select('*, municipalities(name)')
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
      console.error('SUPABASE ERROR (opportunities.getAll):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    return (data || []).map(mapOpportunityToDTO);
  },

  async getById(id: string): Promise<OpportunityDTO> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('opportunities')
      .select('*, municipalities(name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('SUPABASE ERROR (opportunities.getById):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
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
      .select('*, municipalities(name)')
      .single();

    if (error) {
      console.error('SUPABASE ERROR (opportunities.updateStatus):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
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
      console.error('SUPABASE ERROR (opportunities.getStats):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    const rows = data || [];
    const now = new Date();
    const last24hDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const soonDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const total = rows.length;

    const highMatch = rows.filter(o => Number(o.match_score || 0) >= 80).length;

    const converted = rows.filter(o =>
      typeof o.internal_status === 'string' &&
      o.internal_status.startsWith('converted_')
    ).length;

    const newLastSync = rows.filter(o => {
      if (!o.created_at) return false;
      const createdAt = new Date(o.created_at);
      return !isNaN(createdAt.getTime()) && createdAt >= last24hDate;
    }).length;

    const expiringSoon = rows.filter(o => {
      if (!o.opening_date) return false;
      const openingDate = new Date(o.opening_date);
      if (isNaN(openingDate.getTime())) return false;
      return openingDate >= now && openingDate <= soonDate;
    }).length;

    return {
      total,
      newLastSync,
      highMatch,
      expiringSoon,
      converted
    };
  }
};
