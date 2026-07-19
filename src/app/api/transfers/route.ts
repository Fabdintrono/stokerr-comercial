import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const createTransferSchema = z.object({
  fromLocationId: z.string(),
  toLocationId: z.string(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().positive(),
  })).min(1),
});

// GET /api/transfers - List transfers for the business
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) {
      return NextResponse.json({ error: 'No hay negocio seleccionado' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const locations = await prisma.location.findMany({
      where: { businessId },
      select: { id: true },
    });
    const locationIds = locations.map((l) => l.id);

    const where: any = {
      OR: [
        { fromLocationId: { in: locationIds } },
        { toLocationId: { in: locationIds } },
      ],
    };
    if (status) where.status = status;

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        fromLocation: { select: { id: true, name: true, type: true } },
        toLocation: { select: { id: true, name: true, type: true } },
        lineItems: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ transfers });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json({ error: 'Error al obtener transferencias' }, { status: 500 });
  }
}

// POST /api/transfers - Create a transfer and deduct stock from origin
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) {
      return NextResponse.json({ error: 'No hay negocio seleccionado' }, { status: 400 });
    }

    const body = await request.json();
    const data = createTransferSchema.parse(body);

    if (data.fromLocationId === data.toLocationId) {
      return NextResponse.json({ error: 'Origen y destino no pueden ser iguales' }, { status: 400 });
    }

    // Verify both locations belong to the business
    const [fromLoc, toLoc] = await Promise.all([
      prisma.location.findFirst({ where: { id: data.fromLocationId, businessId, isActive: true } }),
      prisma.location.findFirst({ where: { id: data.toLocationId, businessId, isActive: true } }),
    ]);

    if (!fromLoc || !toLoc) {
      return NextResponse.json({ error: 'Ubicacion no encontrada' }, { status: 404 });
    }

    // Generate reference
    const count = await prisma.transfer.count({
      where: {
        fromLocationId: { in: (await prisma.location.findMany({ where: { businessId }, select: { id: true } })).map(l => l.id) },
      },
    });
    const reference = `TRF-${String(count + 1).padStart(4, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          reference,
          status: 'PENDING',
          notes: data.notes,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          lineItems: {
            create: data.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          fromLocation: { select: { id: true, name: true, type: true } },
          toLocation: { select: { id: true, name: true, type: true } },
          lineItems: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true } },
            },
          },
        },
      });

      return transfer;
    });

    // If destination is a RESTAURANT, notify them
    if (toLoc.type === 'RESTAURANT') {
      await prisma.notification.create({
        data: {
          type: 'TRANSFER_INCOMING',
          title: 'Nueva transferencia entrante',
          message: `${fromLoc.name} envió ${data.items.length} producto(s) — ref: ${result.reference}`,
          businessId,
          locationId: data.toLocationId,
          entityId: result.id,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ transfer: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating transfer:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear transferencia' }, { status: 500 });
  }
}
