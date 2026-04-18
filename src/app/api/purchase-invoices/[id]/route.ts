import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const updateInvoiceSchema = z.object({
  number: z.string().min(1).max(50).optional(),
  supplierId: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/purchase-invoices/[id] - Detalle con items
export async function GET(
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

    // Try to get businessId from header first, then from cookies
    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'No hay negocio seleccionado' },
        { status: 400 }
      );
    }

    const invoice = await prisma.purchaseInvoice.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            vatNumber: true,
            email: true,
            phone: true,
            address: true,
            city: true,
          },
        },
        lineItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Factura de compra no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Error fetching purchase invoice:', error);
    return NextResponse.json(
      { error: 'Error al obtener factura de compra' },
      { status: 500 }
    );
  }
}

// PATCH /api/purchase-invoices/[id] - Actualizar factura
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

    // Try to get businessId from header first, then from cookies
    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    
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
        businessId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateInvoiceSchema.parse(body);

    const invoice = await prisma.purchaseInvoice.update({
      where: { id },
      data,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            vatNumber: true,
            email: true,
            phone: true,
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
    console.error('Error updating purchase invoice:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar factura' },
      { status: 500 }
    );
  }
}

// DELETE /api/purchase-invoices/[id] - Eliminar factura
export async function DELETE(
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

    // Try to get businessId from header first, then from cookies
    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    
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
        businessId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la factura
    await prisma.purchaseInvoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting purchase invoice:', error);
    return NextResponse.json(
      { error: 'Error al eliminar factura' },
      { status: 500 }
    );
  }
}
