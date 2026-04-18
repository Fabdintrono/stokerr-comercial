import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// PATCH /api/replenishment/[id] — approve or reject (warehouse manager)
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
    const { action, reviewNotes } = body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    }

    const repRequest = await prisma.replenishmentRequest.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        toLocation: true,
      },
    });

    if (!repRequest || repRequest.businessId !== businessId) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    if (repRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Solicitud ya procesada' }, { status: 400 });
    }

    if (action === 'reject') {
      const updated = await prisma.replenishmentRequest.update({
        where: { id },
        data: { status: 'REJECTED', reviewedById: session.user.id, reviewedAt: new Date(), reviewNotes },
      });
      await prisma.notification.create({
        data: {
          type: 'REPLENISHMENT_UPDATED',
          title: 'Solicitud rechazada',
          message: `Tu solicitud fue rechazada${reviewNotes ? `: ${reviewNotes}` : ''}`,
          businessId,
          locationId: repRequest.fromLocationId,
          entityId: id,
        },
      }).catch(() => {});
      return NextResponse.json({ request: updated });
    }

    // APPROVE: deduct from warehouse inventory + record movements
    await prisma.$transaction(async (tx) => {
      // Update request status
      await tx.replenishmentRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: session.user.id,
          reviewedAt: new Date(),
          reviewNotes,
        },
      });

      const warehouseLocationId = repRequest.toLocationId;
      const restaurantLocationId = repRequest.fromLocationId;

      for (const item of repRequest.items) {
        // Deduct from warehouse
        const warehouseInv = await tx.inventory.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: warehouseLocationId } },
        });

        if (warehouseInv) {
          const newQty = Math.max(0, warehouseInv.quantity - item.quantity);
          await tx.inventory.update({
            where: { id: warehouseInv.id },
            data: { quantity: newQty },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId: warehouseLocationId,
              inventoryId: warehouseInv.id,
              type: 'OUT',
              quantity: item.quantity,
              reason: `Reposición aprobada → ${repRequest.toLocation?.name || 'restaurante'} (solicitud ${id.slice(-6)})`,
              userId: session.user.id,
            },
          });
        }

        // Add to restaurant inventory (upsert)
        const restInv = await tx.inventory.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: restaurantLocationId } },
        });

        if (restInv) {
          await tx.inventory.update({
            where: { id: restInv.id },
            data: { quantity: restInv.quantity + item.quantity },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId: restaurantLocationId,
              inventoryId: restInv.id,
              type: 'IN',
              quantity: item.quantity,
              reason: `Reposición recibida desde depósito (solicitud ${id.slice(-6)})`,
              userId: session.user.id,
            },
          });
        } else {
          const newInv = await tx.inventory.create({
            data: {
              productId: item.productId,
              locationId: restaurantLocationId,
              quantity: item.quantity,
            },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              locationId: restaurantLocationId,
              inventoryId: newInv.id,
              type: 'IN',
              quantity: item.quantity,
              reason: `Reposición recibida desde depósito (solicitud ${id.slice(-6)})`,
              userId: session.user.id,
            },
          });
        }
      }
    });

    // Notify restaurant
    await prisma.notification.create({
      data: {
        type: 'REPLENISHMENT_UPDATED',
        title: 'Solicitud aprobada',
        message: `Tu solicitud de reposición fue aprobada`,
        businessId,
        locationId: repRequest.fromLocationId,
        entityId: id,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al procesar solicitud' }, { status: 500 });
  }
}
