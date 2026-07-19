import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const createPurchaseInvoiceSchema = z.object({
  number: z.string().min(1).max(50),
  supplierId: z.string(),
  date: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  lineItems: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().min(0.01),
      unitPrice: z.number().min(0),
      vatRate: z.number().min(0).max(100), // Porcentaje
    })
  ).min(1, 'Debe tener al menos un item'),
});

// GET /api/purchase-invoices - Listar facturas de compra
export async function GET(request: NextRequest) {
  try {
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

    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        businessId,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            vatNumber: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching purchase invoices:', error);
    return NextResponse.json(
      { error: 'Error al obtener facturas de compra' },
      { status: 500 }
    );
  }
}

// POST /api/purchase-invoices - Crear factura de compra con items
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const data = createPurchaseInvoiceSchema.parse(body);

    // Verificar que el proveedor pertenece al negocio
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: data.supplierId,
        businessId,
        isActive: true,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado o no activo' },
        { status: 404 }
      );
    }

    // Verificar que todos los productos existen y pertenecen al negocio
    const productIds = data.lineItems.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Uno o más productos no encontrados o no activos' },
        { status: 400 }
      );
    }

    // Verificar que hay al menos una ubicación de almacén activa para el negocio
    const warehouseLocation = await prisma.location.findFirst({
      where: {
        businessId,
        type: 'WAREHOUSE',
        isActive: true,
      },
      select: { id: true },
    });

    let locationId: string | undefined;
    if (warehouseLocation) {
      locationId = warehouseLocation.id;
    } else {
      // Si no hay almacén, usar cualquier ubicación activa
      const anyLocation = await prisma.location.findFirst({
        where: {
          businessId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!anyLocation) {
        return NextResponse.json(
          { error: 'No hay ubicaciones activas para este negocio' },
          { status: 400 }
        );
      }
      locationId = anyLocation.id;
    }

    // Crear la factura y sus items en una transacción
    const invoice = await prisma.$transaction(async (tx) => {
      // Crear la factura de compra
      const purchaseInvoice = await tx.purchaseInvoice.create({
        data: {
          number: data.number,
          supplierId: data.supplierId,
          issueDate: data.date,
          dueDate: data.dueDate,
          notes: data.notes,
          businessId: businessId!,
        },
      });

      // Crear los items de la factura
      const lineItems = await tx.invoiceLineItem.createManyAndReturn({
        data: data.lineItems.map((item) => ({
          invoiceId: purchaseInvoice.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          totalAmount: item.quantity * item.unitPrice * (1 + item.vatRate / 100),
        })),
      });

      // Calcular totales de la factura
      const totalAmount = lineItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
      const totalVat = lineItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice) * Number(item.vatRate) / 100, 0);

      // Actualizar la factura con los totales calculados
      const updatedInvoice = await tx.purchaseInvoice.update({
        where: { id: purchaseInvoice.id },
        data: {
          totalAmount,
          totalVat,
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              vatNumber: true,
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

      return updatedInvoice;
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase invoice:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear factura de compra' },
      { status: 500 }
    );
  }
}