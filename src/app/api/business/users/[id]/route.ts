import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['WAREHOUSE_MANAGER', 'RESTAURANT_MANAGER', 'CASHIER']).optional(),
  businessRole: z.enum(['MANAGER', 'EMPLOYEE']).optional(),
  locationIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

// PATCH /api/business/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) {
      return NextResponse.json({ error: 'No hay negocio seleccionado' }, { status: 400 });
    }

    // Verify caller is OWNER/MANAGER
    const callerBusiness = await prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: session.user.id, businessId } },
    });
    if (!callerBusiness || (callerBusiness.role !== 'OWNER' && callerBusiness.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    // Verify target user belongs to this business
    const targetUB = await prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: id, businessId } },
    });
    if (!targetUB) {
      return NextResponse.json({ error: 'Usuario no encontrado en este negocio' }, { status: 404 });
    }

    // Can't edit OWNER
    if (targetUB.role === 'OWNER' && session.user.id !== id) {
      return NextResponse.json({ error: 'No puedes editar al propietario' }, { status: 403 });
    }

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      // Update user fields
      const userData: any = {};
      if (data.name) userData.name = data.name;
      if (data.phone !== undefined) userData.phone = data.phone || null;
      if (data.role) userData.role = data.role;
      if (data.active !== undefined) userData.active = data.active;
      if (data.password) userData.password = await bcrypt.hash(data.password, 10);

      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id }, data: userData });
      }

      // Update business role
      if (data.businessRole) {
        await tx.userBusiness.update({
          where: { userId_businessId: { userId: id, businessId } },
          data: { role: data.businessRole },
        });
      }

      // Update location assignments
      if (data.locationIds) {
        // Remove old assignments for this business's locations
        const bizLocations = await tx.location.findMany({
          where: { businessId },
          select: { id: true },
        });
        const bizLocationIds = bizLocations.map((l) => l.id);

        await tx.userLocation.deleteMany({
          where: { userId: id, locationId: { in: bizLocationIds } },
        });

        // Add new assignments
        for (const locationId of data.locationIds) {
          await tx.userLocation.create({
            data: { userId: id, locationId },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

// DELETE /api/business/users/[id] - Deactivate user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) {
      return NextResponse.json({ error: 'No hay negocio seleccionado' }, { status: 400 });
    }

    const targetUB = await prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: id, businessId } },
    });
    if (!targetUB) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    if (targetUB.role === 'OWNER') {
      return NextResponse.json({ error: 'No puedes desactivar al propietario' }, { status: 403 });
    }

    await prisma.user.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json({ error: 'Error al desactivar usuario' }, { status: 500 });
  }
}
