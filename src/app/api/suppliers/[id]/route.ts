import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  vatNumber: z.string().min(1).max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/suppliers/[id] - Obtener proveedor por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json(
      { error: 'Error al obtener proveedor' },
      { status: 500 }
    );
  }
}

// PATCH /api/suppliers/[id] - Actualizar proveedor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verificar que el proveedor pertenece al negocio
    const existing = await prisma.supplier.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateSupplierSchema.parse(body);

    // Si se está actualizando el NIF, verificar que no exista otro con el mismo NIF
    if (data.vatNumber && data.vatNumber !== existing.vatNumber) {
      const duplicate = await prisma.supplier.findFirst({
        where: {
          businessId,
          vatNumber: data.vatNumber,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'El proveedor ya existe en este negocio' },
          { status: 400 }
        );
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
    });

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Error updating supplier:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar proveedor' },
      { status: 500 }
    );
  }
}

// DELETE /api/suppliers/[id] - Soft delete (marcar como inactivo)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verificar que el proveedor pertenece al negocio
    const existing = await prisma.supplier.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json(
      { error: 'Error al eliminar proveedor' },
      { status: 500 }
    );
  }
}