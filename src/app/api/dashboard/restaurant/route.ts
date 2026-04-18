import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/dashboard/restaurant - Restaurant KPIs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json({ error: 'locationId requerido' }, { status: 400 });
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Today's orders
    const todayOrders = await prisma.order.findMany({
      where: {
        locationId,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
      select: { id: true, totalAmount: true, status: true },
    });

    const totalOrders = todayOrders.length;
    const paidOrders = todayOrders.filter(o => o.status === 'PAID');
    const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const avgTicket = paidOrders.length > 0 ? totalSales / paidOrders.length : 0;
    const openOrders = todayOrders.filter(o => o.status === 'OPEN' || o.status === 'PREPARING' || o.status === 'SERVED').length;

    // Tables
    const totalTables = await prisma.table.count({
      where: { locationId, isActive: true },
    });
    const occupiedTables = await prisma.table.count({
      where: {
        locationId,
        isActive: true,
        orders: { some: { status: { in: ['OPEN', 'PREPARING', 'SERVED'] } } },
      },
    });

    // Current cash register
    const cashRegister = await prisma.cashRegister.findFirst({
      where: { locationId, closedAt: null },
      select: { id: true, openedAt: true, openingBalance: true, user: { select: { name: true } } },
    });

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      where: { locationId, createdAt: { gte: startOfDay } },
      include: {
        table: { select: { number: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      data: {
        totalSales,
        totalOrders,
        openOrders,
        avgTicket: Math.round(avgTicket * 100) / 100,
        totalTables,
        occupiedTables,
        cashRegister,
        recentOrders: recentOrders.map(o => ({
          id: o.id,
          number: o.number,
          table: o.table?.number || 'Sin mesa',
          total: Number(o.totalAmount),
          status: o.status,
          user: o.user.name,
          time: o.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching restaurant dashboard:', error);
    return NextResponse.json({ error: 'Error al obtener dashboard' }, { status: 500 });
  }
}
