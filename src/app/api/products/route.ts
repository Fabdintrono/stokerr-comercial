import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const createProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'UNIT', 'BOX', 'CASE', 'GARRAFA']),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  categoryId: z.string().min(1),
  brandId: z.string().optional(),
  initialStock: z.number().min(0).optional(),
  locationId: z.string().optional(),
});

// GET /api/products - Listar productos del negocio
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Try to get businessId from header first, then from cookies
    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'No hay negocio seleccionado' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const posOnly = searchParams.get('posOnly') === 'true';

    const where: any = {
      businessId,
      isActive: true,
    };

    if (posOnly) {
      where.showInPos = true;
      where.category = { showInPos: true };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: { select: { id: true, name: true } },
        inventory: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const serialized = products.map((p) => ({
      ...p,
      costPrice: Number(p.costPrice ?? 0),
      salePrice: Number(p.salePrice ?? 0),
      vatRate: Number(p.vatRate ?? 0),
      minStock: Number(p.minStock ?? 0),
      maxStock: p.maxStock !== null ? Number(p.maxStock) : null,
      showInPos: p.showInPos,
      inventory: p.inventory.map((inv) => ({
        ...inv,
        quantity: Number(inv.quantity),
      })),
    }));

    return NextResponse.json({ products: serialized });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

// POST /api/products - Crear producto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Try to get businessId from header first, then from cookies
    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'No hay negocio seleccionado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createProductSchema.parse(body);

    // Verificar que el SKU no existe en el negocio
    const existing = await prisma.product.findFirst({
      where: {
        businessId,
        sku: data.sku,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'El SKU ya existe en este negocio' },
        { status: 400 }
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          businessId,
          sku: data.sku,
          name: data.name,
          description: data.description,
          unit: data.unit,
          minStock: data.minStock || 0,
          maxStock: data.maxStock || 0,
          costPrice: data.costPrice || 0,
          salePrice: data.salePrice || 0,
          vatRate: data.vatRate ?? 23,
          categoryId: data.categoryId,
          brandId: data.brandId || null,
          isActive: true,
        },
        include: { category: true },
      });

      // Create inventory record if locationId and initialStock provided
      if (data.locationId && (data.initialStock ?? 0) >= 0) {
        const inv = await tx.inventory.create({
          data: {
            productId: created.id,
            locationId: data.locationId,
            quantity: data.initialStock || 0,
          },
        });

        if ((data.initialStock || 0) > 0) {
          await tx.inventoryMovement.create({
            data: {
              productId: created.id,
              locationId: data.locationId,
              inventoryId: inv.id,
              type: 'IN',
              quantity: data.initialStock!,
              reason: 'Stock inicial',
              userId: session.user.id,
            },
          });
        }
      }

      return created;
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}