import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Recent audit logs
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
        business: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Recent new businesses
    const recentBusinesses = await prisma.business.findMany({
      select: {
        id: true, name: true, plan: true, active: true, createdAt: true,
        users: {
          where: { role: 'OWNER' },
          select: { user: { select: { name: true, email: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Recent users
    const recentUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // System health counts
    const [activeUsers, inactiveBusinesses, pendingTransfers] = await Promise.all([
      prisma.user.count({ where: { active: true } }),
      prisma.business.count({ where: { active: false } }),
      prisma.transfer.count({ where: { status: 'PENDING' } }),
    ]);

    return NextResponse.json({
      data: {
        auditLogs: logs.map(l => ({
          id: l.id,
          action: l.action,
          entity: l.entity,
          entityId: l.entityId,
          user: l.user ? { name: l.user.name, email: l.user.email, role: l.user.role } : null,
          business: l.business?.name || null,
          createdAt: l.createdAt,
        })),
        recentBusinesses: recentBusinesses.map(b => ({
          id: b.id,
          name: b.name,
          plan: b.plan,
          active: b.active,
          createdAt: b.createdAt,
          owner: b.users[0]?.user || null,
        })),
        recentUsers: recentUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          createdAt: u.createdAt,
        })),
        health: { activeUsers, inactiveBusinesses, pendingTransfers },
      },
    });
  } catch (error) {
    console.error('Activity error:', error);
    return NextResponse.json({ error: 'Error al obtener actividad' }, { status: 500 });
  }
}
