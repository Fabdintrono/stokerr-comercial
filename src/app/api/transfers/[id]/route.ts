import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { adjustStock } from '@/lib/inventory/adjustStock';

// PATCH /api/transfers/[id] — accept or reject (by destination location)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 });

    const body = await request.json();
    const { action } = body; // 'accept' | 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        fromLocation: true,
        toLocation: true,
        lineItems: { include: { product: true } },
      },
    });

    if (!transfer) return NextResponse.json({ error: 'Transferencia no encontrada' }, { status: 404 });

    // Verify transfer belongs to this business
    const validLoc = await prisma.location.findFirst({
      where: { id: transfer.toLocationId, businessId },
    });
    if (!validLoc) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

    if (transfer.status !== 'PENDING') {
      return NextResponse.json({ error: 'Transferencia ya procesada' }, { status: 400 });
    }

    if (action === 'reject') {
      await prisma.transfer.update({ where: { id }, data: { status: 'REJECTED' } });
      return NextResponse.json({ ok: true });
    }

    // ACCEPT: deduct from source, add to destination, create movements
    await prisma.$transaction(async (tx) => {
      await tx.transfer.update({ where: { id }, data: { status: 'COMPLETED' } });

      for (const item of transfer.lineItems) {
        await adjustStock(tx, {
          productId: item.productId,
          variantId: item.variantId ?? null,
          locationId: transfer.fromLocationId,
          delta: -item.quantity,
          type: 'TRANSFER',
          userId: session.user.id,
        });
        await adjustStock(tx, {
          productId: item.productId,
          variantId: item.variantId ?? null,
          locationId: transfer.toLocationId,
          delta: item.quantity,
          type: 'IN',
          userId: session.user.id,
        });
      }

      // Mark transfer notification as read
      await tx.notification.updateMany({
        where: { entityId: id, type: 'TRANSFER_INCOMING' },
        data: { read: true },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al procesar transferencia' }, { status: 500 });
  }
}
