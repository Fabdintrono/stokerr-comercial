# Stocker C — Suscripciones USDT — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monthly USDT subscriptions via NOWPayments: per-tenant amount (plan price + active add-ons), self-serve checkout, IPN webhook that extends the period idempotently, and grace-then-block enforcement, with a Stocker-styled billing panel.

**Architecture:** Plan prices live in DB (`PlanPrice`). Each tenant has a `Subscription` (status derived from dates) and a `BillingPayment` history. Pure units compute the amount, derive status, and verify the IPN HMAC. A thin NOWPayments client creates checkouts; the webhook extends the period idempotently by `providerPaymentId`. A client `SubscriptionProvider`+gate enforces block/banner in the authenticated layout.

**Tech Stack:** Next.js 16 App Router, Prisma + PostgreSQL (live commercial Supabase), decimal.js, Node `crypto` (HMAC-SHA512), Vitest, React 19.

**Spec:** `docs/superpowers/specs/2026-07-16-stocker-c-suscripciones-usdt-design.md`

**Branch:** Continue on `feature/multimoneda` (C depends on A + D1). Do NOT touch the 13 pending files; explicit `git add` only.

**Secrets:** Reuse Eluvex NOWPayments — `NOWPAYMENTS_API_KEY=CP8WJSX-XC1M9GX-NFA4N46-33Q9M9M`, `NOWPAYMENTS_IPN_SECRET=o/FS8/ZQohAPcYRU6X+JbNfoJKScZlKM`. These go in `.env`/`.env.local` (gitignored) — NEVER commit them.

---

## File Structure

**New files:**
- `src/lib/billing/amount.ts` (+ `.test.ts`) — `computeMonthlyAmount`
- `src/lib/billing/status.ts` (+ `.test.ts`) — `deriveStatus`
- `src/lib/billing/ipn.ts` (+ `.test.ts`) — `verifyIpnSignature`
- `src/lib/billing/period.ts` (+ `.test.ts`) — `addOneMonth`
- `src/lib/billing/nowpayments.ts` — API client
- `src/lib/billing/subscription.ts` — service (summary, extendOnPayment, getOrCreate)
- `src/app/api/me/subscription/route.ts` — tenant summary
- `src/app/api/billing/checkout/route.ts` — create NOWPayments checkout
- `src/app/api/billing/webhook/route.ts` — IPN handler
- `src/app/api/admin/plan-prices/route.ts` — GET/PUT plan prices
- `src/components/billing/SubscriptionProvider.tsx` — context + `useSubscription`
- `src/components/billing/SubscriptionGate.tsx` — block/banner enforcement
- `src/app/billing/page.tsx` — "Mi suscripción" (Stocker-styled)

**Modified files:**
- `prisma/schema.prisma` — PlanPrice, Subscription, BillingPayment, enum, Business relation
- `prisma/seed.ts` — seed PlanPrice + a Subscription per business
- `src/app/providers.tsx` — mount `SubscriptionProvider`
- `src/app/super-admin/subscriptions/page.tsx` — real status + editable plan prices
- `.env` / `.env.local` — NOWPayments creds (NOT committed)

---

## Task 1: Schema — PlanPrice, Subscription, BillingPayment

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enum + models** (after the `Customer` model)

```prisma
enum SubscriptionStatus { ACTIVE GRACE EXPIRED }

model PlanPrice {
  id           String   @id @default(cuid())
  plan         Plan     @unique
  monthlyPrice Decimal  @default(0) @db.Decimal(18, 2)
  currency     Currency @default(USD)
  updatedAt    DateTime @updatedAt
  @@map("plan_prices")
}

model Subscription {
  id               String             @id @default(cuid())
  businessId       String             @unique
  business         Business           @relation(fields: [businessId], references: [id], onDelete: Cascade)
  status           SubscriptionStatus @default(EXPIRED)
  currentPeriodEnd DateTime?
  graceDays        Int                @default(5)
  lastPaymentAt    DateTime?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  payments BillingPayment[]
  @@map("subscriptions")
}

model BillingPayment {
  id                String       @id @default(cuid())
  subscriptionId    String
  subscription      Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  amount            Decimal      @db.Decimal(18, 2)
  currency          String       @default("usd")
  payCurrency       String?
  provider          String       @default("nowpayments")
  providerPaymentId String       @unique
  status            String
  appliedAt         DateTime?     // set when the period extension was applied (idempotency)
  paidAt            DateTime?
  createdAt         DateTime     @default(now())
  @@map("billing_payments")
}
```

- [ ] **Step 2: Add relation to `Business`**

```prisma
  subscription Subscription?
```

- [ ] **Step 3: Push to live DB**

Run: `npx prisma db push`
Expected: "in sync" + client generated.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: PlanPrice, Subscription, BillingPayment schema"
```

---

## Task 2: computeMonthlyAmount

**Files:**
- Create: `src/lib/billing/amount.ts`
- Test: `src/lib/billing/amount.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { computeMonthlyAmount } from './amount'

describe('computeMonthlyAmount', () => {
  it('plan only', () => {
    expect(computeMonthlyAmount(19.9, []).toString()).toBe('19.9')
  })
  it('plan + add-ons', () => {
    expect(computeMonthlyAmount(49.9, [10, 5.5]).toString()).toBe('65.4')
  })
  it('handles zero add-on and Decimal inputs', () => {
    expect(computeMonthlyAmount(new Decimal(0), [new Decimal(0)]).toString()).toBe('0')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- billing/amount`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import Decimal from 'decimal.js'

export function computeMonthlyAmount(planPrice: Decimal | string | number, addonPrices: (Decimal | string | number)[]): Decimal {
  let total = new Decimal(planPrice)
  for (const p of addonPrices) total = total.plus(new Decimal(p))
  return total
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- billing/amount`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/amount.ts src/lib/billing/amount.test.ts
git commit -m "feat: computeMonthlyAmount (plan + add-ons)"
```

---

## Task 3: deriveStatus

**Files:**
- Create: `src/lib/billing/status.ts`
- Test: `src/lib/billing/status.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { deriveStatus } from './status'

const end = new Date('2026-07-10T00:00:00Z')

describe('deriveStatus', () => {
  it('EXPIRED when no period', () => {
    expect(deriveStatus(null, 5, new Date('2026-07-01T00:00:00Z'))).toBe('EXPIRED')
  })
  it('ACTIVE before period end', () => {
    expect(deriveStatus(end, 5, new Date('2026-07-09T00:00:00Z'))).toBe('ACTIVE')
  })
  it('GRACE within grace window', () => {
    expect(deriveStatus(end, 5, new Date('2026-07-13T00:00:00Z'))).toBe('GRACE')
  })
  it('EXPIRED after grace window', () => {
    expect(deriveStatus(end, 5, new Date('2026-07-16T00:00:01Z'))).toBe('EXPIRED')
  })
  it('ACTIVE exactly at period end', () => {
    expect(deriveStatus(end, 5, end)).toBe('ACTIVE')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- billing/status`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
export type SubStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED'

export function deriveStatus(currentPeriodEnd: Date | null, graceDays: number, now: Date): SubStatus {
  if (!currentPeriodEnd) return 'EXPIRED'
  if (now.getTime() <= currentPeriodEnd.getTime()) return 'ACTIVE'
  const graceEnd = currentPeriodEnd.getTime() + graceDays * 24 * 60 * 60 * 1000
  if (now.getTime() <= graceEnd) return 'GRACE'
  return 'EXPIRED'
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- billing/status`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/status.ts src/lib/billing/status.test.ts
git commit -m "feat: deriveStatus (ACTIVE/GRACE/EXPIRED from dates)"
```

---

## Task 4: addOneMonth (period math)

**Files:**
- Create: `src/lib/billing/period.ts`
- Test: `src/lib/billing/period.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { addOneMonth, nextPeriodEnd } from './period'

describe('addOneMonth', () => {
  it('adds one calendar month', () => {
    expect(addOneMonth(new Date('2026-01-15T00:00:00Z')).toISOString()).toBe('2026-02-15T00:00:00.000Z')
  })
})

describe('nextPeriodEnd', () => {
  it('extends from now when expired (currentEnd in past)', () => {
    const now = new Date('2026-07-20T00:00:00Z')
    const r = nextPeriodEnd(new Date('2026-07-01T00:00:00Z'), now)
    expect(r.toISOString()).toBe('2026-08-20T00:00:00.000Z')
  })
  it('stacks from currentEnd when still active (future)', () => {
    const now = new Date('2026-07-20T00:00:00Z')
    const r = nextPeriodEnd(new Date('2026-07-25T00:00:00Z'), now)
    expect(r.toISOString()).toBe('2026-08-25T00:00:00.000Z')
  })
  it('extends from now when currentEnd is null', () => {
    const now = new Date('2026-07-20T00:00:00Z')
    expect(nextPeriodEnd(null, now).toISOString()).toBe('2026-08-20T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- billing/period`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
export function addOneMonth(d: Date): Date {
  const r = new Date(d)
  r.setUTCMonth(r.getUTCMonth() + 1)
  return r
}

/** Base = max(now, currentEnd); then +1 month. */
export function nextPeriodEnd(currentEnd: Date | null, now: Date): Date {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now
  return addOneMonth(base)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- billing/period`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/period.ts src/lib/billing/period.test.ts
git commit -m "feat: period math (addOneMonth, nextPeriodEnd)"
```

---

## Task 5: verifyIpnSignature

**Files:**
- Create: `src/lib/billing/ipn.ts`
- Test: `src/lib/billing/ipn.test.ts`

NOWPayments signs the IPN with HMAC-SHA512 over the JSON body with **keys sorted alphabetically**, using the IPN secret; the signature arrives in the `x-nowpayments-sig` header.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { verifyIpnSignature, sortedJson } from './ipn'

const secret = 'test-secret'
const body = { payment_id: 123, payment_status: 'finished', order_id: 'biz_1' }

function sign(obj: any) {
  return crypto.createHmac('sha512', secret).update(sortedJson(obj)).digest('hex')
}

describe('verifyIpnSignature', () => {
  it('accepts a valid signature', () => {
    expect(verifyIpnSignature(body, sign(body), secret)).toBe(true)
  })
  it('rejects a tampered body', () => {
    expect(verifyIpnSignature({ ...body, payment_status: 'failed' }, sign(body), secret)).toBe(false)
  })
  it('rejects a wrong secret', () => {
    expect(verifyIpnSignature(body, sign(body), 'other')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- billing/ipn`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import crypto from 'crypto'

/** JSON with recursively sorted keys (NOWPayments IPN convention). */
export function sortedJson(obj: any): string {
  return JSON.stringify(sortKeys(obj))
}
function sortKeys(v: any): any {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    return Object.keys(v).sort().reduce((acc: any, k) => { acc[k] = sortKeys(v[k]); return acc }, {})
  }
  return v
}

export function verifyIpnSignature(body: any, signature: string | null | undefined, secret: string): boolean {
  if (!signature) return false
  const expected = crypto.createHmac('sha512', secret).update(sortedJson(body)).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- billing/ipn`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/ipn.ts src/lib/billing/ipn.test.ts
git commit -m "feat: verifyIpnSignature (HMAC-SHA512, sorted JSON)"
```

---

## Task 6: NOWPayments client + env

**Files:**
- Create: `src/lib/billing/nowpayments.ts`
- Modify: `.env`, `.env.local` (NOT committed)

- [ ] **Step 1: Add env vars** to `.env` AND `.env.local` (both gitignored — verify with `git check-ignore .env .env.local`):
```
NOWPAYMENTS_API_KEY="CP8WJSX-XC1M9GX-NFA4N46-33Q9M9M"
NOWPAYMENTS_IPN_SECRET="o/FS8/ZQohAPcYRU6X+JbNfoJKScZlKM"
APP_URL="http://localhost:3000"
```

- [ ] **Step 2: Implement the client**

```ts
const BASE = 'https://api.nowpayments.io/v1'

export interface CreateInvoiceInput { amount: number; orderId: string; successUrl: string; cancelUrl: string }
export interface CreateInvoiceResult { id: string; invoiceUrl: string }

export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  const res = await fetch(`${BASE}/invoice`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.NOWPAYMENTS_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      price_amount: input.amount,
      price_currency: 'usd',
      pay_currency: 'usdttrc20',
      order_id: input.orderId,
      ipn_callback_url: `${process.env.APP_URL}/api/billing/webhook`,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }),
  })
  if (!res.ok) throw new Error(`nowpayments invoice failed: ${res.status}`)
  const data = await res.json()
  return { id: String(data.id), invoiceUrl: data.invoice_url }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit** (code only — NOT env)

```bash
git add src/lib/billing/nowpayments.ts
git commit -m "feat: NOWPayments invoice client"
```
> Verify `.env`/`.env.local` are NOT staged: `git status --short .env .env.local` must be empty.

---

## Task 7: Subscription service

**Files:**
- Create: `src/lib/billing/subscription.ts`
- Test: `src/lib/billing/subscription.test.ts`

- [ ] **Step 1: Write the failing test** (period extension idempotency, with a mocked prisma)

```ts
import { describe, it, expect, vi } from 'vitest'
import { applyPayment } from './subscription'

function prismaMock(payment: any, sub: any) {
  const db = {
    billingPayment: {
      findUnique: vi.fn().mockResolvedValue(payment),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...payment, ...data })),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(sub),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...sub, ...data })),
    },
  }
  return { $transaction: (fn: any) => fn(db), _db: db } as any
}

describe('applyPayment', () => {
  it('extends the period once for a finished payment', async () => {
    const prisma = prismaMock(
      { id: 'p1', subscriptionId: 's1', appliedAt: null },
      { id: 's1', currentPeriodEnd: null },
    )
    await applyPayment(prisma, 'nowpid', new Date('2026-07-20T00:00:00Z'))
    expect(prisma._db.subscription.update).toHaveBeenCalled()
  })
  it('is idempotent: already-applied payment does not extend again', async () => {
    const prisma = prismaMock(
      { id: 'p1', subscriptionId: 's1', appliedAt: new Date('2026-07-01T00:00:00Z') },
      { id: 's1', currentPeriodEnd: new Date('2026-08-01T00:00:00Z') },
    )
    await applyPayment(prisma, 'nowpid', new Date('2026-07-20T00:00:00Z'))
    expect(prisma._db.subscription.update).not.toHaveBeenCalled()
  })
})
```
NOTE: `findUnique` for the payment is by `providerPaymentId`; the mock ignores the arg, so it's fine.

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- billing/subscription`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import type { PrismaClient } from '@prisma/client'
import { nextPeriodEnd } from './period'

/** Idempotently apply a finished payment: extend the subscription's period by one month. */
export async function applyPayment(prisma: PrismaClient, providerPaymentId: string, now: Date): Promise<void> {
  await prisma.$transaction(async (tx: any) => {
    const payment = await tx.billingPayment.findUnique({ where: { providerPaymentId } })
    if (!payment) throw new Error('payment not found')
    if (payment.appliedAt) return // already applied — idempotent
    const sub = await tx.subscription.findUnique({ where: { id: payment.subscriptionId } })
    if (!sub) throw new Error('subscription not found')
    const newEnd = nextPeriodEnd(sub.currentPeriodEnd ?? null, now)
    await tx.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: newEnd, status: 'ACTIVE', lastPaymentAt: now } })
    await tx.billingPayment.update({ where: { id: payment.id }, data: { appliedAt: now, paidAt: now, status: 'finished' } })
  })
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- billing/subscription`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/subscription.ts src/lib/billing/subscription.test.ts
git commit -m "feat: applyPayment (idempotent period extension)"
```

---

## Task 8: Seed plan prices + subscriptions

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add seeding** before the final success log in `prisma/seed.ts`

```ts
  // Precios de plan (Bloque C)
  console.log('💳 Creando precios de plan...')
  const planPrices = [
    { plan: 'STARTER' as const, monthlyPrice: 19.9 },
    { plan: 'GROWTH' as const, monthlyPrice: 49.9 },
    { plan: 'ENTERPRISE' as const, monthlyPrice: 199 },
  ]
  for (const p of planPrices) {
    await prisma.planPrice.upsert({ where: { plan: p.plan }, update: {}, create: { plan: p.plan, monthlyPrice: p.monthlyPrice } })
  }
  // Suscripción por negocio (arranca EXPIRED)
  const allBiz = await prisma.business.findMany({ select: { id: true } })
  for (const b of allBiz) {
    await prisma.subscription.upsert({ where: { businessId: b.id }, update: {}, create: { businessId: b.id, status: 'EXPIRED' } })
  }
  console.log('✅ Precios de plan + suscripciones creados')
```

- [ ] **Step 2: Apply the seed rows to the live DB WITHOUT wiping demo data** — run a one-off upsert via a temporary script (the full `seed.ts` wipes data; do NOT run it). Create `_seedC.ts` at project root:
```ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  for (const p of [['STARTER',19.9],['GROWTH',49.9],['ENTERPRISE',199]] as const) {
    await prisma.planPrice.upsert({ where: { plan: p[0] as any }, update: {}, create: { plan: p[0] as any, monthlyPrice: p[1] } })
  }
  const biz = await prisma.business.findMany({ select: { id: true } })
  for (const b of biz) await prisma.subscription.upsert({ where: { businessId: b.id }, update: {}, create: { businessId: b.id, status: 'EXPIRED' } })
  console.log('seeded', biz.length, 'subscriptions')
}
main().finally(() => prisma.$disconnect())
```
Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' _seedC.ts` then `rm -f _seedC.ts`
Expected: "seeded N subscriptions". Then delete the temp file (do NOT commit `_seedC.ts`).

- [ ] **Step 3: Commit** (only seed.ts)

```bash
git add prisma/seed.ts
git commit -m "feat: seed plan prices + subscriptions"
```

---

## Task 9: Subscription summary + tenant API

**Files:**
- Create: `src/app/api/me/subscription/route.ts`

- [ ] **Step 1: Implement GET** (summary: status, amount, breakdown, periodEnd; lazily create + refresh status)

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/me/subscription/route.ts
git commit -m "feat: GET /api/me/subscription (status + amount + breakdown)"
```

---

## Task 10: Checkout + webhook APIs

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`
- Create: `src/app/api/billing/webhook/route.ts`

- [ ] **Step 1: Checkout** (`src/app/api/billing/checkout/route.ts`)

```ts
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
```

- [ ] **Step 2: Webhook** (`src/app/api/billing/webhook/route.ts`)

```ts
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
```
NOTE: NOWPayments invoice IPNs report `payment_id` and `payment_status`. If the account sends `id`
instead, the `?? body.id` covers it. The `providerPaymentId` stored at checkout is the invoice `id`;
if the IPN's `payment_id` differs from the invoice `id`, match on `order_id` (businessId) as a fallback
in a follow-up — for MVP the invoice id path is used.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors; both routes present.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/billing/checkout/route.ts src/app/api/billing/webhook/route.ts
git commit -m "feat: billing checkout + IPN webhook (signed, idempotent)"
```

---

## Task 11: Admin plan prices API + subscriptions page

**Files:**
- Create: `src/app/api/admin/plan-prices/route.ts`
- Modify: `src/app/super-admin/subscriptions/page.tsx`

- [ ] **Step 1: Plan prices API**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function superAdmin() {
  const s = await getServerSession(authOptions)
  return s && s.user.role === 'SUPER_ADMIN' ? s : null
}
const schema = z.object({ plan: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']), monthlyPrice: z.number().min(0) })

export async function GET() {
  if (!(await superAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json(await prisma.planPrice.findMany({ orderBy: { plan: 'asc' } }))
}
export async function PUT(req: NextRequest) {
  if (!(await superAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const updated = await prisma.planPrice.upsert({
    where: { plan: parsed.data.plan },
    update: { monthlyPrice: parsed.data.monthlyPrice },
    create: { plan: parsed.data.plan, monthlyPrice: parsed.data.monthlyPrice },
  })
  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Update the subscriptions page** — replace the hardcoded `planPrices` object in `src/app/super-admin/subscriptions/page.tsx` with a `GET /api/admin/plan-prices` fetch, render an editable price input per plan saving via `PUT`, and keep the existing per-client list (now showing each client's real subscription status if available). Verify `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/plan-prices/route.ts src/app/super-admin/subscriptions/page.tsx
git commit -m "feat: admin plan-prices API + editable subscriptions page"
```

---

## Task 12: SubscriptionProvider + gate + /billing page

**Files:**
- Create: `src/components/billing/SubscriptionProvider.tsx`
- Create: `src/components/billing/SubscriptionGate.tsx`
- Create: `src/app/billing/page.tsx`
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Provider** (`src/components/billing/SubscriptionProvider.tsx`)

```tsx
'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface SubSummary { status: 'ACTIVE' | 'GRACE' | 'EXPIRED'; plan: string; planPrice: string; addons: { name: string; price: string }[]; amount: string; currentPeriodEnd: string | null; graceDays: number }
interface Ctx { sub: SubSummary | null; loading: boolean; refresh: () => void }
const C = createContext<Ctx>({ sub: null, loading: true, refresh: () => {} })

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [sub, setSub] = useState<SubSummary | null>(null)
  const [loading, setLoading] = useState(true)
  function refresh() {
    fetch('/api/me/subscription').then(r => r.ok ? r.json() : null).then(d => setSub(d)).catch(() => setSub(null)).finally(() => setLoading(false))
  }
  useEffect(() => { refresh() }, [])
  return <C.Provider value={{ sub, loading, refresh }}>{children}</C.Provider>
}
export const useSubscription = () => useContext(C)
```

- [ ] **Step 2: Gate + banner** (`src/components/billing/SubscriptionGate.tsx`)

```tsx
'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSubscription } from './SubscriptionProvider'

const ALLOW = ['/billing', '/login', '/select-business']

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { sub, loading } = useSubscription()
  const pathname = usePathname()
  const router = useRouter()
  const exempt = ALLOW.some(p => pathname?.startsWith(p)) || pathname?.startsWith('/super-admin')

  useEffect(() => {
    if (!loading && sub?.status === 'EXPIRED' && !exempt) router.replace('/billing')
  }, [loading, sub, exempt, router])

  return (
    <>
      {sub?.status === 'GRACE' && !exempt && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-sm px-4 py-2 text-center">
          Tu suscripción venció. Paga antes de que termine el período de gracia para no perder acceso.{' '}
          <a href="/billing" className="underline font-medium">Pagar ahora</a>
        </div>
      )}
      {children}
    </>
  )
}
```

- [ ] **Step 3: Mount** both in `src/app/providers.tsx` — wrap the existing tree so `SubscriptionProvider` is above `SubscriptionGate`, and `SubscriptionGate` wraps children (inside the authenticated providers, alongside `ModulesProvider`). Verify `npm run build`.

- [ ] **Step 4: /billing page (Stocker-styled)** (`src/app/billing/page.tsx`)

```tsx
'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useSubscription } from '@/components/billing/SubscriptionProvider'

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  GRACE: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  EXPIRED: 'text-red-400 bg-red-500/10 border-red-500/30',
}

export default function BillingPage() {
  const { sub, loading } = useSubscription()
  const [paying, setPaying] = useState(false)

  async function pay() {
    setPaying(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const d = await res.json()
      if (res.ok && d.invoiceUrl) window.location.href = d.invoiceUrl
      else toast.error(d.error || 'Error al iniciar el pago')
    } finally { setPaying(false) }
  }

  if (loading) return <div className="min-h-screen bg-background p-8 text-muted-foreground">Cargando…</div>

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <img src="/stocker-icon.png" alt="Stocker" className="h-10 w-10 rounded-lg" />
          <h1 className="text-2xl font-semibold text-foreground">Mi suscripción</h1>
        </div>

        {sub && (
          <>
            <div className={`inline-flex rounded-full border px-3 py-1 text-sm ${STATUS_STYLE[sub.status]}`}>
              {sub.status === 'ACTIVE' ? 'Activa' : sub.status === 'GRACE' ? 'En gracia' : 'Vencida'}
            </div>

            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <div className="flex justify-between text-foreground"><span>Plan {sub.plan}</span><span>${sub.planPrice}</span></div>
              {sub.addons.map((a, i) => (
                <div key={i} className="flex justify-between text-muted-foreground text-sm"><span>+ {a.name}</span><span>${a.price}</span></div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground">
                <span>Total mensual</span><span>${sub.amount}</span>
              </div>
            </div>

            {sub.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">Próximo vencimiento: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
            )}

            <button onClick={pay} disabled={paying}
              className="w-full rounded-lg bg-primary py-3 text-primary-foreground font-medium disabled:opacity-60">
              {paying ? 'Redirigiendo…' : 'Pagar en USDT'}
            </button>
            <p className="text-center text-xs text-muted-foreground">Pago seguro en USDT (TRC-20) vía NOWPayments</p>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: compiles; `/billing` present.

- [ ] **Step 6: Commit**

```bash
git add src/components/billing/SubscriptionProvider.tsx src/components/billing/SubscriptionGate.tsx src/app/billing/page.tsx src/app/providers.tsx
git commit -m "feat: subscription provider + gate + Stocker-styled billing page"
```

---

## Task 13: Full verification

- [ ] **Step 1: Tests**

Run: `npm test`
Expected: all pass (currency, rates, modules, sales, billing/amount, billing/status, billing/period, billing/ipn, billing/subscription).

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors; build succeeds.

- [ ] **Step 3: Confirm pending files + secrets**

Run: `git status --short | grep -c '^ M'`
Expected: 13.
Run: `git status --short .env .env.local`
Expected: empty (secrets not tracked).

---

## Self-Review checklist (done while writing)

- **Spec coverage:** plan prices in DB + admin edit (Tasks 1, 8, 11); Subscription + BillingPayment (Task 1); computeMonthlyAmount (Task 2); deriveStatus (Task 3); period math (Task 4); IPN HMAC verify (Task 5); NOWPayments client (Task 6); idempotent applyPayment (Task 7); tenant summary API (Task 9); checkout + webhook (Task 10); enforcement provider/gate + banner (Task 12); Stocker-styled /billing (Task 12); testing (Tasks 2–5, 7, 13).
- **Placeholder scan:** all code steps contain real code. Steps 11.2 / 12.3 describe wiring into existing files with exact behavior (require reading the target), not vague placeholders.
- **Type consistency:** `deriveStatus(end, graceDays, now)`, `nextPeriodEnd(currentEnd, now)`, `applyPayment(prisma, providerPaymentId, now)`, `verifyIpnSignature(body, sig, secret)`, `computeMonthlyAmount(planPrice, addonPrices[])`, `createInvoice({amount, orderId, successUrl, cancelUrl})` — consistent across tasks; `SubSummary` shape matches `/api/me/subscription` response.
- **Secrets:** creds only in `.env`/`.env.local` (gitignored); Task 6 & 13 explicitly verify they are not staged.
- **Deferred (documented):** crypto auto-recurrence (checkout per cycle); annual/proration; email reminders; server-side hard block on every mutation API (MVP uses client gate + authoritative status API; EXPIRED redirect covers UX). IPN payment_id vs invoice id fallback noted in Task 10.
