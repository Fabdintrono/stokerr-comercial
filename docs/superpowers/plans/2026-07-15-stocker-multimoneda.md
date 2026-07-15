# Stocker Multi-moneda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native per-tenant multi-currency (VES/BRL/USD, extensible) with daily rates, frozen-on-transaction rates, a single Decimal-based conversion helper, dual-currency display, an onboarding tour framework, and Coolify deployment config.

**Architecture:** Per-tenant `baseCurrency` + `enabledCurrencies` + `secondaryCurrency` on `Business`. Daily rates live in an `ExchangeRate` table (one row per tenant/currency/day) fed by pluggable providers with manual override and carry-forward fallback. All money math flows through one `lib/currency` helper using `Prisma.Decimal`. Every persisted money amount stores `{ currency, rateToBase }` so historical reports never shift. UI shows an anchor + secondary currency (dual, configurable). A small driver.js-based tour framework is bootstrapped here and extended by later blocks.

**Tech Stack:** Next.js 16 (App Router), Prisma + PostgreSQL, decimal.js (via Prisma.Decimal), Vitest (new), driver.js (new), Docker + Coolify.

**Spec:** `docs/superpowers/specs/2026-07-15-stocker-multimoneda-design.md`

---

## File Structure

**New files:**
- `vitest.config.ts` — test runner config
- `src/lib/currency/currencies.ts` — currency metadata (decimals, symbol, locale)
- `src/lib/currency/convert.ts` — `convert()` + `formatMoney()` (pure, Decimal)
- `src/lib/currency/convert.test.ts` — unit tests
- `src/lib/rates/provider.ts` — `RateProvider` interface + registry
- `src/lib/rates/manualProvider.ts` — no-op/manual provider
- `src/lib/rates/provider.test.ts`
- `src/lib/rates/rateEngine.ts` — `getEffectiveRate()` with carry-forward
- `src/lib/rates/rateEngine.test.ts`
- `src/app/api/health/route.ts` — Coolify healthcheck
- `src/app/api/business/currency/route.ts` — GET/PUT tenant currency settings
- `src/app/api/rates/route.ts` — GET rates, PUT manual override
- `src/components/currency/DualPrice.tsx` — reusable dual-currency display
- `src/components/tour/TourProvider.tsx` — driver.js wrapper + registry
- `src/components/tour/steps.currency.ts` — currency tour steps
- `src/app/[role]/settings/currency/page.tsx` — currency settings UI (see Task 8 for exact path)
- `src/app/[role]/settings/rates/page.tsx` — daily rate override UI
- `Dockerfile`, `.dockerignore` — Coolify deploy

**Modified files:**
- `prisma/schema.prisma` — enums + Business fields + ExchangeRate + freeze fields
- `src/app/api/orders/route.ts` (and order write path) — stamp `currency` + `rateToBase`
- `next.config.js` — `output: 'standalone'` for Docker

---

## Task 0: Test infrastructure (Vitest)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDeps)

- [ ] **Step 1: Install Vitest**

Run: `cd /home/fabriziodp/.openclaw/workspace/stocker && npm i -D vitest @vitest/coverage-v8`
Expected: packages added, no errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 3: Add test scripts to `package.json`**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify runner works (no tests yet)**

Run: `npm test`
Expected: exits 0 with "No test files found" (or passes with 0 tests).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

## Task 1: Currency metadata

**Files:**
- Create: `src/lib/currency/currencies.ts`
- Test: `src/lib/currency/currencies.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/currency/currencies.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { CURRENCY_META, currencyDecimals } from './currencies'

describe('currency metadata', () => {
  it('knows USD has 2 decimals', () => {
    expect(currencyDecimals('USD')).toBe(2)
  })
  it('knows VES defaults to 0 decimals', () => {
    expect(currencyDecimals('VES')).toBe(0)
  })
  it('exposes a symbol per currency', () => {
    expect(CURRENCY_META.USD.symbol).toBe('$')
    expect(CURRENCY_META.VES.symbol).toBe('Bs')
    expect(CURRENCY_META.BRL.symbol).toBe('R$')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- currencies`
Expected: FAIL — cannot find module `./currencies`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/currency/currencies.ts`:
```ts
export type CurrencyCode = 'USD' | 'VES' | 'BRL'

export interface CurrencyMeta {
  symbol: string
  decimals: number
  locale: string
}

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  USD: { symbol: '$', decimals: 2, locale: 'en-US' },
  VES: { symbol: 'Bs', decimals: 0, locale: 'es-VE' },
  BRL: { symbol: 'R$', decimals: 2, locale: 'pt-BR' },
}

export function currencyDecimals(code: CurrencyCode): number {
  return CURRENCY_META[code].decimals
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- currencies`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/currency/currencies.ts src/lib/currency/currencies.test.ts
git commit -m "feat: currency metadata (symbol, decimals, locale)"
```

---

## Task 2: Conversion + format helper

**Files:**
- Create: `src/lib/currency/convert.ts`
- Test: `src/lib/currency/convert.test.ts`

Rate semantics (from spec): `rate` for a currency = **units of base currency per 1 unit of that currency**. Base currency always has rate `1`.

- [ ] **Step 1: Write the failing test**

`src/lib/currency/convert.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { convert, formatMoney } from './convert'

// rates are "units of base (USD) per 1 unit of currency"
const rates = { USD: new Decimal(1), VES: new Decimal('0.025'), BRL: new Decimal('0.20') }

describe('convert', () => {
  it('returns same amount when from === to', () => {
    expect(convert(new Decimal(10), 'USD', 'USD', rates).toString()).toBe('10')
  })
  it('converts base -> secondary (USD 10 -> VES 400)', () => {
    // 10 USD / 0.025 = 400 VES
    expect(convert(new Decimal(10), 'USD', 'VES', rates).toString()).toBe('400')
  })
  it('converts secondary -> base (VES 400 -> USD 10)', () => {
    expect(convert(new Decimal(400), 'VES', 'USD', rates).toString()).toBe('10')
  })
  it('round-trips through base without loss', () => {
    const back = convert(convert(new Decimal(7), 'BRL', 'VES', rates), 'VES', 'BRL', rates)
    expect(back.toDecimalPlaces(6).toString()).toBe('7')
  })
})

describe('formatMoney', () => {
  it('formats USD with 2 decimals and symbol', () => {
    expect(formatMoney(new Decimal('10.5'), 'USD')).toBe('$10.50')
  })
  it('rounds VES to integer', () => {
    expect(formatMoney(new Decimal('399.6'), 'VES')).toBe('Bs 400')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- convert`
Expected: FAIL — cannot find module `./convert`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/currency/convert.ts`:
```ts
import Decimal from 'decimal.js'
import { CurrencyCode, CURRENCY_META } from './currencies'

type Rates = Record<CurrencyCode, Decimal>

/** Convert `amount` from currency `from` to `to` using base-relative rates. */
export function convert(amount: Decimal, from: CurrencyCode, to: CurrencyCode, rates: Rates): Decimal {
  if (from === to) return amount
  const inBase = amount.mul(rates[from]) // to base
  return inBase.div(rates[to])           // base -> target
}

/** Format with the currency's decimals + symbol. */
export function formatMoney(amount: Decimal, currency: CurrencyCode): string {
  const { symbol, decimals } = CURRENCY_META[currency]
  const rounded = amount.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP)
  const n = Number(rounded).toLocaleString(CURRENCY_META[currency].locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${symbol}${symbol === 'Bs' || symbol === 'R$' ? ' ' : ''}${n}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- convert`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/currency/convert.ts src/lib/currency/convert.test.ts
git commit -m "feat: Decimal-based currency convert + formatMoney"
```

---

## Task 2b: Barrel export

**Files:**
- Create: `src/lib/currency/index.ts`

- [ ] **Step 1: Create barrel**

```ts
export * from './currencies'
export * from './convert'
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/currency/index.ts
git commit -m "chore: currency barrel export"
```

---

## Task 3: Schema — enums, Business fields, ExchangeRate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums** (near other enums at top of schema)

```prisma
enum Currency {
  USD
  VES
  BRL
}

enum RateSource {
  AUTO_BCV
  AUTO_FOREX
  MANUAL
}
```

- [ ] **Step 2: Add fields to `Business`** (inside `model Business`, after `maxUsers`)

```prisma
  baseCurrency      Currency   @default(USD)
  secondaryCurrency Currency?
  enabledCurrencies Currency[] @default([USD])
  multiCurrency     Boolean    @default(false)
  rateSource        RateSource @default(MANUAL)
```

Add relation inside `Business` (with the other relations):
```prisma
  exchangeRates ExchangeRate[]
```

- [ ] **Step 3: Add `ExchangeRate` model** (after `Business`)

```prisma
model ExchangeRate {
  id         String     @id @default(cuid())
  businessId String
  business   Business   @relation(fields: [businessId], references: [id], onDelete: Cascade)
  currency   Currency
  rate       Decimal    @db.Decimal(18, 6)
  date       DateTime   @db.Date
  source     RateSource
  createdAt  DateTime   @default(now())

  @@unique([businessId, currency, date])
  @@index([businessId, currency, date])
  @@map("exchange_rates")
}
```

- [ ] **Step 4: Create migration**

Run: `npx prisma migrate dev --name multicurrency_core`
Expected: migration created + applied to dev DB; `prisma generate` runs.

- [ ] **Step 5: Verify client types**

Run: `npx tsc --noEmit`
Expected: no errors from the new Prisma types.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: multi-currency schema (enums, Business fields, ExchangeRate)"
```

---

## Task 4: Rate provider abstraction

**Files:**
- Create: `src/lib/rates/provider.ts`
- Create: `src/lib/rates/manualProvider.ts`
- Test: `src/lib/rates/provider.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/rates/provider.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { getProvider } from './provider'

describe('rate provider registry', () => {
  it('returns the manual provider by default', async () => {
    const p = getProvider('MANUAL')
    expect(p.name).toBe('MANUAL')
    // manual provider does not fetch; returns null so caller keeps existing/manual rate
    expect(await p.fetchRate('VES', new Date('2026-07-15'))).toBeNull()
  })
  it('falls back to manual for unknown source', () => {
    expect(getProvider('AUTO_BCV').name).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- rates/provider`
Expected: FAIL — cannot find module `./provider`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/rates/provider.ts`:
```ts
import Decimal from 'decimal.js'
import { CurrencyCode } from '@/lib/currency'
import { manualProvider } from './manualProvider'

export interface RateProvider {
  name: string
  /** Returns base-relative rate for `currency` on `date`, or null if unavailable. */
  fetchRate(currency: CurrencyCode, date: Date): Promise<Decimal | null>
}

const REGISTRY: Record<string, RateProvider> = {
  MANUAL: manualProvider,
  // AUTO_BCV / AUTO_FOREX registered in later blocks; fall back to manual for now.
}

export function getProvider(source: string): RateProvider {
  return REGISTRY[source] ?? manualProvider
}
```

`src/lib/rates/manualProvider.ts`:
```ts
import { RateProvider } from './provider'

export const manualProvider: RateProvider = {
  name: 'MANUAL',
  async fetchRate() {
    return null // manual: never auto-fetches; admin sets the rate explicitly
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- rates/provider`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rates/provider.ts src/lib/rates/manualProvider.ts src/lib/rates/provider.test.ts
git commit -m "feat: rate provider abstraction + manual provider"
```

> NOTE: BCV/forex auto-providers are intentionally deferred (`AUTO_BCV` source pending a confirmed
> data source — see spec §11). Registry already supports plugging them in without changing callers.

---

## Task 5: Rate engine (effective rate with carry-forward)

**Files:**
- Create: `src/lib/rates/rateEngine.ts`
- Test: `src/lib/rates/rateEngine.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/rates/rateEngine.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import Decimal from 'decimal.js'
import { effectiveRate } from './rateEngine'

// Fake row loader: returns most recent rate on/before date, or null
function loader(rows: { currency: string; rate: string; date: string }[]) {
  return async (currency: string, date: Date) => {
    const match = rows
      .filter(r => r.currency === currency && new Date(r.date) <= date)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    return match ? new Decimal(match.rate) : null
  }
}

describe('effectiveRate', () => {
  it('base currency is always 1', async () => {
    const r = await effectiveRate('USD', 'USD', new Date('2026-07-15'), loader([]))
    expect(r.toString()).toBe('1')
  })
  it('uses the row for the given day', async () => {
    const r = await effectiveRate('VES', 'USD', new Date('2026-07-15'),
      loader([{ currency: 'VES', rate: '0.025', date: '2026-07-15' }]))
    expect(r.toString()).toBe('0.025')
  })
  it('carries forward the last known rate when today has none', async () => {
    const r = await effectiveRate('VES', 'USD', new Date('2026-07-15'),
      loader([{ currency: 'VES', rate: '0.026', date: '2026-07-14' }]))
    expect(r.toString()).toBe('0.026')
  })
  it('throws if no rate ever exists (never returns 0)', async () => {
    await expect(effectiveRate('VES', 'USD', new Date('2026-07-15'), loader([])))
      .rejects.toThrow(/no rate/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- rateEngine`
Expected: FAIL — cannot find module `./rateEngine`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/rates/rateEngine.ts`:
```ts
import Decimal from 'decimal.js'
import { CurrencyCode } from '@/lib/currency'

/** Loads the latest rate on/before `date` for a currency, or null. */
export type RateLoader = (currency: CurrencyCode, date: Date) => Promise<Decimal | null>

/** Base-relative effective rate for `currency`, with carry-forward. Base === 1. */
export async function effectiveRate(
  currency: CurrencyCode,
  baseCurrency: CurrencyCode,
  date: Date,
  load: RateLoader,
): Promise<Decimal> {
  if (currency === baseCurrency) return new Decimal(1)
  const rate = await load(currency, date)
  if (!rate) throw new Error(`no rate available for ${currency} on ${date.toISOString()}`)
  return rate
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- rateEngine`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rates/rateEngine.ts src/lib/rates/rateEngine.test.ts
git commit -m "feat: rate engine effectiveRate with carry-forward"
```

---

## Task 6: Prisma-backed rate loader

**Files:**
- Create: `src/lib/rates/loadRates.ts`
- Test: `src/lib/rates/loadRates.test.ts` (uses a mocked prisma)

- [ ] **Step 1: Write the failing test**

`src/lib/rates/loadRates.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import Decimal from 'decimal.js'
import { makeRateLoader } from './loadRates'

const fakePrisma = {
  exchangeRate: {
    findFirst: vi.fn().mockResolvedValue({ rate: new Decimal('0.025') }),
  },
} as any

describe('makeRateLoader', () => {
  it('queries latest rate on/before date for a business', async () => {
    const load = makeRateLoader(fakePrisma, 'biz_1')
    const r = await load('VES', new Date('2026-07-15'))
    expect(r?.toString()).toBe('0.025')
    expect(fakePrisma.exchangeRate.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ businessId: 'biz_1', currency: 'VES' }),
      orderBy: { date: 'desc' },
    }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- loadRates`
Expected: FAIL — cannot find module `./loadRates`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/rates/loadRates.ts`:
```ts
import Decimal from 'decimal.js'
import type { PrismaClient } from '@prisma/client'
import { CurrencyCode } from '@/lib/currency'
import { RateLoader } from './rateEngine'

export function makeRateLoader(prisma: PrismaClient, businessId: string): RateLoader {
  return async (currency: CurrencyCode, date: Date) => {
    const row = await prisma.exchangeRate.findFirst({
      where: { businessId, currency: currency as any, date: { lte: date } },
      orderBy: { date: 'desc' },
    })
    return row ? new Decimal(row.rate.toString()) : null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- loadRates`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rates/loadRates.ts src/lib/rates/loadRates.test.ts
git commit -m "feat: prisma-backed rate loader"
```

---

## Task 7: Freeze rate on transactions (schema)

**Files:**
- Modify: `prisma/schema.prisma` (Order + Payment)

- [ ] **Step 1: Add freeze fields to `Order`** (inside `model Order`)

```prisma
  currency   Currency @default(USD)
  rateToBase Decimal  @default(1) @db.Decimal(18, 6)
```

- [ ] **Step 2: Add freeze fields to `Payment`** (inside `model Payment`)

```prisma
  currency   Currency @default(USD)
  rateToBase Decimal  @default(1) @db.Decimal(18, 6)
```

- [ ] **Step 3: Create migration (backfills defaults for existing rows)**

Run: `npx prisma migrate dev --name freeze_transaction_currency`
Expected: existing rows get `currency = USD`, `rateToBase = 1` via defaults.

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: freeze currency + rateToBase on Order and Payment"
```

---

## Task 8: Stamp rate when creating an order

**Files:**
- Modify: `src/app/api/orders/route.ts`

- [ ] **Step 1: Read the current POST handler**

Run: `sed -n '1,120p' src/app/api/orders/route.ts` — locate the `prisma.order.create` call and the resolved `businessId` + tenant `baseCurrency`.

- [ ] **Step 2: Compute + stamp the frozen rate before create**

In the POST handler, before `prisma.order.create`, add:
```ts
import { makeRateLoader } from '@/lib/rates/loadRates'
import { effectiveRate } from '@/lib/rates/rateEngine'
// ...
const business = await prisma.business.findUnique({ where: { id: businessId } })
const orderCurrency = (body.currency ?? business!.baseCurrency) as any
const rate = await effectiveRate(
  orderCurrency,
  business!.baseCurrency as any,
  new Date(),
  makeRateLoader(prisma, businessId),
)
```
Then include in the `data` of `order.create`:
```ts
  currency: orderCurrency,
  rateToBase: rate.toString(),
```

- [ ] **Step 3: Manual verify (no unit test — thin glue over tested units)**

Run: `npx tsc --noEmit`
Expected: no type errors. (Behavioral coverage: effectiveRate + loader already unit-tested.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat: stamp frozen currency + rate on order creation"
```

---

## Task 9: Tenant currency settings API

**Files:**
- Create: `src/app/api/business/currency/route.ts`

- [ ] **Step 1: Implement GET + PUT**

`src/app/api/business/currency/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  baseCurrency: z.enum(['USD', 'VES', 'BRL']),
  secondaryCurrency: z.enum(['USD', 'VES', 'BRL']).nullable(),
  enabledCurrencies: z.array(z.enum(['USD', 'VES', 'BRL'])).min(1),
  multiCurrency: z.boolean(),
  rateSource: z.enum(['AUTO_BCV', 'AUTO_FOREX', 'MANUAL']),
})

async function resolveBusinessId(session: any, req: NextRequest): Promise<string | null> {
  const cookie = req.cookies.get('businessId')?.value
  if (cookie) return cookie
  const ub = await prisma.userBusiness.findFirst({ where: { userId: session.user.id } })
  return ub?.businessId ?? null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await resolveBusinessId(session, req)
  if (!businessId) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const b = await prisma.business.findUnique({
    where: { id: businessId },
    select: { baseCurrency: true, secondaryCurrency: true, enabledCurrencies: true, multiCurrency: true, rateSource: true },
  })
  return NextResponse.json(b)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = await resolveBusinessId(session, req)
  if (!businessId) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const data = parsed.data
  if (!data.enabledCurrencies.includes(data.baseCurrency)) {
    return NextResponse.json({ error: 'base currency must be enabled' }, { status: 422 })
  }
  const updated = await prisma.business.update({ where: { id: businessId }, data })
  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors. (If `session.user.id` is untyped, use the existing session id accessor used elsewhere in the codebase — check `src/lib/auth.ts` callbacks.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/business/currency/route.ts
git commit -m "feat: tenant currency settings API (GET/PUT)"
```

---

## Task 10: Daily rate API (view + manual override)

**Files:**
- Create: `src/app/api/rates/route.ts`

- [ ] **Step 1: Implement GET (today's effective rates) + PUT (manual override)**

`src/app/api/rates/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const putSchema = z.object({
  currency: z.enum(['USD', 'VES', 'BRL']),
  rate: z.string().regex(/^\d+(\.\d+)?$/),
})

function today(): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d
}

async function businessId(session: any, req: NextRequest) {
  return req.cookies.get('businessId')?.value
    ?? (await prisma.userBusiness.findFirst({ where: { userId: session.user.id } }))?.businessId
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = await businessId(session, req)
  if (!id) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const rows = await prisma.exchangeRate.findMany({
    where: { businessId: id, date: today() },
    orderBy: { currency: 'asc' },
  })
  return NextResponse.json(rows)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = await businessId(session, req)
  if (!id) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const parsed = putSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const { currency, rate } = parsed.data
  const row = await prisma.exchangeRate.upsert({
    where: { businessId_currency_date: { businessId: id, currency, date: today() } },
    update: { rate, source: 'MANUAL' },
    create: { businessId: id, currency, rate, date: today(), source: 'MANUAL' },
  })
  return NextResponse.json(row)
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors. Confirm the `@@unique([businessId, currency, date])` produces the compound key name `businessId_currency_date` (Prisma default). If the generated name differs, use the generated one.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/rates/route.ts
git commit -m "feat: daily rate API with manual override upsert"
```

---

## Task 11: DualPrice display component

**Files:**
- Create: `src/components/currency/DualPrice.tsx`
- Test: `src/components/currency/dualPrice.test.ts` (logic-only helper)

- [ ] **Step 1: Write the failing test for the label helper**

`src/components/currency/dualPrice.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { dualLabel } from './dualLabel'

const rates = { USD: new Decimal(1), VES: new Decimal('0.025'), BRL: new Decimal('0.20') }

describe('dualLabel', () => {
  it('shows anchor only when no secondary', () => {
    expect(dualLabel(new Decimal(10), 'USD', null, rates)).toBe('$10.00')
  })
  it('shows anchor + secondary', () => {
    expect(dualLabel(new Decimal(10), 'USD', 'VES', rates)).toBe('$10.00 / Bs 400')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dualPrice`
Expected: FAIL — cannot find `./dualLabel`.

- [ ] **Step 3: Implement helper + component**

`src/components/currency/dualLabel.ts`:
```ts
import Decimal from 'decimal.js'
import { CurrencyCode, convert, formatMoney } from '@/lib/currency'

export function dualLabel(
  amount: Decimal,
  anchor: CurrencyCode,
  secondary: CurrencyCode | null,
  rates: Record<CurrencyCode, Decimal>,
): string {
  const primary = formatMoney(amount, anchor)
  if (!secondary || secondary === anchor) return primary
  const sec = formatMoney(convert(amount, anchor, secondary, rates), secondary)
  return `${primary} / ${sec}`
}
```

`src/components/currency/DualPrice.tsx`:
```tsx
'use client'
import Decimal from 'decimal.js'
import { CurrencyCode, formatMoney, convert } from '@/lib/currency'

interface Props {
  amount: number | string
  anchor: CurrencyCode
  secondary?: CurrencyCode | null
  rates: Record<CurrencyCode, Decimal>
  className?: string
}

/** Anchor prominent, secondary muted below (design system: emerald primary, muted-foreground). */
export function DualPrice({ amount, anchor, secondary, rates, className }: Props) {
  const value = new Decimal(amount)
  const primary = formatMoney(value, anchor)
  const sec = secondary && secondary !== anchor
    ? formatMoney(convert(value, anchor, secondary, rates), secondary)
    : null
  return (
    <span className={className}>
      <span className="font-medium text-foreground">{primary}</span>
      {sec && <span className="ml-2 text-sm text-muted-foreground">{sec}</span>}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- dualPrice`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/currency/DualPrice.tsx src/components/currency/dualLabel.ts src/components/currency/dualPrice.test.ts
git commit -m "feat: DualPrice component + dualLabel helper"
```

---

## Task 12: Currency settings page

**Files:**
- Create: `src/app/warehouse/settings/currency/page.tsx`

> Path note: reuse the existing settings area. `warehouse/settings` already exists. If the tenant-admin
> settings live under a different route in this codebase, place the page beside the existing
> `settings/page.tsx` you find. Confirm with: `ls src/app/warehouse/settings`.

- [ ] **Step 1: Build the page (client component)**

`src/app/warehouse/settings/currency/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

type Cur = 'USD' | 'VES' | 'BRL'
const ALL: Cur[] = ['USD', 'VES', 'BRL']

export default function CurrencySettingsPage() {
  const [form, setForm] = useState({
    baseCurrency: 'USD' as Cur,
    secondaryCurrency: null as Cur | null,
    enabledCurrencies: ['USD'] as Cur[],
    multiCurrency: false,
    rateSource: 'MANUAL' as 'AUTO_BCV' | 'AUTO_FOREX' | 'MANUAL',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/business/currency').then(r => r.json()).then(d => {
      if (d && d.baseCurrency) setForm(d)
      setLoading(false)
    })
  }, [])

  async function save() {
    const res = await fetch('/api/business/currency', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    if (res.ok) toast.success('Monedas actualizadas')
    else toast.error('Error al guardar')
  }

  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>

  return (
    <div className="p-6 max-w-2xl space-y-6" data-tour="currency-settings">
      <h1 className="text-2xl font-semibold text-foreground">Monedas</h1>

      <label className="block">
        <span className="text-sm text-muted-foreground">Moneda base</span>
        <select className="mt-1 w-full rounded-md bg-card border border-border p-2"
          value={form.baseCurrency}
          onChange={e => setForm(f => ({ ...f, baseCurrency: e.target.value as Cur }))}>
          {ALL.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-muted-foreground">Moneda secundaria (vista dual)</span>
        <select className="mt-1 w-full rounded-md bg-card border border-border p-2"
          value={form.secondaryCurrency ?? ''}
          onChange={e => setForm(f => ({ ...f, secondaryCurrency: (e.target.value || null) as Cur | null }))}>
          <option value="">— Ninguna —</option>
          {ALL.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <fieldset data-tour="enabled-currencies">
        <legend className="text-sm text-muted-foreground">Monedas habilitadas</legend>
        <div className="mt-2 flex gap-4">
          {ALL.map(c => (
            <label key={c} className="flex items-center gap-2">
              <input type="checkbox" checked={form.enabledCurrencies.includes(c)}
                onChange={e => setForm(f => ({
                  ...f,
                  enabledCurrencies: e.target.checked
                    ? [...f.enabledCurrencies, c]
                    : f.enabledCurrencies.filter(x => x !== c),
                }))} />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.multiCurrency}
          onChange={e => setForm(f => ({ ...f, multiCurrency: e.target.checked }))} />
        <span className="text-foreground">Activar multi-moneda</span>
      </label>

      <button onClick={save}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium">
        Guardar
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: page compiles (Next build succeeds).

- [ ] **Step 3: Commit**

```bash
git add src/app/warehouse/settings/currency/page.tsx
git commit -m "feat: currency settings page"
```

---

## Task 13: Daily rate override page

**Files:**
- Create: `src/app/warehouse/settings/rates/page.tsx`

- [ ] **Step 1: Build the page**

`src/app/warehouse/settings/rates/page.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

type Cur = 'USD' | 'VES' | 'BRL'

export default function RatesPage() {
  const [rows, setRows] = useState<{ currency: Cur; rate: string; source: string }[]>([])
  const [draft, setDraft] = useState<{ currency: Cur; rate: string }>({ currency: 'VES', rate: '' })

  async function load() {
    const d = await fetch('/api/rates').then(r => r.json())
    setRows(d)
  }
  useEffect(() => { load() }, [])

  async function save() {
    const res = await fetch('/api/rates', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    })
    if (res.ok) { toast.success('Tasa actualizada'); setDraft({ ...draft, rate: '' }); load() }
    else toast.error('Error al guardar la tasa')
  }

  return (
    <div className="p-6 max-w-2xl space-y-6" data-tour="daily-rates">
      <h1 className="text-2xl font-semibold text-foreground">Tasas del día</h1>

      <div className="rounded-md border border-border bg-card divide-y divide-border">
        {rows.length === 0 && <div className="p-4 text-muted-foreground">Sin tasas hoy.</div>}
        {rows.map(r => (
          <div key={r.currency} className="flex justify-between p-3">
            <span className="text-foreground">{r.currency}</span>
            <span className="text-muted-foreground">{r.rate} <em className="text-xs">({r.source})</em></span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <label className="flex-1">
          <span className="text-sm text-muted-foreground">Moneda</span>
          <select className="mt-1 w-full rounded-md bg-card border border-border p-2"
            value={draft.currency}
            onChange={e => setDraft(d => ({ ...d, currency: e.target.value as Cur }))}>
            {(['VES', 'BRL', 'USD'] as Cur[]).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex-1">
          <span className="text-sm text-muted-foreground">Tasa (a base)</span>
          <input className="mt-1 w-full rounded-md bg-card border border-border p-2"
            value={draft.rate} onChange={e => setDraft(d => ({ ...d, rate: e.target.value }))}
            placeholder="0.025" />
        </label>
        <button onClick={save}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium">
          Guardar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/app/warehouse/settings/rates/page.tsx
git commit -m "feat: daily rate override page"
```

---

## Task 14: Tour framework + currency steps

**Files:**
- Create: `src/components/tour/TourProvider.tsx`
- Create: `src/components/tour/steps.currency.ts`
- Modify: `package.json` (add `driver.js`)

- [ ] **Step 1: Install driver.js**

Run: `npm i driver.js`
Expected: added.

- [ ] **Step 2: Currency tour steps**

`src/components/tour/steps.currency.ts`:
```ts
import type { DriveStep } from 'driver.js'

export const currencyTourSteps: DriveStep[] = [
  { element: '[data-tour="currency-settings"]', popover: {
      title: 'Configura tus monedas', description: 'Elige tu moneda base y una secundaria para la vista dual.' } },
  { element: '[data-tour="enabled-currencies"]', popover: {
      title: 'Monedas habilitadas', description: 'Marca las monedas con las que vas a operar.' } },
  { element: '[data-tour="daily-rates"]', popover: {
      title: 'Tasa del día', description: 'Revisa o sobrescribe manualmente la tasa de cambio del día.' } },
]
```

- [ ] **Step 3: Tour provider (driver.js styled with Stocker tokens)**

`src/components/tour/TourProvider.tsx`:
```tsx
'use client'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

export function runTour(steps: DriveStep[]) {
  const d = driver({
    showProgress: true,
    steps,
    popoverClass: 'stocker-tour', // styled in globals.css to match --card/--primary
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Listo',
  })
  d.drive()
}
```

- [ ] **Step 4: Add Stocker tour theme to `src/app/globals.css`**

Append:
```css
.driver-popover.stocker-tour {
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}
.driver-popover.stocker-tour .driver-popover-title { color: hsl(var(--foreground)); }
.driver-popover.stocker-tour .driver-popover-next-btn {
  background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border: none;
}
```

- [ ] **Step 5: Wire a "Ver tour" trigger on the currency page**

In `src/app/warehouse/settings/currency/page.tsx`, add near the title:
```tsx
import { runTour } from '@/components/tour/TourProvider'
import { currencyTourSteps } from '@/components/tour/steps.currency'
// ...inside the component, in the header row:
<button onClick={() => runTour(currencyTourSteps)}
  className="text-sm text-primary underline">Ver tour</button>
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/components/tour src/app/globals.css src/app/warehouse/settings/currency/page.tsx
git commit -m "feat: driver.js tour framework + currency steps (Stocker theme)"
```

---

## Task 15: Coolify deployment config

**Files:**
- Create: `src/app/api/health/route.ts`
- Create: `Dockerfile`
- Create: `.dockerignore`
- Modify: `next.config.js`

- [ ] **Step 1: Health endpoint**

`src/app/api/health/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'db_error' }, { status: 503 })
  }
}
```

- [ ] **Step 2: Enable standalone output in `next.config.js`**

Add `output: 'standalone',` to the exported config object.

- [ ] **Step 3: `.dockerignore`**

```
node_modules
.next
.git
docs
*.md
```

- [ ] **Step 4: `Dockerfile` (multi-stage, Next standalone)**

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 5: Verify build locally**

Run: `npm run build`
Expected: `.next/standalone` produced (standalone output enabled).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/health/route.ts Dockerfile .dockerignore next.config.js
git commit -m "feat: Coolify deploy (Dockerfile, healthcheck, standalone output)"
```

> Coolify runtime notes (not code): set env `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`; run
> `npx prisma migrate deploy` as the pre-deploy/release command so migrations apply in order before
> traffic; point the healthcheck at `/api/health`. The daily-rate cron (AUTO_BCV/AUTO_FOREX) is deferred
> until a rate source is confirmed (spec §11) — schedule it in Coolify when that provider lands.

---

## Task 16: Full suite green + final commit

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all suites PASS (currencies, convert, provider, rateEngine, loadRates, dualPrice).

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 3: Commit any final fixups**

```bash
git add -A
git commit -m "chore: multi-currency block A complete"
```

---

## Self-Review checklist (done while writing)

- **Spec coverage:** base/secondary/enabled currencies (Tasks 3, 9, 12); rate engine auto+manual+fallback (Tasks 4–6, 10, 13; auto-providers deferred per spec §11); freeze on transaction (Tasks 7–8); single Decimal helper (Task 2); dual display (Task 11); rounding/format per currency (Tasks 1–2); feature-flag `multiCurrency` (Tasks 3, 9, 12); tour (Task 14); Coolify (Task 15); testing (throughout).
- **Deferred (documented, not silently dropped):** AUTO_BCV/AUTO_FOREX live providers + daily cron (spec §11 open decision — BCV source to confirm). UI dual-display wiring into POS/dashboard reuses `DualPrice` and is a thin follow-up once real `rates` are loaded per page.
- **Type consistency:** `CurrencyCode` used everywhere; `effectiveRate(currency, base, date, loader)` signature matches its caller in Task 8; `rate` semantics (base-per-unit) consistent across convert/engine/loader; compound key `businessId_currency_date` flagged to verify against generated name.
- **No placeholders:** every code step contains real code.
