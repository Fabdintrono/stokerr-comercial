import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard'

const patchSchema = z.object({
  attributes: z.record(z.string(), z.string()).optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  costPrice: z.number().nullable().optional(),
  salePrice: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
})

function bizId(req: NextRequest) {
  return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value
}

async function guard(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const businessId = bizId(req)
  if (!businessId) return { error: NextResponse.json({ error: 'Sin negocio' }, { status: 400 }) }
  try { await requireModule(prisma, businessId, 'VARIANTS') }
  catch (e) {
    if (e instanceof ModuleForbiddenError) return { error: NextResponse.json({ error: 'module not enabled' }, { status: 403 }) }
    throw e
  }
  return { businessId }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(request); if (g.error) return g.error
  const { id } = await params
  const owned = await prisma.productVariant.findFirst({
    where: { id, product: { businessId: g.businessId } },
    select: { id: true },
  })
  if (!owned) return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 })
  const data = patchSchema.parse(await request.json())
  const variant = await prisma.productVariant.update({ where: { id }, data })
  return NextResponse.json({ variant })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(request); if (g.error) return g.error
  const { id } = await params
  const owned = await prisma.productVariant.findFirst({
    where: { id, product: { businessId: g.businessId } },
    select: { id: true },
  })
  if (!owned) return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 })
  await prisma.productVariant.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
