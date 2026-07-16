import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { normalizeLocale } from '@/lib/i18n/normalizeLocale';

const updatePreferencesSchema = z.object({
  language: z.string().optional(),
});

// PATCH /api/users/preferences - Actualizar preferencias del usuario
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = updatePreferencesSchema.parse(body);

    const language = data.language ? normalizeLocale(data.language) : undefined;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(language && { language }),
      },
      select: { id: true, name: true, email: true, language: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating preferences:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar preferencias' },
      { status: 500 }
    );
  }
}