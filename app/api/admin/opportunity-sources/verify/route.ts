import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getAuthorizedContext() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'platform_admin') {
    return {
      supabase,
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return {
    supabase,
    authorized: true,
    response: null,
  };
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Erro desconhecido ao verificar fonte.';
}

async function verifyUrl(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
      });
    }

    if (!response.ok) {
      return {
        status: 'error' as const,
        error: `HTTP ${response.status} ao acessar a fonte.`,
      };
    }

    return {
      status: 'success' as const,
      error: null,
    };
  } catch (error) {
    return {
      status: 'error' as const,
      error: normalizeErrorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST() {
  try {
    const context = await getAuthorizedContext();

    if (!context.authorized) {
      return context.response!;
    }

    const { supabase } = context;

    const { data: sources, error: sourcesError } = await supabase
      .from('opportunity_sources')
      .select('id, url, is_active')
      .order('created_at', { ascending: false });

    if (sourcesError) {
      return NextResponse.json(
        { error: sourcesError.message },
        { status: 500 }
      );
    }

    const activeSources = (sources ?? []).filter((item) => item.is_active);

    let successCount = 0;
    let errorCount = 0;

    const results: Array<{
      id: string;
      url: string;
      last_check_status: 'success' | 'error';
      last_check_error: string | null;
      last_checked_at: string;
    }> = [];

    for (const source of activeSources) {
      const verification = await verifyUrl(source.url);
      const checkedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('opportunity_sources')
        .update({
          last_checked_at: checkedAt,
          last_check_status: verification.status,
          last_check_error: verification.error,
        })
        .eq('id', source.id);

      if (updateError) {
        errorCount += 1;
        results.push({
          id: source.id,
          url: source.url,
          last_check_status: 'error',
          last_check_error: updateError.message,
          last_checked_at: checkedAt,
        });
        continue;
      }

      if (verification.status === 'success') {
        successCount += 1;
      } else {
        errorCount += 1;
      }

      results.push({
        id: source.id,
        url: source.url,
        last_check_status: verification.status,
        last_check_error: verification.error,
        last_checked_at: checkedAt,
      });
    }

    return NextResponse.json({
      success: true,
      checked: activeSources.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao verificar fontes.' },
      { status: 500 }
    );
  }
}
