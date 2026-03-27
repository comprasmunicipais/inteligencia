import { createAdminClient } from '@/lib/supabase/server';

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  plan_id?: string;
  status: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  company_id: string;
  status: string;
  last_access?: string;
  company?: {
    name: string;
  };
}

export const adminService = {
  // Companies
  async getCompanies() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Company[];
  },

  async createCompany(company: Partial<Company>) {
    const supabase = await createAdminClient();

    // Inserir apenas campos que existem na tabela
    const { data: newCompany, error: insertError } = await supabase
      .from('companies')
      .insert([{ name: company.name, status: company.status ?? 'active' }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Buscar o plano Iniciante
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id')
      .eq('name', 'Iniciante')
      .single();

    if (planError) throw planError;

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Atualizar empresa com plan_id e trial_ends_at
    const { data, error: updateError } = await supabase
      .from('companies')
      .update({ plan_id: plan.id, trial_ends_at: trialEndsAt })
      .eq('id', newCompany.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Inserir subscription de trial
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert([{
        company_id: newCompany.id,
        plan_id: plan.id,
        status: 'trial',
        billing_cycle: 'monthly',
        trial_ends_at: trialEndsAt,
      }]);

    if (subError) throw subError;

    return data as Company;
  },

  async updateCompany(id: string, company: Partial<Company>) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('companies')
      .update(company)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Company;
  },

  // Users
  async getUsers() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        company:companies (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UserProfile[];
  },

  async updateUserRole(id: string, role: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },

  async updateUserStatus(id: string, status: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  }
};
