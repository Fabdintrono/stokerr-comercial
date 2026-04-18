import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

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
        // Deduct from warehouse (fromLocation)
        const fromInv = await tx.inventory.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: transfer.fromLocationId } },
        });
        if (fromInv) {
          await tx.inventory.update({
            where: { id: fromInv.id },
            data: { quantity: Math.max(0, fromInv.quantity - item.quantity) },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId: transfer.fromLocationId,
              inventoryId: fromInv.id,
              type: 'OUT',
              quantity: item.quantity,
              reason: `Transferencia ${transfer.reference} enviada a ${transfer.toLocation.name}`,
              userId: session.user.id,
            },
          });
        }

        // Add to restaurant (toLocation)
        const toInv = await tx.inventory.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: transfer.toLocationId } },
        });
        if (toInv) {
          await tx.inventory.update({
            where: { id: toInv.id },
            data: { quantity: toInv.quantity + item.quantity },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId: transfer.toLocationId,
              inventoryId: toInv.id,
              type: 'IN',
              quantity: item.quantity,
              reason: `Transferencia ${transfer.reference} recibida de ${transfer.fromLocation.name}`,
              userId: session.user.id,
            },
          });
        } else {
          const newInv = await tx.inventory.create({
            data: { productId: item.productId, locationId: transfer.toLocationId, quantity: item.quantity },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId: transfer.toLocationId,
              inventoryId: newInv.id,
              type: 'IN',
              quantity: item.quantity,
              reason: `Transferencia ${transfer.reference} recibida de ${transfer.fromLocation.name}`,
              userId: session.user.id,
            },
          });
        }
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
