import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { applyVerticalPreset } from '@/lib/modules/applyVerticalPreset';
import { VERTICALS } from '@/lib/modules/verticals';

const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  plan: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']).optional(),
  vertical: z.enum(VERTICALS as [string, ...string[]]).optional(),
  maxRestaurants: z.number().int().min(1).optional(),
  maxUsers: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
});

// GET /api/admin/clients/[id] - Get client details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true } },
          },
        },
        locations: true,
        _count: {
          select: { products: true, suppliers: true, invoices: true },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ client: business });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}

// PATCH /api/admin/clients/[id] - Update business
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateClientSchema.parse(body);

    const { vertical, ...rest } = data;

    const business = await prisma.business.update({
      where: { id },
      data: vertical ? { ...rest, vertical: vertical as any } : rest,
    });

    // Apply preset when vertical changes (additive — only enables, never disables)
    if (vertical) {
      await applyVerticalPreset(prisma, id, vertical as any);
    }

    return NextResponse.json({ client: business });
  } catch (error) {
    console.error('Error updating client:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE /api/admin/clients/[id] - Deactivate business
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const existing = await prisma.business.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Soft delete: deactivate business and all its users
    await prisma.$transaction(async (tx) => {
      await tx.business.update({ where: { id }, data: { active: false } });

      // Deactivate all users linked to this business
      const userBusinesses = await tx.userBusiness.findMany({
        where: { businessId: id },
        select: { userId: true },
      });

      for (const ub of userBusinesses) {
        // Only deactivate if user has no other active businesses
        const otherBusinesses = await tx.userBusiness.count({
          where: {
            userId: ub.userId,
            businessId: { not: id },
            business: { active: true },
          },
        });
        if (otherBusinesses === 0) {
          await tx.user.update({ where: { id: ub.userId }, data: { active: false } });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating client:', error);
    return NextResponse.json({ error: 'Error al desactivar cliente' }, { status: 500 });
  }
}
