import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type AuthContext =
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
      companyId: string;
      error: null;
      status: null;
    }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: null;
      companyId: null;
      error: string;
      status: number;
    };

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getAuthenticatedContext(): Promise<AuthContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      userId: null,
      companyId: null,
      error: 'Usuário não autenticado.',
      status: 401,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return {
      supabase,
      userId: null,
      companyId: null,
      error: 'Empresa não identificada.',
      status: 403,
    };
  }

  return {
    supabase,
    userId: user.id,
    companyId: profile.company_id as string,
    error: null,
    status: null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedContext();

    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID da base é obrigatório.' }, { status: 400 });
    }

    const { data: customerList, error: customerListError } = await auth.supabase
      .from('customer_contact_lists')
      .select(`
        id,
        name,
        contacts_count,
        valid_contacts_count,
        invalid_contacts_count,
        duplicate_contacts_count
      `)
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId)
      .single();

    if (customerListError || !customerList) {
      return NextResponse.json({ error: 'Base não encontrada.' }, { status: 404 });
    }

    const [{ count: eligibleContacts, error: eligibleError }, { count: notCheckedContacts, error: notCheckedError }, { data: sampleContacts, error: sampleError }] =
      await Promise.all([
        auth.supabase
          .from('customer_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('list_id', id)
          .eq('company_id', auth.companyId)
          .eq('owner_user_id', auth.userId)
          .eq('is_valid_email', true),
        auth.supabase
          .from('customer_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('list_id', id)
          .eq('company_id', auth.companyId)
          .eq('owner_user_id', auth.userId)
          .eq('validation_status', 'not_checked'),
        auth.supabase
          .from('customer_contacts')
          .select('email_normalized, company_name, name')
          .eq('list_id', id)
          .eq('company_id', auth.companyId)
          .eq('owner_user_id', auth.userId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

    if (eligibleError || notCheckedError || sampleError) {
      return NextResponse.json(
        {
          error:
            eligibleError?.message ||
            notCheckedError?.message ||
            sampleError?.message ||
            'Erro ao gerar preview da audiência.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: {
        list_id: customerList.id,
        list_name: customerList.name,
        total_contacts: customerList.contacts_count ?? 0,
        valid_contacts: customerList.valid_contacts_count ?? 0,
        invalid_contacts: customerList.invalid_contacts_count ?? 0,
        duplicate_contacts: customerList.duplicate_contacts_count ?? 0,
        eligible_contacts: eligibleContacts ?? 0,
        not_checked_contacts: notCheckedContacts ?? 0,
        sample_contacts: sampleContacts ?? [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao gerar preview da audiência.' },
      { status: 500 },
    );
  }
}
