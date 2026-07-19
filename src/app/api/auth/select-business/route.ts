import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { secureCookies } from '@/lib/auth/secureCookies';
import { z } from 'zod';

const selectBusinessSchema = z.object({
  businessId: z.string(),
});

// POST /api/auth/select-business - Seleccionar negocio activo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { businessId } = selectBusinessSchema.parse(body);

    // Verificar que el usuario tiene acceso al negocio
    const userBusiness = await prisma.userBusiness.findFirst({
      where: {
        userId: session.user.id,
        businessId,
      },
      include: {
        business: {
          include: {
            locations: true,
          },
        },
      },
    });

    if (!userBusiness) {
      return NextResponse.json(
        { error: 'No tienes acceso a este negocio' },
        { status: 403 }
      );
    }

    // Crear respuesta con cookie
    const response = NextResponse.json({
      business: {
        id: userBusiness.business.id,
        name: userBusiness.business.name,
        slug: userBusiness.business.slug,
        plan: userBusiness.business.plan,
        role: userBusiness.role,
        locations: userBusiness.business.locations,
      },
    });

    // Guardar businessId en cookie
    response.cookies.set('businessId', businessId, {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });

    return response;
  } catch (error) {
    console.error('Error selecting business:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al seleccionar negocio' },
      { status: 500 }
    );
  }
}