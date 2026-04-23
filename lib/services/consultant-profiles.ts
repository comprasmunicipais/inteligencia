import { createClient } from '@/lib/supabase/client';

export interface ConsultantProfile {
  id: string;
  company_id: string;
  name: string;
  cnpj: string;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateConsultantProfileInput = {
  company_id: string;
  name: string;
  cnpj: string;
};

export type UpdateConsultantProfileInput = {
  name: string;
  cnpj: string;
};

const supabase = createClient();

export const consultantProfilesService = {
  async getProfiles(companyId: string): Promise<ConsultantProfile[]> {
    const { data, error } = await supabase
      .from('consultant_profiles')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createProfile(input: CreateConsultantProfileInput): Promise<ConsultantProfile> {
    const { data, error } = await supabase
      .from('consultant_profiles')
      .insert([input])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(id: string, input: UpdateConsultantProfileInput): Promise<ConsultantProfile> {
    const { data, error } = await supabase
      .from('consultant_profiles')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async toggleActive(id: string, isActive: boolean): Promise<ConsultantProfile> {
    const { data, error } = await supabase
      .from('consultant_profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },
};
