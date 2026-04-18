import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: { select: { number: true } },
        user: { select: { name: true } },
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Error al obtener pedido' }, { status: 500 });
  }
}

const addItemSchema = z.object({
  action: z.literal('add_items'),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0),
  })),
});

const updateNoteSchema = z.object({
  action: z.literal('update_note'),
  notes: z.string(),
});

const updateStatusSchema = z.object({
  action: z.enum(['update_status', 'pay']),
  status: z.string().optional(),
  payments: z.array(z.object({
    amount: z.number().min(0.01),
    method: z.enum(['CASH', 'CARD', 'MBWAY', 'TRANSFER']),
  })).optional(),
});

// PATCH /api/orders/[id] - Update order (add items, change status, pay)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Update note
    if (body.action === 'update_note') {
      const validated = updateNoteSchema.parse(body);
      const updated = await prisma.order.update({
        where: { id },
        data: { notes: validated.notes },
        select: { id: true, notes: true },
      });
      return NextResponse.json({ data: updated });
    }

    // Add items
    if (body.action === 'add_items') {
      const validated = addItemSchema.parse(body);
      const newItemsTotal = validated.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice, 0
      );

      const updated = await prisma.$transaction(async (tx) => {
        await tx.orderItem.createMany({
          data: validated.items.map((item) => ({
            orderId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        });

        return tx.order.update({
          where: { id },
          data: { totalAmount: { increment: newItemsTotal } },
          include: {
            table: { select: { number: true } },
            items: { include: { product: { select: { name: true } } } },
            payments: true,
          },
        });
      });

      return NextResponse.json({ data: updated });
    }

    // Pay order
    if (body.action === 'pay') {
      const validated = updateStatusSchema.parse(body);
      if (!validated.payments?.length) {
        return NextResponse.json({ error: 'Se requieren pagos' }, { status: 400 });
      }

      const totalPaid = validated.payments.reduce((sum, p) => sum + p.amount, 0);

      const updated = await prisma.$transaction(async (tx) => {
        await tx.payment.createMany({
          data: validated.payments!.map((p) => ({
            orderId: id,
            amount: p.amount,
            method: p.method,
          })),
        });

        return tx.order.update({
          where: { id },
          data: { status: 'PAID' },
          include: {
            table: { select: { number: true } },
            items: { include: { product: { select: { name: true } } } },
            payments: true,
          },
        });
      });

      return NextResponse.json({ data: updated });
    }

    // Update status
    if (body.action === 'update_status' && body.status) {
      const updated = await prisma.order.update({
        where: { id },
        data: { status: body.status },
        include: {
          table: { select: { number: true } },
          items: { include: { product: { select: { name: true } } } },
          payments: true,
        },
      });
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 });
  }
}

// DELETE /api/orders/[id] - Cancel order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (order.status === 'PAID') {
      return NextResponse.json({ error: 'No se puede cancelar un pedido pagado' }, { status: 400 });
    }

    await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ message: 'Pedido cancelado' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json({ error: 'Error al cancelar pedido' }, { status: 500 });
  }
}
