import { createAdminClient, createClient } from '@/lib/supabase/server';

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
  full_name?: string | null;
  last_sign_in_at?: string | null;
  company?: {
    name: string;
  } | null;
}

type UserProfileRow = {
  id: string;
  email: string;
  role: string;
  company_id: string;
  full_name?: string | null;
  company?: { name: string } | { name: string }[] | null;
};

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
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: requesterProfile, error: requesterProfileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (requesterProfileError || !requesterProfile || requesterProfile.role !== 'platform_admin') {
      throw new Error('Forbidden');
    }

    const supabase = await createAdminClient();
    const demoEmail = process.env.DEMO_USER_EMAIL;
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        company_id,
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

    const authUsersById = new Map<string, string | null>();
    let page = 1;

    while (true) {
      const { data: authUsersPage, error: authUsersError } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (authUsersError) throw authUsersError;

      const authUsers = authUsersPage.users ?? [];

      for (const authUser of authUsers) {
        authUsersById.set(authUser.id, authUser.last_sign_in_at ?? null);
      }

      if (authUsers.length < 1000) {
        break;
      }

      page += 1;
    }

    return (data as UserProfileRow[]).map((profile) => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name ?? null,
      role: profile.role,
      company_id: profile.company_id,
      company: Array.isArray(profile.company) ? profile.company[0] : profile.company,
      last_sign_in_at: authUsersById.get(profile.id) ?? null,
    }));
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
    void id;
    void status;
    throw new Error('Atualização de status de usuário não suportada.');
  }
};
