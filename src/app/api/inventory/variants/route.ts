import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

function bizId(req: NextRequest) {
  return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value
}

// GET /api/inventory/variants?productId=&locationId=
// Returns each active variant of the product with its VariantInventory.quantity at that location (0 if none).
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const businessId = bizId(request)
  if (!businessId) {
    return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const locationId = searchParams.get('locationId')

  if (!productId) {
    return NextResponse.json({ error: 'productId requerido' }, { status: 400 })
  }
  if (!locationId) {
    return NextResponse.json({ error: 'locationId requerido' }, { status: 400 })
  }

  // Verify product belongs to this business
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
    select: { id: true },
  })
  if (!product) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }

  // Verify location belongs to this business
  const location = await prisma.location.findFirst({
    where: { id: locationId, businessId },
    select: { id: true },
  })
  if (!location) {
    return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 })
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      attributes: true,
      sku: true,
      inventory: {
        where: { locationId },
        select: { quantity: true },
      },
    },
  })

  const result = variants.map((v) => ({
    id: v.id,
    attributes: v.attributes as Record<string, string>,
    sku: v.sku,
    quantity: v.inventory[0]?.quantity ?? 0,
  }))

  return NextResponse.json({ variants: result })
}
