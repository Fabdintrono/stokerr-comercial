import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validación para actualizar location
const updateLocationSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  postalCode: z.string().min(4).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  active: z.boolean().optional(),
});

// GET /api/locations/[id] - Obtener location por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        inventory: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
              },
            },
          },
          take: 50,
        },
        tables: {
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Sede no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: location }, { status: 200 });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: 'Error al obtener sede' },
      { status: 500 }
    );
  }
}

// PUT /api/locations/[id] - Actualizar location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateLocationSchema.parse(body);

    // Verificar si la location existe
    const existingLocation = await prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Sede no encontrada' },
        { status: 404 }
      );
    }

    const location = await prisma.location.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ data: location }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Error al actualizar sede' },
      { status: 500 }
    );
  }
}

// DELETE /api/locations/[id] - Eliminar location (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verificar si la location existe
    const existingLocation = await prisma.location.findUnique({
      where: { id },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Sede no encontrada' },
        { status: 404 }
      );
    }

    // Soft delete: desactivar location
    await prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(
      { message: 'Sede desactivada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Error al desactivar sede' },
      { status: 500 }
    );
  }
}