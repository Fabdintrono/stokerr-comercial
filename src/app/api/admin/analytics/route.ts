import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // --- Business counts ---
    const [totalBusinesses, activeBusinesses, newThisMonth, newLastMonth] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { active: true } }),
      prisma.business.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.business.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    ]);

    // --- Plan distribution ---
    const businesses = await prisma.business.findMany({
      select: { plan: true, active: true, maxUsers: true, maxRestaurants: true },
    });
    const byPlan = { STARTER: 0, GROWTH: 0, ENTERPRISE: 0 };
    for (const b of businesses) byPlan[b.plan as keyof typeof byPlan]++;

    // --- MRR ---
    const planPrices = { STARTER: 19.90, GROWTH: 49.90, ENTERPRISE: 199.00 };
    const mrr = businesses
      .filter(b => b.active)
      .reduce((sum, b) => sum + planPrices[b.plan as keyof typeof planPrices], 0);

    // --- Users & locations ---
    const [totalUsers, totalLocations] = await Promise.all([
      prisma.user.count({ where: { active: true } }),
      prisma.location.count({ where: { isActive: true } }),
    ]);

    // --- Top businesses by locations ---
    const topByLocations = await prisma.business.findMany({
      where: { active: true },
      select: {
        id: true, name: true, plan: true,
        _count: { select: { locations: true, users: true } },
      },
      orderBy: { locations: { _count: 'desc' } },
      take: 5,
    });

    // --- Growth by month (last 6 months) ---
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = await prisma.business.count({
        where: { createdAt: { gte: start, lte: end } },
      });
      monthlyGrowth.push({
        month: start.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' }),
        clients: count,
        mrr: count * planPrices.STARTER, // simplified estimate
      });
    }

    // --- Orders & transfers in platform ---
    const [totalOrders, totalTransfers, paidOrders] = await Promise.all([
      prisma.order.count(),
      prisma.transfer.count(),
      prisma.order.findMany({
        where: { status: 'PAID' },
        select: { totalAmount: true },
      }),
    ]);
    const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

    return NextResponse.json({
      data: {
        summary: {
          totalBusinesses,
          activeBusinesses,
          inactiveBusinesses: totalBusinesses - activeBusinesses,
          newThisMonth,
          growthVsLastMonth: newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : null,
          mrr: Math.round(mrr * 100) / 100,
          totalUsers,
          totalLocations,
        },
        byPlan,
        topByLocations: topByLocations.map(b => ({
          id: b.id,
          name: b.name,
          plan: b.plan,
          locations: b._count.locations,
          users: b._count.users,
        })),
        monthlyGrowth,
        platform: {
          totalOrders,
          totalTransfers,
          totalRevenueProcessed: Math.round(totalRevenue * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Error al obtener analytics' }, { status: 500 });
  }
}
