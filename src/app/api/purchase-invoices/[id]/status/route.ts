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

    const businessId = request.cookies.get('businessId')?.value;
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'No hay negocio seleccionado' },
        { status: 400 }
      );
    }

    // Verificar que la factura pertenece al negocio
    const existing = await prisma.purchaseInvoice.findFirst({
      where: {
        id,
        OR: [
          { location: { businessId } },
          { supplier: { businessId } },
        ],
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

    const invoice = await prisma.purchaseInvoice.update({
      where: { id },
      data: {
        status: data.status,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            vatNumber: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        lineItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
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