import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard'

function bizId(req: NextRequest) { return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value }

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  const productId = new URL(request.url).searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId requerido' }, { status: 400 })
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  const batches = await prisma.productBatch.findMany({
    where: { productId },
    include: { inventory: { select: { locationId: true, quantity: true } } },
    orderBy: { expiryDate: 'asc' },
  })
  return NextResponse.json({ batches })
}

const toggleSchema = z.object({ productId: z.string(), hasBatches: z.boolean() })
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  try { await requireModule(prisma, businessId, 'BATCHES') }
  catch (e) { if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 }); throw e }
  const data = toggleSchema.parse(await request.json())
  const product = await prisma.product.findFirst({ where: { id: data.productId, businessId } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  if (data.hasBatches && product.hasVariants) {
    return NextResponse.json({ error: 'Un producto con variantes no puede manejar lotes' }, { status: 409 })
  }
  const updated = await prisma.product.update({ where: { id: product.id }, data: { hasBatches: data.hasBatches } })
  return NextResponse.json({ product: { id: updated.id, hasBatches: updated.hasBatches } })
}
