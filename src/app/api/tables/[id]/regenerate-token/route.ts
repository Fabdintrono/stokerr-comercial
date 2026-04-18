import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';

// POST /api/tables/[id]/regenerate-token — regenerate qrToken (manager only)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const table = await prisma.table.findUnique({
      where: { id },
      select: { location: { select: { businessId: true } } },
    });
    if (!table) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const ub = await prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: session.user.id, businessId: table.location.businessId } },
    });
    if (!ub && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const updated = await prisma.table.update({
      where: { id },
      data: { qrToken: randomUUID() },
      select: { qrToken: true },
    });

    return NextResponse.json({ qrToken: updated.qrToken });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
