import { createClient } from '@/lib/supabase/client';
import { Opportunity, CompanyIntelligenceProfile, CompanyOpportunityMatch } from '@/lib/intel/types';

export const intelService = {
  // Profile
  async getProfile(companyId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('intelligence_profiles')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as CompanyIntelligenceProfile | null;
  },

  async saveProfile(profile: Partial<CompanyIntelligenceProfile>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('intelligence_profiles')
      .upsert([profile])
      .select()
      .single();

    if (error) throw error;
    return data as CompanyIntelligenceProfile;
  },

  // Matches
  async getMatches(companyId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('opportunity_matches')
      .select('*')
      .eq('company_id', companyId);

    if (error) throw error;
    return data as CompanyOpportunityMatch[];
  },

  async updateMatchStatus(id: string, status: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('opportunity_matches')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CompanyOpportunityMatch;
  },

  async saveMatches(matches: Partial<CompanyOpportunityMatch>[]) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('opportunity_matches')
      .upsert(matches)
      .select();

    if (error) throw error;
    return data as CompanyOpportunityMatch[];
  }
};
