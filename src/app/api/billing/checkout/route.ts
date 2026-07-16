import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import { computeMonthlyAmount } from '@/lib/billing/amount'
import { createInvoice } from '@/lib/billing/nowpayments'

export const runtime = 'nodejs'
function bid(req: NextRequest) { return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = bid(req)
  if (!businessId) return NextResponse.json({ error: 'no business' }, { status: 400 })

  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { plan: true } })
  if (!business) return NextResponse.json({ error: 'no business' }, { status: 404 })
  let sub = await prisma.subscription.findUnique({ where: { businessId } })
  if (!sub) sub = await prisma.subscription.create({ data: { businessId, status: 'EXPIRED' } })

  const planPrice = await prisma.planPrice.findUnique({ where: { plan: business.plan } })
  const addons = await prisma.tenantModule.findMany({ where: { businessId, enabled: true, source: 'ADDON' }, include: { module: { select: { addOnPrice: true } } } })
  const amount = computeMonthlyAmount(
    new Decimal((planPrice?.monthlyPrice ?? 0).toString()),
    addons.map(a => new Decimal((a.priceAtActivation ?? a.module.addOnPrice).toString())),
  )
  if (amount.lte(0)) return NextResponse.json({ error: 'nothing to charge' }, { status: 400 })

  const appUrl = process.env.APP_URL ?? ''
  const invoice = await createInvoice({
    amount: Number(amount.toFixed(2)),
    orderId: businessId,
    successUrl: `${appUrl}/billing?paid=1`,
    cancelUrl: `${appUrl}/billing`,
  })
  await prisma.billingPayment.create({
    data: { subscriptionId: sub.id, amount: amount.toFixed(2), providerPaymentId: invoice.id, status: 'waiting', payCurrency: 'usdttrc20' },
  })
  return NextResponse.json({ invoiceUrl: invoice.invoiceUrl })
}
