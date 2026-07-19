import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { adjustStock } from '@/lib/inventory/adjustStock';

const createMovementSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  locationId: z.string(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']),
  quantity: z.number(),
  reason: z.string().optional(),
});

// POST /api/inventory/movement - Registrar movimiento de inventario
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const data = createMovementSchema.parse(body);

    // Verificar que el producto pertenece al negocio
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        businessId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que la location pertenece al negocio
    const location = await prisma.location.findFirst({
      where: {
        id: data.locationId,
        businessId,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Ubicación no encontrada' },
        { status: 404 }
      );
    }

    // Crear movimiento y actualizar inventario en transacción
    await prisma.$transaction(async (tx) => {
      if (data.type === 'ADJUSTMENT') {
        if (data.variantId) {
          const row = await tx.variantInventory.findUnique({ where: { variantId_locationId: { variantId: data.variantId, locationId: data.locationId } } });
          if (row) await tx.variantInventory.update({ where: { id: row.id }, data: { quantity: data.quantity } });
          else await tx.variantInventory.create({ data: { variantId: data.variantId, locationId: data.locationId, quantity: data.quantity } });
          await tx.inventoryMovement.create({ data: { productId: data.productId, variantId: data.variantId, locationId: data.locationId, userId: session.user.id, type: 'ADJUSTMENT', quantity: data.quantity, reason: data.reason ?? null } });
        } else {
          const row = await tx.inventory.findUnique({ where: { productId_locationId: { productId: data.productId, locationId: data.locationId } } });
          let inventoryId: string | null = null;
          if (row) { inventoryId = row.id; await tx.inventory.update({ where: { id: row.id }, data: { quantity: data.quantity } }); }
          else { const c = await tx.inventory.create({ data: { productId: data.productId, locationId: data.locationId, quantity: data.quantity } }); inventoryId = c.id; }
          await tx.inventoryMovement.create({ data: { productId: data.productId, locationId: data.locationId, userId: session.user.id, type: 'ADJUSTMENT', quantity: data.quantity, reason: data.reason ?? null, inventoryId } });
        }
      } else {
        const delta = data.type === 'IN' ? data.quantity : -data.quantity;
        await adjustStock(tx, {
          productId: data.productId,
          variantId: data.variantId ?? null,
          locationId: data.locationId,
          delta,
          type: data.type,
          userId: session.user.id,
          reason: data.reason,
        });
      }
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating movement:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al registrar movimiento' },
      { status: 500 }
    );
  }
}

// GET /api/inventory/movement - Obtener historial de movimientos
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Obtener locations del negocio
    const locations = await prisma.location.findMany({
      where: { businessId, isActive: true },
      select: { id: true },
    });

    const locationIds = locations.map((l) => l.id);

    const where: any = {
      locationId: { in: locationIds },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    if (productId) {
      where.productId = productId;
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true, unit: true },
        },
        location: {
          select: { id: true, name: true, type: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Transformar para facilitar el uso en frontend
    const formattedMovements = movements.map((m) => ({
      id: m.id,
      productId: m.productId,
      locationId: m.locationId,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      userId: m.userId,
      createdAt: m.createdAt,
      product: m.product,
      location: m.location,
      user: m.user,
    }));

    return NextResponse.json({ movements: formattedMovements });
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json(
      { error: 'Error al obtener movimientos' },
      { status: 500 }
    );
  }
}