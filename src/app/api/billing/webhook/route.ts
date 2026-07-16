import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyIpnSignature } from '@/lib/billing/ipn'
import { applyPayment } from '@/lib/billing/subscription'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  let body: any
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const sig = req.headers.get('x-nowpayments-sig')
  if (!verifyIpnSignature(body, sig, process.env.NOWPAYMENTS_IPN_SECRET!)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }
  const providerPaymentId = String(body.payment_id ?? body.id ?? '')
  const status = String(body.payment_status ?? '')
  const existing = await prisma.billingPayment.findUnique({ where: { providerPaymentId } })
  if (!existing) return NextResponse.json({ error: 'unknown payment' }, { status: 404 })
  await prisma.billingPayment.update({ where: { id: existing.id }, data: { status } })
  if (status === 'finished' || status === 'confirmed') {
    await applyPayment(prisma, providerPaymentId, new Date())
  }
  return NextResponse.json({ ok: true })
}
