import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Schema de validación para crear location
const createLocationSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  type: z.enum(['WAREHOUSE', 'RESTAURANT']),
  address: z.string().min(5, 'Dirección requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  postalCode: z.string().min(4, 'Código postal requerido'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
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

    const businessId = request.cookies.get('businessId')?.value;
    
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
    if (active !== null) where.active = active === 'true';

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

    const businessId = request.cookies.get('businessId')?.value;
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'No hay negocio seleccionado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = createLocationSchema.parse(body);

    // Generar slug si no se proporciona
    const slug = validated.slug || validated.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const location = await prisma.location.create({
      data: {
        businessId,
        name: validated.name,
        slug,
        type: validated.type,
        address: validated.address,
        city: validated.city,
        postalCode: validated.postalCode,
        phone: validated.phone,
        email: validated.email,
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