import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard';

const createTableSchema = z.object({
  number: z.string().min(1),
  capacity: z.number().int().min(1).default(4),
  locationId: z.string(),
});

// GET /api/tables - List tables for a location
export async function GET(request: NextRequest) {
  try {
    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (businessId) {
      try {
        await requireModule(prisma, businessId, 'RESTAURANT');
      } catch (e) {
        if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 });
        throw e;
      }
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json({ error: 'locationId requerido' }, { status: 400 });
    }

    const tables = await prisma.table.findMany({
      where: { locationId, isActive: true },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'PREPARING', 'SERVED'] } },
          select: { id: true, number: true, status: true, totalAmount: true },
        },
      },
      orderBy: { number: 'asc' },
    });

    return NextResponse.json({ data: tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Error al obtener mesas' }, { status: 500 });
  }
}

// POST /api/tables - Create table
export async function POST(request: NextRequest) {
  try {
    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (businessId) {
      try {
        await requireModule(prisma, businessId, 'RESTAURANT');
      } catch (e) {
        if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 });
        throw e;
      }
    }

    const body = await request.json();
    const validated = createTableSchema.parse(body);

    // Check duplicate number at location
    const existing = await prisma.table.findFirst({
      where: { number: validated.number, locationId: validated.locationId, isActive: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una mesa con ese número' }, { status: 400 });
    }

    const table = await prisma.table.create({
      data: validated,
    });

    return NextResponse.json({ data: table }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    console.error('Error creating table:', error);
    return NextResponse.json({ error: 'Error al crear mesa' }, { status: 500 });
  }
}
