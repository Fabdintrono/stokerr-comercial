import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard'

const createSchema = z.object({
  productId: z.string(),
  attributes: z.record(z.string(), z.string()),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.number().optional(),
  salePrice: z.number().optional(),
})

function bizId(req: NextRequest) {
  return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  const productId = new URL(request.url).searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId requerido' }, { status: 400 })
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  const variants = await prisma.productVariant.findMany({ where: { productId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ variants })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  try {
    await requireModule(prisma, businessId, 'VARIANTS')
  } catch (e) {
    if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 })
    throw e
  }
  const data = createSchema.parse(await request.json())
  const product = await prisma.product.findFirst({ where: { id: data.productId, businessId } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  const variant = await prisma.productVariant.create({
    data: {
      productId: data.productId,
      attributes: data.attributes,
      sku: data.sku,
      barcode: data.barcode,
      costPrice: data.costPrice,
      salePrice: data.salePrice,
    },
  })
  if (!product.hasVariants) {
    await prisma.product.update({ where: { id: product.id }, data: { hasVariants: true } })
  }
  return NextResponse.json({ variant }, { status: 201 })
}
