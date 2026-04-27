import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔓 rotas públicas — sem verificação de sessão
  if (
    pathname.startsWith('/api/agents/test') ||
    pathname.startsWith('/api/demo') ||
    pathname.startsWith('/api/pncp/sync') ||
    pathname.startsWith('/api/pncp/ingest') ||
    pathname.startsWith('/api/pncp/scores') ||
    pathname.startsWith('/api/pncp/scrape') ||
    pathname.startsWith('/api/email/track') ||
    pathname.startsWith('/api/email/queue/process') ||
    pathname.startsWith('/api/cron/trial-expiring') ||
    pathname.startsWith('/api/billing/webhook') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/integrations/google/callback') ||
    pathname.startsWith('/api/plans') ||
    pathname.startsWith('/api/signup') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/help/')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isDemoRecalculateScoresRoute =
    request.method === 'POST' && pathname === '/api/intel/recalculate-scores';

  const isWriteMethod = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method);
  if (isWriteMethod && !isDemoRecalculateScoresRoute && user.user_metadata?.is_demo === true) {
    return NextResponse.json(
      { error: 'Modo demonstração — escrita desabilitada.' },
      { status: 403 }
    );
  }

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');
  if (isAdminPage || isAdminApi) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'platform_admin') {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
