import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const updateInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'RECEIVED', 'PAID', 'CANCELLED']),
});

// PATCH /api/purchase-invoices/[id]/status - Cambiar estado
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;

    if (!businessId) {
      return NextResponse.json(
        { error: 'No hay negocio seleccionado' },
        { status: 400 }
      );
    }

    const existing = await prisma.purchaseInvoice.findFirst({
      where: { id, businessId },
      include: {
        lineItems: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Factura de compra no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateInvoiceStatusSchema.parse(body);

    // Only update inventory when transitioning TO RECEIVED (not already received/paid)
    const shouldUpdateInventory =
      data.status === 'RECEIVED' &&
      existing.status !== 'RECEIVED' &&
      existing.status !== 'PAID';

    const invoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseInvoice.update({
        where: { id },
        data: { status: data.status },
        include: {
          supplier: { select: { id: true, name: true, vatNumber: true } },
          lineItems: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
      });

      if (shouldUpdateInventory) {
        // Find warehouse location for this business
        const warehouseLocation = await tx.location.findFirst({
          where: { businessId, type: 'WAREHOUSE', isActive: true },
          select: { id: true },
        });
        const locationId = warehouseLocation?.id;

        if (locationId) {
          for (const item of existing.lineItems) {
            const inv = await tx.inventory.findUnique({
              where: { productId_locationId: { productId: item.productId, locationId } },
            });

            if (inv) {
              await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: inv.quantity + item.quantity },
              });
              await tx.inventoryMovement.create({
                data: {
                  productId: item.productId,
                  locationId,
                  inventoryId: inv.id,
                  type: 'IN',
                  quantity: item.quantity,
                  reason: `Factura de compra #${existing.number}`,
                  userId: session.user.id,
                },
              });
            } else {
              const newInv = await tx.inventory.create({
                data: { productId: item.productId, locationId, quantity: item.quantity },
              });
              await tx.inventoryMovement.create({
                data: {
                  productId: item.productId,
                  locationId,
                  inventoryId: newInv.id,
                  type: 'IN',
                  quantity: item.quantity,
                  reason: `Factura de compra #${existing.number}`,
                  userId: session.user.id,
                },
              });
            }
          }
        }
      }

      return updated;
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error updating purchase invoice status:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar estado de factura de compra' },
      { status: 500 }
    );
  }
}
