import { createClient } from '@/lib/supabase/client';
import { OpportunityDTO } from '../types/dtos';
import { mapOpportunityToDTO } from '../mappers/opportunities';

async function enrichOpportunitiesWithScores(
  companyId: string,
  opportunities: any[]
): Promise<OpportunityDTO[]> {
  const supabase = createClient();
  const opportunityIds = (opportunities || []).map((opp) => opp.id);

  if (opportunityIds.length === 0) {
    return [];
  }

  const { data: scores } = await supabase
    .from('company_opportunity_scores')
    .select('opportunity_id, match_score, match_reason')
    .eq('company_id', companyId)
    .in('opportunity_id', opportunityIds);

  const scoresMap = new Map(scores?.map((score) => [score.opportunity_id, score]) || []);

  return opportunities.map((opp) =>
    mapOpportunityToDTO({
      ...opp,
      match_score: scoresMap.get(opp.id)?.match_score ?? (companyId ? 0 : opp.match_score ?? 0),
      match_reason: scoresMap.get(opp.id)?.match_reason ?? opp.match_reason,
    })
  );
}

/**
 * Marca como 'expired' todas as oportunidades cujo prazo já passou.
 * Chamado no início de cada sincronização com o PNCP.
 */
export async function archiveExpiredOpportunities(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('opportunities')
    .update({ internal_status: 'expired', updated_at: new Date().toISOString() })
    .lt('opening_date', new Date().toISOString())
    .neq('internal_status', 'expired');

  if (error) {
    console.error('SUPABASE ERROR (archiveExpiredOpportunities):', error);
  }
}

/**
 * Remove definitivamente oportunidades expiradas há mais de 30 dias.
 * Chamado no início de cada sincronização com o PNCP.
 */
export async function deleteOldExpiredOpportunities(): Promise<void> {
  return;
}

export const opportunityService = {
  async getAll(
    companyId: string,
    filters?: any,
    options?: { offset?: number; limit?: number }
  ): Promise<OpportunityDTO[]> {
    const supabase = createClient();
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    let query = supabase
      .from('opportunities')
      .select('*, municipalities(name)');

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

    const { data, error } = await query
      .order('publication_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('SUPABASE ERROR (opportunities.getAll):', error);
      throw error;
    }

    return enrichOpportunitiesWithScores(companyId, data || []);
  },

  async getHighMatch(
    companyId: string,
    options?: { offset?: number; limit?: number }
  ): Promise<OpportunityDTO[]> {
    const supabase = createClient();
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    const { data: scoreRows, error: scoresError } = await supabase
      .from('company_opportunity_scores')
      .select('opportunity_id, match_score')
      .eq('company_id', companyId)
      .gte('match_score', 70)
      .order('match_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (scoresError) {
      console.error('SUPABASE ERROR (opportunities.getHighMatch.scores):', scoresError);
      throw scoresError;
    }

    const opportunityIds = (scoreRows || []).map((row) => row.opportunity_id);
    if (opportunityIds.length === 0) {
      return [];
    }

    const { data: opportunities, error: opportunitiesError } = await supabase
      .from('opportunities')
      .select('*, municipalities(name)')
      .in('id', opportunityIds);

    if (opportunitiesError) {
      console.error(
        'SUPABASE ERROR (opportunities.getHighMatch.opportunities):',
        opportunitiesError
      );
      throw opportunitiesError;
    }

    const opportunitiesMap = new Map((opportunities || []).map((opp) => [opp.id, opp]));
    const orderedOpportunities = opportunityIds
      .map((id) => opportunitiesMap.get(id))
      .filter(Boolean);

    return enrichOpportunitiesWithScores(companyId, orderedOpportunities);
  },

  async getByMunicipality(municipalityId: string): Promise<OpportunityDTO[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('opportunities')
      .select('*, municipalities(name)')
      .eq('municipality_id', municipalityId)
      .order('publication_date', { ascending: false });

    if (error) {
      console.error('SUPABASE ERROR (opportunities.getByMunicipality):', error);
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
      .select('*, municipalities(name)')
      .single();

    if (error) {
      console.error('SUPABASE ERROR (opportunities.updateStatus):', error);
      throw error;
    }

    return mapOpportunityToDTO(data);
  },

  async getStats(companyId: string) {
    const supabase = createClient();
    const { count: totalCount, error: totalError } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true });

    if (totalError) {
      console.error('SUPABASE ERROR (opportunities.getStats):', totalError);
      throw totalError;
    }

    const { data, error } = await supabase
      .from('opportunities')
      .select('id, internal_status, match_score, opening_date, created_at');

    if (error) {
      console.error('SUPABASE ERROR (opportunities.getStats):', error);
      throw error;
    }

    const { data: scores } = await supabase
      .from('company_opportunity_scores')
      .select('opportunity_id, match_score')
      .eq('company_id', companyId);

    const scoresMap = new Map(scores?.map(s => [s.opportunity_id, s.match_score]) || []);

    const all = (data || []).map(o => ({
      ...o,
      match_score: scoresMap.has(o.id) ? scoresMap.get(o.id) : (companyId ? 0 : o.match_score ?? 0),
    }));

    const merged = all;

    const total = totalCount ?? 0;
    const highMatch = merged.filter(o => Number(o.match_score || 0) >= 70).length;
    const converted = merged.filter(o => String(o.internal_status || '').startsWith('converted_')).length;
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const newLastSync = merged.filter(o => o.created_at && o.created_at >= last24h).length;
    const nowIso = new Date().toISOString();
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const expiringSoon = merged.filter(
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
