import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const updateModuleSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  addOnPrice: z.number().min(0),
  priceCurrency: z.enum(['USD', 'VES', 'BRL']),
  includedInPlans: z.array(z.enum(['STARTER', 'GROWTH', 'ENTERPRISE'])),
  active: z.boolean(),
});

// GET /api/admin/modules - List all modules in catalog (super admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const modules = await prisma.module.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ modules });
  } catch (error) {
    console.error('Error fetching module catalog:', error);
    return NextResponse.json({ error: 'Error al obtener catálogo de módulos' }, { status: 500 });
  }
}

// PUT /api/admin/modules - Update a module in catalog (super admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = updateModuleSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parseResult.error.issues }, { status: 422 });
    }

    const { key, ...data } = parseResult.data;
    const updated = await prisma.module.update({
      where: { key },
      data,
    });

    return NextResponse.json({ module: updated });
  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json({ error: 'Error al actualizar módulo' }, { status: 500 });
  }
}
