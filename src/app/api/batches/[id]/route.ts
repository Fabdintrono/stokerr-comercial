import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard'

function bizId(req: NextRequest) { return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value }
const patchSchema = z.object({ lotNumber: z.string().optional(), expiryDate: z.string().optional() })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  try { await requireModule(prisma, businessId, 'BATCHES') }
  catch (e) { if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 }); throw e }
  const { id } = await params
  const owned = await prisma.productBatch.findFirst({ where: { id, product: { businessId } }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Lote no encontrado' }, { status: 404 })
  const data = patchSchema.parse(await request.json())
  const batch = await prisma.productBatch.update({
    where: { id },
    data: { ...(data.lotNumber && { lotNumber: data.lotNumber }), ...(data.expiryDate && { expiryDate: new Date(data.expiryDate) }) },
  })
  return NextResponse.json({ batch })
}
