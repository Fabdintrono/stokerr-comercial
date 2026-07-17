import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { applyVerticalPreset } from '@/lib/modules/applyVerticalPreset';
import { VERTICALS } from '@/lib/modules/verticals';

const createClientSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  plan: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']).optional(),
  vertical: z.enum(VERTICALS as [string, ...string[]]).default('RETAIL'),
  maxRestaurants: z.number().int().min(1).default(5).optional(),
  maxUsers: z.number().int().min(1).default(10).optional(),
  // Owner user
  ownerName: z.string().min(1).max(200),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(6),
  ownerPhone: z.string().optional(),
  ownerRole: z.enum(['WAREHOUSE_MANAGER', 'RESTAURANT_MANAGER']).default('WAREHOUSE_MANAGER'),
  // Default location
  warehouseName: z.string().min(1).default('Armazem Central'),
  warehouseCity: z.string().optional(),
  // Optional: link restaurant to existing business (skip creating new Business)
  existingBusinessId: z.string().optional(),
});

// GET /api/admin/clients - List all businesses (super admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businesses = await prisma.business.findMany({
      include: {
        users: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        locations: { select: { id: true, name: true, type: true, isActive: true } },
        _count: {
          select: {
            products: true,
            suppliers: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const clients = businesses.map((b) => {
      const owner = b.users.find((u) => u.role === 'OWNER');
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        plan: b.plan,
        active: b.active,
        maxRestaurants: b.maxRestaurants,
        maxUsers: b.maxUsers,
        createdAt: b.createdAt.toISOString(),
        ownerName: owner?.user.name || '-',
        ownerEmail: owner?.user.email || '-',
        locationCount: b.locations.length,
        userCount: b.users.length,
        locations: b.locations,
        productCount: b._count.products,
        supplierCount: b._count.suppliers,
        invoiceCount: b._count.invoices,
      };
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST /api/admin/clients - Create new business with owner and warehouse
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const data = createClientSchema.parse(body);

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email: data.ownerEmail } });
    if (existingEmail) {
      return NextResponse.json({ error: 'El email ya esta registrado' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.ownerPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      let business: any;

      if (data.existingBusinessId) {
        // Link to existing business (e.g., add restaurant to warehouse business)
        business = await tx.business.findUnique({ where: { id: data.existingBusinessId } });
        if (!business) throw new Error('Negocio no encontrado');
      } else {
        // Validate required fields for new business
        if (!data.businessName || !data.slug || !data.plan) {
          throw new Error('Faltan datos del negocio');
        }
        const existingSlug = await tx.business.findUnique({ where: { slug: data.slug } });
        if (existingSlug) throw new Error('El slug ya existe');

        business = await tx.business.create({
          data: {
            name: data.businessName!,
            slug: data.slug!,
            plan: data.plan ?? 'STARTER',
            vertical: (data.vertical ?? 'RETAIL') as any,
            maxRestaurants: data.maxRestaurants ?? 5,
            maxUsers: data.maxUsers ?? 10,
            active: true,
          },
        });

        // Default categories only for new businesses
        const defaultCategories = ['Bebidas', 'Carnes', 'Vegetais', 'Lacticinios', 'Frutas', 'Outros'];
        for (const catName of defaultCategories) {
          await tx.category.create({ data: { name: catName, businessId: business.id } });
        }
      }

      // Create owner user
      const user = await tx.user.create({
        data: {
          email: data.ownerEmail,
          name: data.ownerName,
          password: hashedPassword,
          phone: data.ownerPhone,
          role: data.ownerRole,
          language: 'pt-PT',
          active: true,
        },
      });

      // Link user to business
      await tx.userBusiness.create({
        data: { userId: user.id, businessId: business.id, role: 'OWNER' },
      });

      // Create location
      const locationType = data.ownerRole === 'RESTAURANT_MANAGER' ? 'RESTAURANT' : 'WAREHOUSE';
      const location = await tx.location.create({
        data: {
          businessId: business.id,
          name: data.warehouseName,
          type: locationType,
          city: data.warehouseCity,
          isActive: true,
        },
      });

      // Assign user to location
      await tx.userLocation.create({ data: { userId: user.id, locationId: location.id } });

      // Apply vertical preset (additive — enables modules for this vertical)
      await applyVerticalPreset(tx as any, business.id, (data.vertical ?? 'RETAIL') as any);

      return {
        business,
        user: { id: user.id, name: user.name, email: user.email },
        warehouse: location,
      };
    });

    return NextResponse.json({ client: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
