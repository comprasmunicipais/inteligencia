import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createAdminClient();

    const { error: truncateError } = await supabase
      .from('municipality_emails')
      .delete()
      .not('email', 'is', null);

    if (truncateError) {
      return NextResponse.json(
        { error: `Erro ao limpar municipality_emails: ${truncateError.message}` },
        { status: 500 }
      );
    }

    const insertSql = `
      insert into municipality_emails (
        municipality_id,
        email,
        city_source,
        state_source,
        source,
        created_at,
        updated_at
      )
      select
        m.id as municipality_id,
        lower(trim(i.email)) as email,
        i.cidade,
        i.uf,
        'import_prefeituras',
        now(),
        now()
      from public.municipality_emails_import i
      join public.municipalities m
        on unaccent(replace(lower(trim(i.cidade)), '-', ' '))
         = unaccent(replace(lower(trim(m.city)), '-', ' '))
       and upper(trim(i.uf)) = upper(trim(m.state))
      where i.email is not null
        and trim(i.email) <> ''
      on conflict (email) do nothing;
    `;

    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql: insertSql,
    });

    if (rpcError) {
      return NextResponse.json(
        {
          error:
            'Erro ao processar vínculo dos e-mails. Verifique se a função exec_sql existe no banco.',
          details: rpcError.message,
        },
        { status: 500 }
      );
    }

    const { count, error: countError } = await supabase
      .from('municipality_emails')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json(
        { error: `Erro ao contar municipality_emails: ${countError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      totalProcessed: count || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro interno ao processar e-mails.' },
      { status: 500 }
    );
  }
}
