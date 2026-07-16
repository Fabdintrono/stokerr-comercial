import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { getEnabledModules } from '@/lib/modules/guard';

const overrideSchema = z.object({
  moduleKey: z.string().min(1),
  enabled: z.boolean(),
});

// GET /api/admin/clients/[id]/modules - Get overrides + effective modules (super admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    const [overrides, effective] = await Promise.all([
      prisma.tenantModule.findMany({ where: { businessId: id } }),
      getEnabledModules(prisma, id),
    ]);

    return NextResponse.json({ overrides, effective: Array.from(effective) });
  } catch (error) {
    console.error('Error fetching client modules:', error);
    return NextResponse.json({ error: 'Error al obtener módulos del cliente' }, { status: 500 });
  }
}

// PUT /api/admin/clients/[id]/modules - Set module override for client (super admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    const body = await request.json();
    const parseResult = overrideSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parseResult.error.issues }, { status: 422 });
    }

    const { moduleKey, enabled } = parseResult.data;

    // Verify the module exists in catalog
    const mod = await prisma.module.findUnique({ where: { key: moduleKey } });
    if (!mod) {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 });
    }

    const override = await prisma.tenantModule.upsert({
      where: { businessId_moduleKey: { businessId: id, moduleKey } },
      update: { enabled },
      create: {
        businessId: id,
        moduleKey,
        enabled,
        source: 'ADDON',
        priceAtActivation: mod.addOnPrice,
      },
    });

    return NextResponse.json({ override });
  } catch (error) {
    console.error('Error updating client module:', error);
    return NextResponse.json({ error: 'Error al actualizar módulo del cliente' }, { status: 500 });
  }
}
