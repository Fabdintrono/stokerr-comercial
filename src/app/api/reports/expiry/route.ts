import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { batchStatus } from '@/lib/batches/status'

function bizId(req: NextRequest) {
  return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { expiryAlertDays: true },
  })
  const alertDays = business?.expiryAlertDays ?? 30

  const url = new URL(request.url)
  const fStatus = url.searchParams.get('status')
  const fLocation = url.searchParams.get('locationId')
  const fProduct = url.searchParams.get('productId')

  const rows = await prisma.batchInventory.findMany({
    where: {
      quantity: { gt: 0 },
      batch: { product: { businessId, ...(fProduct ? { id: fProduct } : {}) } },
      ...(fLocation ? { locationId: fLocation } : {}),
    },
    include: {
      batch: { select: { lotNumber: true, expiryDate: true, product: { select: { name: true } } } },
      location: { select: { name: true } },
    },
    orderBy: { batch: { expiryDate: 'asc' } },
  })

  const today = new Date()
  const withStatus = rows.map(r => ({
    productName: r.batch.product.name,
    lotNumber: r.batch.lotNumber,
    locationName: r.location.name,
    quantity: r.quantity,
    expiryDate: r.batch.expiryDate,
    status: batchStatus(new Date(r.batch.expiryDate), today, alertDays),
  }))

  const summary = withStatus.reduce(
    (s, x) => {
      if (x.status === 'NEAR') { s.nearCount++; s.nearQty += x.quantity }
      if (x.status === 'EXPIRED') { s.expiredCount++; s.expiredQty += x.quantity }
      return s
    },
    { nearCount: 0, expiredCount: 0, nearQty: 0, expiredQty: 0 },
  )

  const items = fStatus ? withStatus.filter(x => x.status === fStatus) : withStatus
  return NextResponse.json({ items, summary })
}
