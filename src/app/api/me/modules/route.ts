import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { getEnabledModules } from '@/lib/modules/guard';

// GET /api/me/modules - Effective modules for the current tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) {
      return NextResponse.json({ modules: [] });
    }

    const enabled = await getEnabledModules(prisma, businessId);
    return NextResponse.json({ modules: Array.from(enabled) });
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json({ error: 'Error al obtener módulos' }, { status: 500 });
  }
}
