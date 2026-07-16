import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import { issueDocument } from '@/lib/sales/issue'
import { renderSaleDocument } from '@/lib/pdf/renderSaleDocument'
import { formatMoney, convert, CurrencyCode } from '@/lib/currency'
import type { SaleDocumentData } from '@/lib/sales/saleData'
import { tServer } from '@/lib/i18n/tServer'
import { normalizeLocale } from '@/lib/i18n/normalizeLocale'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { language: true } })
    : null
  const locale = normalizeLocale(dbUser?.language)
  const { orderId } = await params
  const businessId = req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { name: true } } } }, customer: true, location: { select: { businessId: true } } },
  })
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (businessId && order.location.businessId !== businessId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const business = await prisma.business.findUnique({ where: { id: order.location.businessId } })
  if (!business) return NextResponse.json({ error: 'no business' }, { status: 404 })

  const { docNumber, issuedAt } = await issueDocument(prisma, orderId)

  const anchor = business.baseCurrency as CurrencyCode
  const secondary = (business.secondaryCurrency ?? null) as CurrencyCode | null
  const rate = new Decimal(order.rateToBase.toString())

  // totals in the order's stored currency; present in anchor
  const subtotal = order.items.reduce((s, it) => s.plus(new Decimal(it.totalPrice.toString())), new Decimal(0))
  const tax = business.taxEnabled
    ? subtotal.mul(new Decimal(business.defaultTaxRate.toString())).div(100)
    : new Decimal(0)
  const total = subtotal.plus(tax)

  const rates = { USD: new Decimal(1), VES: new Decimal(1), BRL: new Decimal(1) } as Record<CurrencyCode, Decimal>
  rates[anchor] = new Decimal(1)
  if (secondary) rates[secondary] = rate.eq(0) ? new Decimal(1) : new Decimal(1).div(rate) // best-effort dual using frozen rate

  const data: SaleDocumentData = {
    business: { name: business.name, logoUrl: business.logoUrl ?? '/stocker-icon.png', address: business.address, phone: business.phone, taxId: business.taxId },
    customer: order.customer ? { name: order.customer.name, taxId: order.customer.taxId, address: order.customer.address, phone: order.customer.phone } : null,
    lines: order.items.map(it => ({
      description: it.product?.name ?? 'Item',
      quantity: it.quantity.toString(),
      unitPrice: formatMoney(new Decimal(it.unitPrice.toString()), anchor),
      total: formatMoney(new Decimal(it.totalPrice.toString()), anchor),
    })),
    anchorCurrency: anchor,
    secondaryCurrency: secondary,
    rate: secondary ? order.rateToBase.toString() : null,
    subtotal: formatMoney(subtotal, anchor),
    tax: tax.eq(0) ? '0' : formatMoney(tax, anchor),
    taxLabel: business.taxLabel,
    total: formatMoney(total, anchor),
    totalSecondary: secondary ? formatMoney(convert(total, anchor, secondary, rates), secondary) : null,
    docNumber,
    issuedAt: issuedAt.toISOString().slice(0, 10),
    labels: {
      voucher: tServer(locale, 'invoicing.voucher'),
      customer: tServer(locale, 'invoicing.customer'),
      quantity: tServer(locale, 'invoicing.quantity'),
      unitPrice: tServer(locale, 'invoicing.unitPrice'),
      total: tServer(locale, 'invoicing.total'),
      description: tServer(locale, 'common.description'),
      subtotal: tServer(locale, 'invoicing.subtotal'),
      tax: tServer(locale, 'invoicing.tax'),
      nonFiscal: tServer(locale, 'invoicing.nonFiscal'),
      rate: tServer(locale, 'invoicing.rate'),
      equiv: tServer(locale, 'invoicing.equiv'),
    },
  }

  const buffer = await renderSaleDocument(data)
  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${docNumber}.pdf"`,
    },
  })
}
