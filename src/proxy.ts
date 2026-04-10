import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // 1. Permitir rutas públicas
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (token) {
      // Si ya está autenticado, redirigir según rol
      const role = token.role as string;
      return NextResponse.redirect(
        new URL(role === 'SUPER_ADMIN' ? '/clients' : '/select-business', req.url)
      );
    }
    return NextResponse.next();
  }

  // 2. Proteger rutas privadas (requieren autenticación)
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = token.role as string;

  // 3. Control de acceso para SUPER_ADMIN
  // Solo puede entrar a rutas que empiezan con las permitidas
  const isSuperAdminRoute = 
    pathname.startsWith('/clients') || 
    pathname.startsWith('/licenses') || 
    pathname.startsWith('/subscriptions') || 
    pathname.startsWith('/support') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/settings');

  if (role === 'SUPER_ADMIN') {
    if (!isSuperAdminRoute) {
      return NextResponse.redirect(new URL('/clients', req.url));
    }
    return NextResponse.next();
  }

  // 4. Bloquear acceso de usuarios normales a rutas de SUPER_ADMIN
  if (isSuperAdminRoute && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/select-business', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};