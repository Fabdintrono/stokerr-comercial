import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/notifications — returns unread for caller's businessId + optional locationId
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) return NextResponse.json({ notifications: [] });

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    const where: any = { businessId };
    if (locationId) {
      where.OR = [{ locationId }, { locationId: null }];
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read (or specific ids)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) return NextResponse.json({ ok: true });

    const body = await request.json().catch(() => ({}));
    const ids: string[] = body.ids || [];

    if (ids.length > 0) {
      await prisma.notification.updateMany({ where: { id: { in: ids }, businessId }, data: { read: true } });
    } else {
      const locationId = body.locationId;
      const where: any = { businessId, read: false };
      if (locationId) where.OR = [{ locationId }, { locationId: null }];
      await prisma.notification.updateMany({ where, data: { read: true } });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
