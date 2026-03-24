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

    const { error: processError } = await supabase.rpc(
      'process_municipality_emails_import'
    );

    if (processError) {
      return NextResponse.json(
        {
          error: 'Erro ao processar vínculo dos e-mails importados.',
          details: processError.message,
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
