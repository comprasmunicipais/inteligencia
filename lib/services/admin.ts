import { createAdminClient, createClient } from '@/lib/supabase/server';
import { evaluateCompanyAccess, type AccessReason } from '@/lib/billing-guard';

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
  banned_until?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  deleted_at?: string | null;
  auth_status: 'active' | 'inactive' | 'pending' | 'deleted';
  company_status?: string | null;
  plan_id?: string | null;
  subscription_status?: string | null;
  access_status: 'granted' | 'blocked';
  access_reason:
    | AccessReason
    | 'platform_admin'
    | 'demo'
    | 'dev_user'
    | 'user_inactive'
    | 'user_pending'
    | 'user_deleted';
  company?: {
    name: string;
    status?: string | null;
    plan_id?: string | null;
  } | null;
}

type UserProfileRow = {
  id: string;
  email: string;
  role: string;
  company_id: string;
  full_name?: string | null;
  company?: { name: string; status?: string | null; plan_id?: string | null } | { name: string; status?: string | null; plan_id?: string | null }[] | null;
};

type AuthUserSummary = {
  last_sign_in_at: string | null;
  banned_until: string | null;
  email_confirmed_at: string | null;
  confirmed_at: string | null;
  deleted_at: string | null;
  is_demo: boolean;
  auth_status: UserProfile['auth_status'];
};

type SubscriptionSummary = {
  company_id: string;
  status: string | null;
};

function deriveAuthStatus(authUser: {
  banned_until?: string;
  email_confirmed_at?: string;
  confirmed_at?: string;
  deleted_at?: string;
}): UserProfile['auth_status'] {
  if (authUser.deleted_at) {
    return 'deleted';
  }

  const bannedUntil = authUser.banned_until ? new Date(authUser.banned_until) : null;
  if (bannedUntil && !Number.isNaN(bannedUntil.getTime()) && bannedUntil.getTime() > Date.now()) {
    return 'inactive';
  }

  if (!authUser.email_confirmed_at && !authUser.confirmed_at) {
    return 'pending';
  }

  return 'active';
}

function deriveAccessStatus(user: {
  email: string;
  role: string;
  company_id?: string | null;
  auth_status: UserProfile['auth_status'];
  company_status?: string | null;
  plan_id?: string | null;
  subscription_status?: string | null;
  is_demo?: boolean;
}): Pick<UserProfile, 'access_status' | 'access_reason'> {
  if (user.role === 'platform_admin') {
    return { access_status: 'granted', access_reason: 'platform_admin' };
  }

  if (user.is_demo) {
    return { access_status: 'granted', access_reason: 'demo' };
  }

  if (user.email === 'feddamico@hotmail.com') {
    return { access_status: 'granted', access_reason: 'dev_user' };
  }

  if (user.auth_status === 'inactive') {
    return { access_status: 'blocked', access_reason: 'user_inactive' };
  }

  if (user.auth_status === 'pending') {
    return { access_status: 'blocked', access_reason: 'user_pending' };
  }

  if (user.auth_status === 'deleted') {
    return { access_status: 'blocked', access_reason: 'user_deleted' };
  }

  if (!user.company_id) {
    return { access_status: 'blocked', access_reason: 'no_company' };
  }

  const commercialDecision = evaluateCompanyAccess({
    companyStatus: user.company_status ?? null,
    planId: user.plan_id ?? null,
    subscriptionStatus: user.subscription_status ?? null,
  });

  return {
    access_status: commercialDecision.allowed ? 'granted' : 'blocked',
    access_reason: commercialDecision.reason,
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
          name,
          status,
          plan_id
        )
      `)
      .order('created_at', { ascending: false });

    if (demoEmail) {
      query = query.neq('email', demoEmail);
    }

    const { data, error } = await query;

    if (error) throw error;

    const authUsersById = new Map<string, AuthUserSummary>();
    let page = 1;

    while (true) {
      const { data: authUsersPage, error: authUsersError } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (authUsersError) throw authUsersError;

      const authUsers = authUsersPage.users ?? [];

      for (const authUser of authUsers) {
        authUsersById.set(authUser.id, {
          last_sign_in_at: authUser.last_sign_in_at ?? null,
          banned_until: authUser.banned_until ?? null,
          email_confirmed_at: authUser.email_confirmed_at ?? null,
          confirmed_at: authUser.confirmed_at ?? null,
          deleted_at: authUser.deleted_at ?? null,
          is_demo: authUser.user_metadata?.is_demo === true,
          auth_status: deriveAuthStatus(authUser),
        });
      }

      if (authUsers.length < 1000) {
        break;
      }

      page += 1;
    }

    const companyIds = Array.from(
      new Set(
        (data as UserProfileRow[])
          .map((profile) => profile.company_id)
          .filter((companyId): companyId is string => Boolean(companyId))
      )
    );

    const subscriptionStatusByCompanyId = new Map<string, string | null>();

    if (companyIds.length > 0) {
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('company_id, status, created_at')
        .in('company_id', companyIds)
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      for (const subscription of (subscriptions ?? []) as (SubscriptionSummary & { created_at?: string | null })[]) {
        if (!subscriptionStatusByCompanyId.has(subscription.company_id)) {
          subscriptionStatusByCompanyId.set(subscription.company_id, subscription.status);
        }
      }
    }

    return (data as UserProfileRow[]).map((profile) => {
      const authUser = authUsersById.get(profile.id);
      const company = Array.isArray(profile.company) ? profile.company[0] : profile.company;
      const access = deriveAccessStatus({
        email: profile.email,
        role: profile.role,
        company_id: profile.company_id,
        auth_status: authUser?.auth_status ?? 'pending',
        company_status: company?.status ?? null,
        plan_id: company?.plan_id ?? null,
        subscription_status: profile.company_id ? (subscriptionStatusByCompanyId.get(profile.company_id) ?? null) : null,
        is_demo: authUser?.is_demo ?? false,
      });

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name ?? null,
        role: profile.role,
        company_id: profile.company_id,
        company,
        company_status: company?.status ?? null,
        plan_id: company?.plan_id ?? null,
        subscription_status: profile.company_id ? (subscriptionStatusByCompanyId.get(profile.company_id) ?? null) : null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        banned_until: authUser?.banned_until ?? null,
        email_confirmed_at: authUser?.email_confirmed_at ?? null,
        confirmed_at: authUser?.confirmed_at ?? null,
        deleted_at: authUser?.deleted_at ?? null,
        auth_status: authUser?.auth_status ?? 'pending',
        access_status: access.access_status,
        access_reason: access.access_reason,
      };
    });
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
