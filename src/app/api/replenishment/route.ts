import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard';

const createSchema = z.object({
  toLocationId: z.string(),   // warehouse
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
  })).min(1),
});

// GET /api/replenishment
// RESTAURANT_MANAGER: sees requests from their location
// WAREHOUSE_MANAGER:  sees all requests targeting their locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 });

    if (businessId) {
      try {
        await requireModule(prisma, businessId, 'RESTAURANT');
      } catch (e) {
        if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 });
        throw e;
      }
    }

    const role = session.user.role as string;
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    let where: any = { businessId };

    if (role === 'RESTAURANT_MANAGER' && locationId) {
      where.fromLocationId = locationId;
    } else if (role === 'WAREHOUSE_MANAGER' && locationId) {
      where.toLocationId = locationId;
    }

    const requests = await prisma.replenishmentRequest.findMany({
      where,
      include: {
        fromLocation: { select: { id: true, name: true } },
        toLocation:   { select: { id: true, name: true } },
        requestedBy:  { select: { id: true, name: true } },
        reviewedBy:   { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, unit: true, sku: true, costPrice: true, vatRate: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al obtener solicitudes' }, { status: 500 });
  }
}

// POST /api/replenishment — restaurant creates a request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 });

    if (businessId) {
      try {
        await requireModule(prisma, businessId, 'RESTAURANT');
      } catch (e) {
        if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 });
        throw e;
      }
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    // fromLocationId comes from the request body (restaurant's locationId)
    const { fromLocationId } = body;
    if (!fromLocationId) return NextResponse.json({ error: 'Falta ubicación de origen' }, { status: 400 });

    const req = await prisma.replenishmentRequest.create({
      data: {
        businessId,
        fromLocationId,
        toLocationId: data.toLocationId,
        notes: data.notes,
        requestedById: session.user.id,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        fromLocation: { select: { id: true, name: true } },
        toLocation:   { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, unit: true } } },
        },
      },
    });

    // Notify warehouse
    await prisma.notification.create({
      data: {
        type: 'REPLENISHMENT_REQUEST',
        title: 'Nueva solicitud de reposición',
        message: `${req.fromLocation.name} solicitó ${data.items.length} producto(s)`,
        businessId,
        locationId: data.toLocationId,
        entityId: req.id,
      },
    }).catch(() => {}); // non-critical

    return NextResponse.json({ request: req }, { status: 201 });
  } catch (e) {
    console.error(e);
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: e.issues }, { status: 400 });
    return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 });
  }
}
