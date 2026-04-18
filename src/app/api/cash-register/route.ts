import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const openSchema = z.object({
  locationId: z.string(),
  userId: z.string(),
  openingBalance: z.number().min(0).default(0),
});

const closeSchema = z.object({
  id: z.string(),
  closingBalance: z.number().min(0),
});

// GET /api/cash-register - Get current open register or history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const userId = searchParams.get('userId');
    const current = searchParams.get('current');

    if (!locationId) {
      return NextResponse.json({ error: 'locationId requerido' }, { status: 400 });
    }

    // Get current open register
    if (current === 'true') {
      const register = await prisma.cashRegister.findFirst({
        where: {
          locationId,
          closedAt: null,
          ...(userId ? { userId } : {}),
        },
        include: {
          user: { select: { name: true } },
        },
      });
      return NextResponse.json({ data: register });
    }

    // History
    const registers = await prisma.cashRegister.findMany({
      where: { locationId },
      include: { user: { select: { name: true } } },
      orderBy: { openedAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({ data: registers });
  } catch (error) {
    console.error('Error fetching cash register:', error);
    return NextResponse.json({ error: 'Error al obtener caja' }, { status: 500 });
  }
}

// POST /api/cash-register - Open register
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = openSchema.parse(body);

    // Check if there's already an open register
    const existing = await prisma.cashRegister.findFirst({
      where: { locationId: validated.locationId, closedAt: null },
    });
    if (existing) {
      return NextResponse.json({ error: 'Ya hay una caja abierta en este local' }, { status: 400 });
    }

    const register = await prisma.cashRegister.create({
      data: {
        locationId: validated.locationId,
        userId: validated.userId,
        openingBalance: validated.openingBalance,
      },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json({ data: register }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    console.error('Error opening cash register:', error);
    return NextResponse.json({ error: 'Error al abrir caja' }, { status: 500 });
  }
}

// PATCH /api/cash-register - Close register
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = closeSchema.parse(body);

    const register = await prisma.cashRegister.findUnique({
      where: { id: validated.id },
    });
    if (!register) {
      return NextResponse.json({ error: 'Caja no encontrada' }, { status: 404 });
    }
    if (register.closedAt) {
      return NextResponse.json({ error: 'La caja ya está cerrada' }, { status: 400 });
    }

    // Calculate total sales from paid orders since register opened
    const paidOrders = await prisma.order.findMany({
      where: {
        locationId: register.locationId,
        status: 'PAID',
        createdAt: { gte: register.openedAt },
      },
      select: { totalAmount: true },
    });
    const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const updated = await prisma.cashRegister.update({
      where: { id: validated.id },
      data: {
        closedAt: new Date(),
        closingBalance: validated.closingBalance,
        totalSales,
      },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    console.error('Error closing cash register:', error);
    return NextResponse.json({ error: 'Error al cerrar caja' }, { status: 500 });
  }
}
