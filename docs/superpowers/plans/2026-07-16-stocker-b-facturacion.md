# Stocker B — Comprobante de venta no fiscal + PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Issue a non-fiscal sales document (from POS orders or manual invoices) as a real server-generated PDF, with reusable customers, per-tenant sequential numbering, per-tenant tax config, and multi-currency dual totals.

**Architecture:** Reuse `Order` as the single sale entity (adds `customerId`/`docNumber`/`issuedAt`). A new `Customer` model gives a reusable client list. Numbering is a transactional per-tenant counter on `Business`. Totals and numbering are pure/tested units; the PDF is rendered server-side with `@react-pdf/renderer` behind a Node-runtime endpoint that issues the number (idempotent) and streams the file.

**Tech Stack:** Next.js 16 App Router, Prisma + PostgreSQL (live commercial Supabase connected), `@react-pdf/renderer` (new), decimal.js, Vitest, React 19.

**Spec:** `docs/superpowers/specs/2026-07-16-stocker-b-facturacion-design.md`

**Branch:** Continue on `feature/multimoneda` (B depends on Block A). Do NOT touch the 13 pending files; explicit `git add` only.

---

## File Structure

**New files:**
- `src/lib/sales/totals.ts` (+ `.test.ts`) — `computeTotals`
- `src/lib/sales/docNumber.ts` (+ `.test.ts`) — `formatDocNumber`
- `src/lib/sales/issue.ts` (+ `.test.ts`) — `issueDocument` (transactional, idempotent)
- `src/lib/sales/saleData.ts` — `buildSaleDocumentData` (Order → PDF DTO)
- `src/components/pdf/SaleDocumentPdf.tsx` — react-pdf document
- `src/lib/pdf/renderSaleDocument.ts` (+ `.test.ts`) — render DTO → Buffer
- `src/app/api/sales/[orderId]/pdf/route.ts` — Node-runtime PDF endpoint
- `src/app/api/customers/route.ts` — GET/POST customers
- `src/app/api/customers/[id]/route.ts` — PUT customer
- `src/app/warehouse/customers/page.tsx` — customers UI
- `src/app/sales/new/page.tsx` — manual invoice UI

**Modified files:**
- `prisma/schema.prisma` — Customer, Order fields, Business fields
- `next.config.js` — `serverExternalPackages`
- `src/app/warehouse/settings/page.tsx` (or the business settings page) — branding + tax + docPrefix

---

## Task 1: Schema — Customer, Order & Business fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `Customer` model** (after the `Module` models)

```prisma
model Customer {
  id         String   @id @default(cuid())
  businessId String
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  name       String
  taxId      String?
  address    String?
  phone      String?
  email      String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  orders Order[]
  @@index([businessId])
  @@map("customers")
}
```

- [ ] **Step 2: Add fields + relation to `Order`** (inside `model Order`, near `notes`)

```prisma
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id])
  docNumber  String?
  issuedAt   DateTime?
```

- [ ] **Step 3: Add fields + relation to `Business`**

Add fields (after the multi-currency fields):
```prisma
  logoUrl        String?
  address        String?
  phone          String?
  taxId          String?
  docPrefix      String   @default("F-")
  docNextNumber  Int      @default(1)
  taxEnabled     Boolean  @default(false)
  defaultTaxRate Decimal  @default(0) @db.Decimal(5, 2)
  taxLabel       String   @default("IVA")
```
Add relation (with the others): `customers Customer[]`

- [ ] **Step 4: Push to the live DB**

Run: `npx prisma db push`
Expected: "in sync" + client generated.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: Customer model + Order doc fields + Business branding/tax/numbering"
```

---

## Task 2: computeTotals

**Files:**
- Create: `src/lib/sales/totals.ts`
- Test: `src/lib/sales/totals.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { computeTotals } from './totals'

describe('computeTotals', () => {
  it('no tax: total equals subtotal', () => {
    const t = computeTotals([{ quantity: 2, unitPrice: 10 }], false, 0)
    expect(t.subtotal.toString()).toBe('20')
    expect(t.tax.toString()).toBe('0')
    expect(t.total.toString()).toBe('20')
  })
  it('per-line vatRate when tax enabled', () => {
    const t = computeTotals([{ quantity: 1, unitPrice: 100, vatRate: 16 }], true, 0)
    expect(t.tax.toString()).toBe('16')
    expect(t.total.toString()).toBe('116')
  })
  it('falls back to default rate when line has no vatRate', () => {
    const t = computeTotals([{ quantity: 1, unitPrice: 100 }], true, 10)
    expect(t.tax.toString()).toBe('10')
    expect(t.total.toString()).toBe('110')
  })
  it('sums mixed lines', () => {
    const t = computeTotals([{ quantity: 2, unitPrice: 50 }, { quantity: 1, unitPrice: 30 }], false, 0)
    expect(t.subtotal.toString()).toBe('130')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- sales/totals`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import Decimal from 'decimal.js'

export interface SaleLineInput { quantity: number | string; unitPrice: number | string; vatRate?: number | string }
export interface SaleTotals { subtotal: Decimal; tax: Decimal; total: Decimal }

export function computeTotals(lines: SaleLineInput[], taxEnabled: boolean, defaultRate: number | string): SaleTotals {
  let subtotal = new Decimal(0)
  let tax = new Decimal(0)
  for (const l of lines) {
    const lineSub = new Decimal(l.quantity).mul(l.unitPrice)
    subtotal = subtotal.plus(lineSub)
    if (taxEnabled) {
      const rate = l.vatRate !== undefined && l.vatRate !== null ? new Decimal(l.vatRate) : new Decimal(defaultRate)
      tax = tax.plus(lineSub.mul(rate).div(100))
    }
  }
  return { subtotal, tax, total: subtotal.plus(tax) }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- sales/totals`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sales/totals.ts src/lib/sales/totals.test.ts
git commit -m "feat: computeTotals (subtotal/tax/total, per-line or default rate)"
```

---

## Task 3: formatDocNumber

**Files:**
- Create: `src/lib/sales/docNumber.ts`
- Test: `src/lib/sales/docNumber.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { formatDocNumber } from './docNumber'

describe('formatDocNumber', () => {
  it('zero-pads to 6 digits with prefix', () => {
    expect(formatDocNumber('F-', 1)).toBe('F-000001')
    expect(formatDocNumber('F-', 123)).toBe('F-000123')
  })
  it('does not truncate numbers beyond 6 digits', () => {
    expect(formatDocNumber('F-', 1234567)).toBe('F-1234567')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- sales/docNumber`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
export function formatDocNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(6, '0')}`
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- sales/docNumber`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sales/docNumber.ts src/lib/sales/docNumber.test.ts
git commit -m "feat: formatDocNumber helper"
```

---

## Task 4: issueDocument (transactional, idempotent)

**Files:**
- Create: `src/lib/sales/issue.ts`
- Test: `src/lib/sales/issue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { issueDocument } from './issue'

function makePrisma(order: any, business: any) {
  const tx = {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...order, ...data })),
    },
    business: {
      update: vi.fn().mockResolvedValue({ ...business, docNextNumber: business.docNextNumber + 1 }),
    },
  }
  return {
    $transaction: (fn: any) => fn(tx),
    _tx: tx,
  } as any
}

describe('issueDocument', () => {
  it('assigns the tenant next number formatted with prefix', async () => {
    const prisma = makePrisma(
      { id: 'o1', businessId: 'b1', docNumber: null },
      { id: 'b1', docPrefix: 'F-', docNextNumber: 1 },
    )
    // business lookup for prefix/counter:
    prisma._tx.business.findUnique = vi.fn().mockResolvedValue({ docPrefix: 'F-', docNextNumber: 1 })
    const r = await issueDocument(prisma, 'o1')
    expect(r.docNumber).toBe('F-000001')
  })
  it('is idempotent: an already-issued order keeps its number', async () => {
    const prisma = makePrisma(
      { id: 'o1', businessId: 'b1', docNumber: 'F-000005', issuedAt: new Date('2026-01-01') },
      { id: 'b1', docPrefix: 'F-', docNextNumber: 9 },
    )
    const r = await issueDocument(prisma, 'o1')
    expect(r.docNumber).toBe('F-000005')
    expect(prisma._tx.business.update).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- sales/issue`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import type { PrismaClient } from '@prisma/client'
import { formatDocNumber } from './docNumber'

export async function issueDocument(prisma: PrismaClient, orderId: string): Promise<{ docNumber: string; issuedAt: Date }> {
  return prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true, businessId: true, docNumber: true, issuedAt: true, location: { select: { businessId: true } } } })
    if (!order) throw new Error('order not found')
    if (order.docNumber && order.issuedAt) return { docNumber: order.docNumber, issuedAt: order.issuedAt }
    const businessId = order.businessId ?? order.location?.businessId
    const business = await tx.business.findUnique({ where: { id: businessId }, select: { docPrefix: true, docNextNumber: true } })
    const n = business.docNextNumber
    const docNumber = formatDocNumber(business.docPrefix, n)
    const issuedAt = new Date()
    await tx.business.update({ where: { id: businessId }, data: { docNextNumber: n + 1 } })
    await tx.order.update({ where: { id: orderId }, data: { docNumber, issuedAt } })
    return { docNumber, issuedAt }
  })
}
```
> NOTE: `Order` has no direct `businessId` column — it derives from `location.businessId`. The select
> above loads both; the `?? order.location?.businessId` covers it. If your generated types complain
> about `order.businessId`, drop it and use `order.location.businessId` only.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- sales/issue`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sales/issue.ts src/lib/sales/issue.test.ts
git commit -m "feat: issueDocument (transactional per-tenant numbering, idempotent)"
```

---

## Task 5: Customers API

**Files:**
- Create: `src/app/api/customers/route.ts`
- Create: `src/app/api/customers/[id]/route.ts`

- [ ] **Step 1: Implement list + create** (`src/app/api/customers/route.ts`)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function businessId(req: NextRequest) {
  return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value
}
const schema = z.object({
  name: z.string().min(1),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = businessId(req)
  if (!id) return NextResponse.json([])
  const customers = await prisma.customer.findMany({ where: { businessId: id, isActive: true }, orderBy: { name: 'asc' } })
  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = businessId(req)
  if (!id) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const created = await prisma.customer.create({ data: { ...parsed.data, businessId: id } })
  return NextResponse.json(created, { status: 201 })
}
```

- [ ] **Step 2: Implement update** (`src/app/api/customers/[id]/route.ts`)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const businessId = req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value
  const existing = await prisma.customer.findUnique({ where: { id } })
  if (!existing || existing.businessId !== businessId) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const updated = await prisma.customer.update({ where: { id }, data: parsed.data })
  return NextResponse.json(updated)
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/customers/route.ts "src/app/api/customers/[id]/route.ts"
git commit -m "feat: customers API (list/create/update, tenant-scoped)"
```

---

## Task 6: Install react-pdf + config

**Files:**
- Modify: `package.json`, `next.config.js`

- [ ] **Step 1: Install**

Run: `npm i @react-pdf/renderer`
Expected: added.

- [ ] **Step 2: Add serverExternalPackages to `next.config.js`**

Add at the top level of the config object (Next 16 supports top-level `serverExternalPackages`):
```js
  serverExternalPackages: ['@react-pdf/renderer'],
```

- [ ] **Step 3: Verify build still succeeds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json next.config.js
git commit -m "chore: add @react-pdf/renderer + serverExternalPackages"
```

---

## Task 7: SaleDocumentPdf DTO + component + renderer

**Files:**
- Create: `src/lib/sales/saleData.ts`
- Create: `src/components/pdf/SaleDocumentPdf.tsx`
- Create: `src/lib/pdf/renderSaleDocument.ts`
- Test: `src/lib/pdf/renderSaleDocument.test.ts`

- [ ] **Step 1: DTO type + builder** (`src/lib/sales/saleData.ts`)

```ts
export interface SaleDocLine { description: string; quantity: string; unitPrice: string; total: string }
export interface SaleDocumentData {
  business: { name: string; logoUrl?: string | null; address?: string | null; phone?: string | null; taxId?: string | null }
  customer?: { name: string; taxId?: string | null; address?: string | null; phone?: string | null } | null
  lines: SaleDocLine[]
  anchorCurrency: string
  secondaryCurrency?: string | null
  rate?: string | null
  subtotal: string
  tax: string
  taxLabel: string
  total: string
  totalSecondary?: string | null
  docNumber: string
  issuedAt: string
}
```

- [ ] **Step 2: react-pdf component** (`src/components/pdf/SaleDocumentPdf.tsx`)

```tsx
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { SaleDocumentData } from '@/lib/sales/saleData'

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#18181b' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  logo: { width: 48, height: 48, marginRight: 8 },
  h1: { fontSize: 16, fontWeight: 700 },
  muted: { color: '#6b7280' },
  box: { marginTop: 16, borderTop: '1 solid #e5e7eb', paddingTop: 8 },
  th: { flexDirection: 'row', borderBottom: '1 solid #e5e7eb', paddingBottom: 4, marginTop: 12, fontWeight: 700 },
  td: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #f3f4f6' },
  cDesc: { flex: 4 }, cQty: { flex: 1, textAlign: 'right' }, cPrice: { flex: 2, textAlign: 'right' }, cTot: { flex: 2, textAlign: 'right' },
  totals: { marginTop: 12, alignSelf: 'flex-end', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grand: { fontSize: 13, fontWeight: 700 },
  footer: { marginTop: 'auto', borderTop: '1 solid #e5e7eb', paddingTop: 8, textAlign: 'center', color: '#6b7280', fontSize: 9 },
})

export function SaleDocumentPdf({ data }: { data: SaleDocumentData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View style={{ flexDirection: 'row' }}>
            {data.business.logoUrl ? <Image src={data.business.logoUrl} style={s.logo} /> : null}
            <View>
              <Text style={s.h1}>{data.business.name}</Text>
              {data.business.address ? <Text style={s.muted}>{data.business.address}</Text> : null}
              {data.business.phone ? <Text style={s.muted}>{data.business.phone}</Text> : null}
              {data.business.taxId ? <Text style={s.muted}>{data.business.taxId}</Text> : null}
            </View>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={s.h1}>COMPROBANTE</Text>
            <Text>{data.docNumber}</Text>
            <Text style={s.muted}>{data.issuedAt}</Text>
          </View>
        </View>

        {data.customer ? (
          <View style={s.box}>
            <Text style={{ fontWeight: 700 }}>Cliente</Text>
            <Text>{data.customer.name}{data.customer.taxId ? ` — ${data.customer.taxId}` : ''}</Text>
            {data.customer.address ? <Text style={s.muted}>{data.customer.address}</Text> : null}
          </View>
        ) : null}

        <View style={s.th}>
          <Text style={s.cDesc}>Descripción</Text>
          <Text style={s.cQty}>Cant</Text>
          <Text style={s.cPrice}>Precio</Text>
          <Text style={s.cTot}>Total</Text>
        </View>
        {data.lines.map((l, i) => (
          <View style={s.td} key={i}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cQty}>{l.quantity}</Text>
            <Text style={s.cPrice}>{l.unitPrice}</Text>
            <Text style={s.cTot}>{l.total}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}><Text>Subtotal</Text><Text>{data.subtotal}</Text></View>
          {data.tax !== '0' ? <View style={s.totalRow}><Text>{data.taxLabel}</Text><Text>{data.tax}</Text></View> : null}
          <View style={s.totalRow}><Text style={s.grand}>Total</Text><Text style={s.grand}>{data.total}</Text></View>
          {data.totalSecondary ? <View style={s.totalRow}><Text style={s.muted}>Equiv. {data.secondaryCurrency}</Text><Text style={s.muted}>{data.totalSecondary}</Text></View> : null}
          {data.rate ? <View style={s.totalRow}><Text style={s.muted}>Tasa</Text><Text style={s.muted}>{data.rate}</Text></View> : null}
        </View>

        <Text style={s.footer}>Documento no fiscal — {data.business.name}</Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 3: Renderer + smoke test**

`src/lib/pdf/renderSaleDocument.ts`:
```ts
import { renderToBuffer } from '@react-pdf/renderer'
import { SaleDocumentPdf } from '@/components/pdf/SaleDocumentPdf'
import type { SaleDocumentData } from '@/lib/sales/saleData'
import React from 'react'

export async function renderSaleDocument(data: SaleDocumentData): Promise<Buffer> {
  return renderToBuffer(React.createElement(SaleDocumentPdf, { data }))
}
```

`src/lib/pdf/renderSaleDocument.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { renderSaleDocument } from './renderSaleDocument'

describe('renderSaleDocument', () => {
  it('produces a non-empty PDF buffer', async () => {
    const buf = await renderSaleDocument({
      business: { name: 'Demo SA' },
      customer: null,
      lines: [{ description: 'Item', quantity: '2', unitPrice: '$10.00', total: '$20.00' }],
      anchorCurrency: 'USD', secondaryCurrency: null, rate: null,
      subtotal: '$20.00', tax: '0', taxLabel: 'IVA', total: '$20.00', totalSecondary: null,
      docNumber: 'F-000001', issuedAt: '2026-07-16',
    })
    expect(buf.length).toBeGreaterThan(500)
    expect(buf.slice(0, 4).toString()).toBe('%PDF')
  }, 20000)
})
```

- [ ] **Step 4: Run the smoke test**

Run: `npm test -- renderSaleDocument`
Expected: PASS (1). If it fails because Vitest can't parse the `.tsx` react-pdf import in the node env, add `import React from 'react'` (already present) and ensure `vitest.config.ts` `test.environment` stays `node` (react-pdf renders in node). If JSX-in-tsx transform is an issue, the component already avoids JSX in the renderer (uses `React.createElement`); the `.tsx` component itself is only imported, not JSX-evaluated in the test file.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sales/saleData.ts src/components/pdf/SaleDocumentPdf.tsx src/lib/pdf/renderSaleDocument.ts src/lib/pdf/renderSaleDocument.test.ts
git commit -m "feat: SaleDocumentPdf + server renderer (smoke tested)"
```

---

## Task 8: PDF endpoint

**Files:**
- Create: `src/app/api/sales/[orderId]/pdf/route.ts`

- [ ] **Step 1: Implement the Node-runtime endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Decimal from 'decimal.js'
import { issueDocument } from '@/lib/sales/issue'
import { renderSaleDocument } from '@/lib/pdf/renderSaleDocument'
import { formatMoney, convert, CurrencyCode } from '@/lib/currency'
import type { SaleDocumentData } from '@/lib/sales/saleData'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
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
  }

  const buffer = await renderSaleDocument(data)
  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${docNumber}.pdf"`,
    },
  })
}
```
> NOTE on dual: the frozen `rateToBase` on the order is "base per 1 unit of order currency". Since
> totals here are presented in the tenant's anchor (base) currency, the secondary equivalent uses the
> `convert` helper with a rates map keyed to the anchor. Keep the presentation best-effort; the
> authoritative frozen figure is the order's stored amounts. If `secondaryCurrency` is null, no dual is shown.

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors; route `/api/sales/[orderId]/pdf` in the build output.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/sales/[orderId]/pdf/route.ts"
git commit -m "feat: PDF endpoint (issue number + render + stream, tenant-guarded)"
```

---

## Task 9: Customers page

**Files:**
- Create: `src/app/warehouse/customers/page.tsx`

- [ ] **Step 1: Build the page** (client component; model after existing list pages, dark theme, `ui/*`, `react-hot-toast`)

```tsx
'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Customer { id?: string; name: string; taxId?: string; address?: string; phone?: string; email?: string }

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([])
  const [draft, setDraft] = useState<Customer>({ name: '' })

  async function load() { setRows(await fetch('/api/customers').then(r => r.json())) }
  useEffect(() => { load() }, [])

  async function create() {
    if (!draft.name) return toast.error('Nombre requerido')
    const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
    if (res.ok) { toast.success('Cliente creado'); setDraft({ name: '' }); load() }
    else toast.error('Error')
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
      <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-2 gap-3">
        {(['name', 'taxId', 'phone', 'address', 'email'] as const).map(f => (
          <input key={f} placeholder={f === 'name' ? 'Nombre *' : f} value={(draft as any)[f] ?? ''}
            onChange={e => setDraft(d => ({ ...d, [f]: e.target.value }))}
            className="rounded-md bg-background border border-border p-2" />
        ))}
        <button onClick={create} className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium">Agregar</button>
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {rows.length === 0 && <div className="p-4 text-muted-foreground">Sin clientes.</div>}
        {rows.map(c => (
          <div key={c.id} className="p-3 flex justify-between">
            <span className="text-foreground">{c.name}</span>
            <span className="text-muted-foreground text-sm">{c.taxId} {c.phone}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/app/warehouse/customers/page.tsx
git commit -m "feat: customers page (list + create)"
```

---

## Task 10: Manual invoice page ("Nueva factura")

**Files:**
- Create: `src/app/sales/new/page.tsx`

- [ ] **Step 1: Build the page**

Client component that: loads customers (`GET /api/customers`) and products (`GET /api/products?locationType=WAREHOUSE` — reuse existing endpoint), lets the user pick a customer, add line items (product + qty + unitPrice), pick a `locationId` (from `GET /api/locations`), shows a running total, and on "Emitir" POSTs to `/api/orders` with `{ locationId, userId, items, customerId }` then opens `/api/sales/${order.id}/pdf` in a new tab.

```tsx
'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/components/providers/AuthProvider'

interface Line { productId: string; description: string; quantity: number; unitPrice: number }

export default function NewInvoicePage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customerId, setCustomerId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [lines, setLines] = useState<Line[]>([])

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
    fetch('/api/locations').then(r => r.json()).then(d => { const l = Array.isArray(d) ? d : (d.locations ?? []); setLocations(l); if (l[0]) setLocationId(l[0].id) })
    fetch('/api/products?locationType=WAREHOUSE').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : (d.products ?? [])))
  }, [])

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

  function addLine(p: any) {
    setLines(ls => [...ls, { productId: p.id, description: p.name, quantity: 1, unitPrice: Number(p.salePrice) }])
  }

  async function emit() {
    if (!locationId || lines.length === 0) return toast.error('Elige local y agrega ítems')
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId, userId: user?.id, customerId: customerId || undefined,
        items: lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
      }),
    })
    if (!res.ok) return toast.error('Error al emitir')
    const order = await res.json()
    window.open(`/api/sales/${order.id}/pdf`, '_blank')
    toast.success('Comprobante emitido'); setLines([])
  }

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <h1 className="text-2xl font-semibold text-foreground">Nueva factura</h1>
      <div className="flex gap-3">
        <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="flex-1 rounded-md bg-card border border-border p-2">
          <option value="">Cliente (opcional)</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={locationId} onChange={e => setLocationId(e.target.value)} className="flex-1 rounded-md bg-card border border-border p-2">
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="text-sm text-muted-foreground mb-2">Agregar producto</div>
        <div className="flex flex-wrap gap-2">
          {products.slice(0, 30).map(p => (
            <button key={p.id} onClick={() => addLine(p)} className="rounded-md border border-border px-3 py-1 text-sm text-foreground">{p.name}</button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {lines.map((l, i) => (
          <div key={i} className="p-3 flex items-center gap-3">
            <span className="flex-1 text-foreground">{l.description}</span>
            <input type="number" value={l.quantity} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))} className="w-20 rounded-md bg-background border border-border p-1" />
            <input type="number" value={l.unitPrice} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, unitPrice: Number(e.target.value) } : x))} className="w-24 rounded-md bg-background border border-border p-1" />
            <span className="w-24 text-right text-foreground">{(l.quantity * l.unitPrice).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold text-foreground">Total: {total.toFixed(2)}</span>
        <button onClick={emit} className="rounded-md bg-primary px-6 py-2 text-primary-foreground font-medium">Emitir comprobante</button>
      </div>
    </div>
  )
}
```
> NOTE: If `GET /api/locations` returns a different shape, adjust the mapping. The POST to `/api/orders`
> accepts `customerId` — ensure Task 1 added the field and the orders schema accepts it (see Step 2).

- [ ] **Step 2: Allow `customerId` in the orders POST schema** — modify `src/app/api/orders/route.ts`: add `customerId: z.string().optional()` to `createOrderSchema`, and include `customerId: validated.customerId` in the `order.create` data. Verify `npx tsc --noEmit`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compiles; `/sales/new` route present.

- [ ] **Step 4: Commit**

```bash
git add src/app/sales/new/page.tsx src/app/api/orders/route.ts
git commit -m "feat: manual invoice page + customerId on order creation"
```

---

## Task 11: Business settings — branding, tax, numbering

**Files:**
- Create: `src/app/api/business/profile/route.ts`
- Modify: `src/app/warehouse/settings/page.tsx`

- [ ] **Step 1: Business profile API** (`src/app/api/business/profile/route.ts`)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function bid(req: NextRequest) { return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value }
const schema = z.object({
  logoUrl: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  docPrefix: z.string().min(1),
  taxEnabled: z.boolean(),
  defaultTaxRate: z.number().min(0),
  taxLabel: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions); if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = bid(req); if (!id) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const b = await prisma.business.findUnique({ where: { id }, select: { logoUrl: true, address: true, phone: true, taxId: true, docPrefix: true, taxEnabled: true, defaultTaxRate: true, taxLabel: true } })
  return NextResponse.json(b)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions); if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = bid(req); if (!id) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const parsed = schema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const updated = await prisma.business.update({ where: { id }, data: parsed.data })
  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Add a "Negocio / Comprobantes" section** to `src/app/warehouse/settings/page.tsx` that loads `GET /api/business/profile` and edits logoUrl, address, phone, taxId, docPrefix, taxEnabled (toggle), defaultTaxRate, taxLabel; saves via `PUT`. Match the existing settings layout. Verify `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/business/profile/route.ts src/app/warehouse/settings/page.tsx
git commit -m "feat: business profile settings (branding, tax config, doc prefix)"
```

---

## Task 12: POS "Comprobante" + full verification

**Files:**
- Modify: `src/app/(pos)/pos/page.tsx`

- [ ] **Step 1: Add a "Comprobante" action** where a POS order is closed/selected: a button/link that opens `/api/sales/${orderId}/pdf` in a new tab for the current order id. Read the file first to find where an order id is available after checkout, and add the button there. Verify `npm run build`.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(pos)/pos/page.tsx"
git commit -m "feat: comprobante PDF button in POS"
```

- [ ] **Step 3: Full test + build**

Run: `npm test`
Expected: all suites pass (currency, rates, modules, sales/totals, sales/docNumber, sales/issue, renderSaleDocument).

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 4: Confirm pending files untouched**

Run: `git status --short | grep -c '^ M'`
Expected: 13.

---

## Self-Review checklist (done while writing)

- **Spec coverage:** Customer model + CRUD (Tasks 1, 5, 9); Order reuse + docNumber/issuedAt/customerId (Tasks 1, 10); per-tenant numbering transactional + idempotent (Tasks 3, 4); tax configurable per tenant (Tasks 1, 2, 11); PDF engine + component + endpoint (Tasks 6, 7, 8); branding + default logo `/stocker-icon.png` (Tasks 1, 8, 11); manual invoice + POS trigger (Tasks 10, 12); dual currency in PDF (Task 8); testing (Tasks 2, 3, 4, 7, 12).
- **Placeholder scan:** all code steps contain real code. Steps 11.2 / 12.1 describe UI additions with the exact API + behavior and require reading the target file first (legit for touching large existing pages), not vague placeholders.
- **Type consistency:** `SaleDocumentData` defined once (Task 7) and consumed in Tasks 7/8; `computeTotals(lines, taxEnabled, defaultRate)` consistent; `issueDocument(prisma, orderId)` returns `{docNumber, issuedAt}` consumed in Task 8; `formatDocNumber(prefix, n)` consistent. Order has no `businessId` column → derived via `location.businessId` (noted in Tasks 4, 8).
- **Deferred (documented):** file upload for logo (paste URL for now); email/WhatsApp send of the PDF (Block C/marketing); advanced dual-rate presentation edge cases (best-effort, authoritative figures are the order's stored amounts).
