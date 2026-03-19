import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔓 LIBERA APIs públicas / cron
  if (
    pathname.startsWith('/api/pncp/sync')
  ) {
    return NextResponse.next();
  }

  // 🔒 restante protegido (exemplo)
  // aqui entra sua lógica atual de auth (se tiver)

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
