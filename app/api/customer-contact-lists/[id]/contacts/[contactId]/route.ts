import { NextRequest, NextResponse } from 'next/server';
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
    contactId: string;
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

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedContext();

    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, contactId } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID da base é obrigatório.' }, { status: 400 });
    }

    if (!contactId) {
      return NextResponse.json({ error: 'ID do contato é obrigatório.' }, { status: 400 });
    }

    const { data: list, error: listError } = await auth.supabase
      .from('customer_contact_lists')
      .select(
        'id, company_id, owner_user_id, contacts_count, valid_contacts_count, invalid_contacts_count, duplicate_contacts_count',
      )
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: 'Base não encontrada.' }, { status: 404 });
    }

    const { data: contact, error: contactError } = await auth.supabase
      .from('customer_contacts')
      .select('id, is_valid_email')
      .eq('id', contactId)
      .eq('list_id', id)
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contato não encontrado.' }, { status: 404 });
    }

    const { error: deleteError } = await auth.supabase
      .from('customer_contacts')
      .delete()
      .eq('id', contactId)
      .eq('list_id', id)
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Erro ao excluir contato: ${deleteError.message}` },
        { status: 500 },
      );
    }

    const nextContactsCount = Math.max((list.contacts_count ?? 0) - 1, 0);
    const nextValidContactsCount = contact.is_valid_email
      ? Math.max((list.valid_contacts_count ?? 0) - 1, 0)
      : list.valid_contacts_count ?? 0;
    const nextInvalidContactsCount = contact.is_valid_email
      ? list.invalid_contacts_count ?? 0
      : Math.max((list.invalid_contacts_count ?? 0) - 1, 0);

    const { error: updateListError } = await auth.supabase
      .from('customer_contact_lists')
      .update({
        contacts_count: nextContactsCount,
        valid_contacts_count: nextValidContactsCount,
        invalid_contacts_count: nextInvalidContactsCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .eq('owner_user_id', auth.userId);

    if (updateListError) {
      return NextResponse.json(
        { error: `Erro ao atualizar contadores da base: ${updateListError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, id: contactId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao excluir contato.' },
      { status: 500 },
    );
  }
}
