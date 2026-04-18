import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/restaurant?locationId=&from=&to=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const from = searchParams.get('from'); // YYYY-MM-DD
    const to = searchParams.get('to');     // YYYY-MM-DD

    if (!locationId) {
      return NextResponse.json({ error: 'locationId requerido' }, { status: 400 });
    }

    const dateFrom = from ? new Date(from) : (() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; })();
    const dateTo = to ? (() => { const d = new Date(to); d.setHours(23,59,59,999); return d; })() : new Date();

    // All paid orders in range
    const orders = await prisma.order.findMany({
      where: {
        locationId,
        status: 'PAID',
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      include: {
        items: {
          include: { product: { select: { name: true, category: { select: { name: true } } } } },
        },
        payments: true,
        table: { select: { number: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // --- Sales by day ---
    const byDay: Record<string, { date: string; sales: number; orders: number }> = {};
    for (const order of orders) {
      const day = order.createdAt.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, sales: 0, orders: 0 };
      byDay[day].sales += Number(order.totalAmount);
      byDay[day].orders += 1;
    }

    // --- Sales by payment method ---
    const byMethod: Record<string, number> = { CASH: 0, CARD: 0, MBWAY: 0, TRANSFER: 0 };
    for (const order of orders) {
      for (const payment of order.payments) {
        byMethod[payment.method] = (byMethod[payment.method] || 0) + Number(payment.amount);
      }
    }

    // --- Sales by hour (0-23) ---
    const byHour: Record<number, number> = {};
    for (const order of orders) {
      const h = order.createdAt.getHours();
      byHour[h] = (byHour[h] || 0) + Number(order.totalAmount);
    }

    // --- Top products ---
    const productSales: Record<string, { name: string; category: string; qty: number; total: number }> = {};
    for (const order of orders) {
      for (const item of order.items) {
        const pid = item.productId;
        if (!productSales[pid]) {
          productSales[pid] = {
            name: item.product.name,
            category: item.product.category?.name || '—',
            qty: 0,
            total: 0,
          };
        }
        productSales[pid].qty += item.quantity;
        productSales[pid].total += Number(item.totalPrice);
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // --- Totals ---
    const totalSales = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    // --- Cash registers in range ---
    const registers = await prisma.cashRegister.findMany({
      where: {
        locationId,
        openedAt: { gte: dateFrom, lte: dateTo },
        closedAt: { not: null },
      },
      include: { user: { select: { name: true } } },
      orderBy: { openedAt: 'desc' },
    });

    return NextResponse.json({
      data: {
        summary: {
          totalSales: Math.round(totalSales * 100) / 100,
          totalOrders,
          avgTicket: Math.round(avgTicket * 100) / 100,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
        },
        byDay: Object.values(byDay),
        byMethod: Object.entries(byMethod).map(([method, amount]) => ({ method, amount })).filter(m => m.amount > 0),
        byHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, sales: byHour[h] || 0 })).filter(h => h.sales > 0),
        topProducts,
        registers: registers.map(r => ({
          id: r.id,
          openedAt: r.openedAt,
          closedAt: r.closedAt,
          openingBalance: Number(r.openingBalance),
          closingBalance: Number(r.closingBalance || 0),
          totalSales: Number(r.totalSales),
          user: r.user.name,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching restaurant report:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}
