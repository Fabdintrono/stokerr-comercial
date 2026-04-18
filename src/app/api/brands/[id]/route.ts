import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const updateBrandSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) return NextResponse.json({ error: 'No hay negocio seleccionado' }, { status: 400 });

    const existing = await prisma.brand.findFirst({ where: { id, businessId } });
    if (!existing) return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 });

    const body = await request.json();
    const data = updateBrandSchema.parse(body);
    const brand = await prisma.brand.update({ where: { id }, data });

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Error updating brand:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    return NextResponse.json({ error: 'Error al actualizar marca' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) return NextResponse.json({ error: 'No hay negocio seleccionado' }, { status: 400 });

    const existing = await prisma.brand.findFirst({ where: { id, businessId } });
    if (!existing) return NextResponse.json({ error: 'Marca no encontrada' }, { status: 404 });

    await prisma.brand.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json({ error: 'Error al eliminar marca' }, { status: 500 });
  }
}
