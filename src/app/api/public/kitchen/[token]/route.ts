import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/kitchen/[token] — no auth, returns active orders for kitchen display
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const location = await prisma.location.findUnique({
      where: { kitchenToken: token },
      select: { id: true, name: true, businessId: true, isActive: true },
    });

    if (!location || !location.isActive) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: {
        locationId: location.id,
        status: { in: ['OPEN', 'PREPARING'] },
      },
      select: {
        id: true,
        number: true,
        status: true,
        notes: true,
        createdAt: true,
        table: { select: { number: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      locationName: location.name,
      orders,
    });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
