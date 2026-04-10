import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const createBusinessSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']).optional(),
});

// GET /api/business - Listar negocios del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Si es SUPER_ADMIN, ver todos los negocios
    if (session.user.role === 'SUPER_ADMIN') {
      const businesses = await prisma.business.findMany({
        include: {
          locations: {
            select: {
              id: true,
              name: true,
              type: true,
              slug: true,
            },
          },
          users: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ businesses });
    }

    // Si es usuario normal, ver solo sus negocios
    const userBusinesses = await prisma.userBusiness.findMany({
      where: { userId: session.user.id },
      include: {
        business: {
          include: {
            locations: {
              select: {
                id: true,
                name: true,
                type: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const businesses = userBusinesses.map((ub) => ({
      ...ub.business,
      role: ub.role,
    }));

    return NextResponse.json({ businesses });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Error al obtener negocios' },
      { status: 500 }
    );
  }
}

// POST /api/business - Crear nuevo negocio (solo SUPER_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo SUPER_ADMIN puede crear negocios
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos para crear negocios' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createBusinessSchema.parse(body);

    // Verificar que el slug no existe
    const existing = await prisma.business.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'El slug ya está en uso' },
        { status: 400 }
      );
    }

    const business = await prisma.business.create({
      data: {
        name: data.name,
        slug: data.slug,
        plan: data.plan || 'STARTER',
      },
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    console.error('Error creating business:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear negocio' },
      { status: 500 }
    );
  }
}