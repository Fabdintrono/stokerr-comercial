import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  vatNumber: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

// GET /api/suppliers - Listar todos los proveedores
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

    const suppliers = await prisma.supplier.findMany({
      where: {
        businessId,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Error al obtener proveedores' },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Crear proveedor
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
    const data = createSupplierSchema.parse(body);

    // Verificar que el proveedor no existe en el negocio
    const existing = await prisma.supplier.findFirst({
      where: {
        businessId,
        vatNumber: data.vatNumber,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'El proveedor ya existe en este negocio' },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        businessId,
        name: data.name,
        vatNumber: data.vatNumber,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
      },
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear proveedor' },
      { status: 500 }
    );
  }
}