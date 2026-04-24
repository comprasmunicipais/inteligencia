import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Rota pública — auto-login do usuário demo.
// Usa createClient() (com cookie handlers) para que a sessão seja gravada
// no browser. createAdminClient() não tem cookie handlers e não estabelece
// sessão para o cliente.
export async function GET(request: Request) {
  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Demo não configurado.' },
      { status: 503 }
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: 'Falha ao iniciar sessão demo.' },
      { status: 500 }
    );
  }

  const requestUrl = new URL(request.url);

  return NextResponse.redirect(
    new URL('/dashboard', requestUrl.origin)
  );
}
