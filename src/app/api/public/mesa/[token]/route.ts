import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard';

// GET /api/public/mesa/[token] — no auth, returns current open order for a table
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const table = await prisma.table.findUnique({
      where: { qrToken: token },
      select: {
        id: true,
        number: true,
        isActive: true,
        location: { select: { name: true, isActive: true, businessId: true } },
      },
    });

    if (!table || !table.isActive || !table.location.isActive) {
      return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
    }

    try {
      await requireModule(prisma, table.location.businessId, 'RESTAURANT');
    } catch (e) {
      if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'not found' }, { status: 404 });
      throw e;
    }

    const order = await prisma.order.findFirst({
      where: {
        tableId: table.id,
        status: { in: ['OPEN', 'PREPARING', 'SERVED'] },
      },
      select: {
        id: true,
        number: true,
        status: true,
        notes: true,
        totalAmount: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute totals without IVA (items are pre-IVA)
    const subtotal = order
      ? order.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
      : 0;
    const iva = subtotal * 0.23;
    const total = subtotal + iva;

    return NextResponse.json({
      tableNumber: table.number,
      locationName: table.location.name,
      order: order
        ? {
            number: order.number,
            status: order.status,
            notes: order.notes,
            createdAt: order.createdAt,
            items: order.items.map(i => ({
              name: i.product.name,
              quantity: i.quantity,
              unitPrice: Number(i.unitPrice),
              total: Number(i.unitPrice) * i.quantity,
            })),
            subtotal,
            iva,
            total,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
