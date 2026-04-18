import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Schema de validación para crear location
const createLocationSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  type: z.enum(['WAREHOUSE', 'RESTAURANT']),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  postalCode: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
});

// GET /api/locations - Listar locations del negocio
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const active = searchParams.get('active');

    const where: any = { businessId };
    if (type) where.type = type;
    if (active !== null) where.isActive = active === 'true';

    const locations = await prisma.location.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            inventory: true,
            tables: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: locations }, { status: 200 });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Error al obtener sedes' },
      { status: 500 }
    );
  }
}

// POST /api/locations - Crear location
export async function POST(request: NextRequest) {
  try {
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

    // Check maxRestaurants limit
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const validated = createLocationSchema.parse(body);

    if (validated.type === 'RESTAURANT') {
      const currentCount = await prisma.location.count({
        where: { businessId, type: 'RESTAURANT', isActive: true },
      });
      if (currentCount >= business.maxRestaurants) {
        return NextResponse.json(
          { error: `Limite de ${business.maxRestaurants} locales alcanzado. Actualiza tu plan.` },
          { status: 400 }
        );
      }
    }

    const location = await prisma.location.create({
      data: {
        businessId,
        name: validated.name,
        type: validated.type,
        ...(validated.address && { address: validated.address }),
        ...(validated.city && { city: validated.city }),
        ...(validated.postalCode && { postalCode: validated.postalCode }),
        ...(validated.phone && { phone: validated.phone }),
        ...(validated.email && { email: validated.email }),
      },
    });

    return NextResponse.json({ data: location }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating location:', error);
    return NextResponse.json(
      { error: 'Error al crear sede' },
      { status: 500 }
    );
  }
}