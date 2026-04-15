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
    const { data, error: insertError } = await supabase
      .from('companies')
      .insert([{ name: company.name, status: 'pending' }])
      .select()
      .single();

    if (insertError) throw insertError;

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
    const demoEmail = process.env.DEMO_USER_EMAIL;
    let query = supabase
      .from('profiles')
      .select(`
        *,
        company:companies (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (demoEmail) {
      query = query.neq('email', demoEmail);
    }

    const { data, error } = await query;

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
