import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// GET /api/inventory - Stock por location
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const businessId = request.cookies.get('businessId')?.value;
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'No hay negocio seleccionado' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const lowStock = searchParams.get('lowStock') === 'true';

    // Obtener locations del negocio
    const locations = await prisma.location.findMany({
      where: {
        businessId,
        isActive: true,
      },
      select: { id: true },
    });

    const locationIds = locations.map((l) => l.id);

    const where: any = {
      locationId: locationId || { in: locationIds },
    };

    // Si se solicita lowStock, obtener productos con stock bajo
    // (comparar quantity con product.minStock)
    // Por ahora, filtramos después de obtener los datos

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          include: { category: true },
        },
        location: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    // Filtrar por lowStock si se solicita
    const result = lowStock
      ? inventory.filter((item) => item.quantity <= (item.product.minStock || 0))
      : inventory;

    return NextResponse.json({ inventory: result });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Error al obtener inventario' },
      { status: 500 }
    );
  }
}