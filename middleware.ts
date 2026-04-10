import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔓 rotas públicas — sem verificação de sessão
  if (
    pathname.startsWith('/api/demo') ||
    pathname.startsWith('/api/pncp/sync') ||
    pathname.startsWith('/api/pncp/ingest') ||
    pathname.startsWith('/api/pncp/scores') ||
    pathname.startsWith('/api/pncp/scrape') ||
    pathname.startsWith('/api/email/track') ||
    pathname.startsWith('/api/email/queue/process') ||
    pathname.startsWith('/api/cron/trial-expiring') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/plans') ||
    pathname.startsWith('/api/signup') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/app')
  ) {
    return NextResponse.next();
  }

  // Cria um response mutável para que o Supabase possa escrever cookies de
  // refresh de token de volta ao browser. Sem isso, setAll() é no-op e sessões
  // com access token expirado aparecem como não autenticadas.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          // Propaga os cookies atualizados tanto no request quanto na response
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valida o JWT com o servidor e renova via refresh token se necessário
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔐 sem sessão válida
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 🔒 modo demo — bloqueia escrita
  const isWriteMethod = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method);
  if (isWriteMethod && user.user_metadata?.is_demo === true) {
    return NextResponse.json(
      { error: 'Modo demonstração — escrita desabilitada.' },
      { status: 403 }
    );
  }

  // 🔐 rotas admin → exige platform_admin
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

  // Retorna o response com os cookies de sessão atualizados
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
