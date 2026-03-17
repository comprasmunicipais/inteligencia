import { createAdminClient } from '@/lib/supabase/server';

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  plan: string;
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
    const { data, error } = await supabase
      .from('companies')
      .insert([company])
      .select()
      .single();

    if (error) throw error;
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
