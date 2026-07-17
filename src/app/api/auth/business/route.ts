import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/auth/business - Obtener negocios del usuario logueado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener negocios del usuario
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
                kitchenToken: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    const businesses = userBusinesses.map((ub) => ({
      id: ub.business.id,
      name: ub.business.name,
      slug: ub.business.slug,
      plan: ub.business.plan,
      active: ub.business.active,
      vertical: ub.business.vertical,
      role: ub.role,
      locations: ub.business.locations,
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