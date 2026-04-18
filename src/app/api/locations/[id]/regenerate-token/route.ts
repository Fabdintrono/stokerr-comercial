import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';

// POST /api/locations/[id]/regenerate-token — regenerate kitchenToken (manager only)
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

    const location = await prisma.location.findUnique({
      where: { id },
      select: { businessId: true },
    });
    if (!location) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    // Verify caller belongs to this business
    const ub = await prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: session.user.id, businessId: location.businessId } },
    });
    if (!ub && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const updated = await prisma.location.update({
      where: { id },
      data: { kitchenToken: randomUUID() },
      select: { kitchenToken: true },
    });

    return NextResponse.json({ kitchenToken: updated.kitchenToken });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
