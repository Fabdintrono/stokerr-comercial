import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import { computeMonthlyAmount } from '@/lib/billing/amount'
import { deriveStatus } from '@/lib/billing/status'

function bid(req: NextRequest) { return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = bid(req)
  if (!businessId) return NextResponse.json({ error: 'no business' }, { status: 400 })

  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { plan: true } })
  if (!business) return NextResponse.json({ error: 'no business' }, { status: 404 })

  let sub = await prisma.subscription.findUnique({ where: { businessId } })
  if (!sub) sub = await prisma.subscription.create({ data: { businessId, status: 'EXPIRED' } })

  const status = deriveStatus(sub.currentPeriodEnd, sub.graceDays, new Date())
  if (status !== sub.status) sub = await prisma.subscription.update({ where: { id: sub.id }, data: { status } })

  const planPrice = await prisma.planPrice.findUnique({ where: { plan: business.plan } })
  const addons = await prisma.tenantModule.findMany({
    where: { businessId, enabled: true, source: 'ADDON' },
    include: { module: { select: { name: true, addOnPrice: true } } },
  })
  const addonPrices = addons.map(a => a.priceAtActivation ?? a.module.addOnPrice)
  const amount = computeMonthlyAmount(new Decimal((planPrice?.monthlyPrice ?? 0).toString()), addonPrices.map(p => new Decimal(p.toString())))

  return NextResponse.json({
    status,
    plan: business.plan,
    planPrice: (planPrice?.monthlyPrice ?? 0).toString(),
    addons: addons.map(a => ({ name: a.module.name, price: (a.priceAtActivation ?? a.module.addOnPrice).toString() })),
    amount: amount.toString(),
    currentPeriodEnd: sub.currentPeriodEnd,
    graceDays: sub.graceDays,
  })
}
