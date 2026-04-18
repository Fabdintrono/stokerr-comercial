import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional().default(''),
  role: z.enum(['WAREHOUSE_MANAGER', 'RESTAURANT_MANAGER', 'CASHIER', 'WAITER']),
  businessRole: z.enum(['MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
  locationIds: z.array(z.string()).min(1, 'Debe asignar al menos una ubicacion'),
});

// GET /api/business/users - List users of the current business
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) {
      return NextResponse.json({ error: 'No hay negocio seleccionado' }, { status: 400 });
    }

    // Optional: filter by locationId (for restaurant managers scoped to their location)
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    let userIds: string[] | undefined;
    if (locationId) {
      const userLocations = await prisma.userLocation.findMany({
        where: { locationId },
        select: { userId: true },
      });
      userIds = userLocations.map((ul) => ul.userId);
    }

    const userBusinesses = await prisma.userBusiness.findMany({
      where: {
        businessId,
        ...(userIds ? { userId: { in: userIds } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            active: true,
            createdAt: true,
            locations: {
              include: {
                location: {
                  select: { id: true, name: true, type: true },
                },
              },
            },
          },
        },
      },
    });

    const users = userBusinesses.map((ub) => ({
      id: ub.user.id,
      name: ub.user.name,
      email: ub.user.email,
      phone: ub.user.phone,
      role: ub.user.role,
      businessRole: ub.role,
      active: ub.user.active,
      createdAt: ub.user.createdAt,
      locations: ub.user.locations.map((ul) => ul.location),
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching business users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

// POST /api/business/users - Create user for the current business
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) {
      return NextResponse.json({ error: 'No hay negocio seleccionado' }, { status: 400 });
    }

    // Verify caller is OWNER or MANAGER of this business
    const callerBusiness = await prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: session.user.id, businessId } },
    });
    if (!callerBusiness || (callerBusiness.role !== 'OWNER' && callerBusiness.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'No tienes permisos para crear usuarios' }, { status: 403 });
    }

    // Check maxUsers limit
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }
    const currentUserCount = await prisma.userBusiness.count({ where: { businessId } });
    if (currentUserCount >= business.maxUsers) {
      return NextResponse.json(
        { error: `Limite de ${business.maxUsers} usuarios alcanzado. Actualiza tu plan.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const data = createUserSchema.parse(body);

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya esta registrado' }, { status: 400 });
    }

    // Verify all locations belong to this business
    const locations = await prisma.location.findMany({
      where: { id: { in: data.locationIds }, businessId, isActive: true },
    });
    if (locations.length !== data.locationIds.length) {
      return NextResponse.json({ error: 'Una o mas ubicaciones no son validas' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          password: hashedPassword,
          phone: data.phone || null,
          role: data.role,
          language: 'pt-PT',
          active: true,
        },
      });

      // Link to business
      await tx.userBusiness.create({
        data: {
          userId: user.id,
          businessId,
          role: data.businessRole,
        },
      });

      // Assign to locations
      for (const locationId of data.locationIds) {
        await tx.userLocation.create({
          data: { userId: user.id, locationId },
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessRole: data.businessRole,
        locations: locations.map((l) => ({ id: l.id, name: l.name, type: l.type })),
      };
    });

    return NextResponse.json({ user: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating business user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos invalidos', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
