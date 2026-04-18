import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/public/kitchen/[token]/order/[orderId] — mark order as PREPARING or SERVED
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; orderId: string }> }
) {
  try {
    const { token, orderId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['PREPARING', 'SERVED'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    // Verify location via kitchenToken
    const location = await prisma.location.findUnique({
      where: { kitchenToken: token },
      select: { id: true, isActive: true, businessId: true },
    });

    if (!location || !location.isActive) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        locationId: true,
        status: true,
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    });

    if (!order || order.locationId !== location.id) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (order.status === 'PAID' || order.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Pedido ya cerrado' }, { status: 400 });
    }

    // When marking SERVED: deduct ingredients from inventory based on recipes
    if (status === 'SERVED') {
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({ where: { id: orderId }, data: { status } });

        // For each ordered product, check if it has a recipe
        for (const orderItem of order.items) {
          const recipe = await tx.recipe.findUnique({
            where: { productId: orderItem.productId },
            include: { items: true },
          });

          if (!recipe || !recipe.isActive) continue;

          // Deduct each ingredient from inventory
          for (const ingredient of recipe.items) {
            const totalQty = ingredient.quantity * orderItem.quantity;

            const inv = await tx.inventory.findUnique({
              where: {
                productId_locationId: {
                  productId: ingredient.productId,
                  locationId: location.id,
                },
              },
            });

            if (inv) {
              const newQty = Math.max(0, inv.quantity - totalQty);
              await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: newQty },
              });

              // Record movement
              await tx.inventoryMovement.create({
                data: {
                  productId: ingredient.productId,
                  locationId: location.id,
                  inventoryId: inv.id,
                  type: 'OUT',
                  quantity: totalQty,
                  reason: `Receta: ${recipe.name} (pedido ${orderId.slice(-6)})`,
                  // Use a system user — find the business owner as fallback
                  userId: await getBusinessUserId(tx, location.businessId),
                },
              });
            }
            // If no inventory record exists, skip (nothing to deduct)
          }
        }
      });
    } else {
      // PREPARING — just update status
      await prisma.order.update({ where: { id: orderId }, data: { status } });
    }

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('Kitchen order update error:', e);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// Get any active user from the business to attribute the system movement
async function getBusinessUserId(tx: any, businessId: string): Promise<string> {
  const ub = await tx.userBusiness.findFirst({
    where: { businessId },
    select: { userId: true },
  });
  return ub?.userId ?? '';
}
