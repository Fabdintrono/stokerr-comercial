# Lotes y Vencimiento (v1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un producto puede llevar lotes con vencimiento (stock por lote, FEFO silencioso en salidas) para trazabilidad, alertas y reportes de vencimiento, como overlay que no toca el stock simple ni el de variantes.

**Architecture:** Tablas `ProductBatch` + `BatchInventory` (stock por lote; `Inventory`/`VariantInventory` intactos). Salidas de productos con lote usan `deductBatchesFEFO` (descuenta del que vence primero, salta o incluye vencidos según config del negocio); entradas usan `addBatchStock`. Módulo `BATCHES` → LIVE gatea la gestión de lotes. Config por negocio: `expiryAlertDays`, `allowExpiredSale`.

**Tech Stack:** Next.js 16 App Router, Prisma (`prisma db push`), Vitest (`bun run test`), i18n bloque E, módulos D1/verticales, patrón overlay de Variantes.

**Regla git:** 11 archivos sin commitear NO se deben commitear. SIEMPRE `git add <archivos específicos>`, NUNCA `-A`/`.`. Antes de editar cualquier archivo: `git status --short -- <archivo>`; si aparece ` M` (pendiente), NO editarlo — aislar en componente/endpoint nuevo o reportar. Pendientes conocidos que este plan NO toca: `src/app/api/dashboard/warehouse/route.ts`, `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`, `src/app/api/replenishment/[id]/route.ts`, `src/app/api/public/kitchen/[token]/order/[orderId]/route.ts`, `src/app/restaurant/*` pendientes, `src/app/warehouse/{dashboard,inventory,products,replenishment}/page.tsx`, `src/components/layout/NotificationBell.tsx`.

**Fases:** (1) modelo + config + helpers puros + FEFO + BATCHES LIVE · (2) API gestión de lotes + toggle · (3) flujos (recepción, venta FEFO, transferencia, ajuste) · (4) reportes/alertas · (5) UI.

---

## File Structure

- `prisma/schema.prisma` — Business config; `Product.hasBatches`; `ProductBatch`, `BatchInventory`; `batchId?` en InventoryMovement; `lotNumber?`/`expiryDate?` en InvoiceLineItem; inversa en Location.
- `src/lib/batches/status.ts` (+test) — `batchStatus`.
- `src/lib/batches/fefo.ts` (+test) — `pickBatchesFEFO` (puro).
- `src/lib/inventory/addBatchStock.ts` (+test) — entrada por lote.
- `src/lib/inventory/deductBatchesFEFO.ts` (+test) — salida FEFO (usa pickBatchesFEFO).
- `src/lib/variants/stock.ts` — MODIFY: extender `stockForProduct` para hasBatches.
- `src/lib/modules/registry.ts` + `prisma/seed.ts` — BATCHES → LIVE.
- `src/app/api/batches/route.ts` (+ `[id]/route.ts`) — CREATE: listar/editar lotes, toggle hasBatches, gateado.
- `src/app/api/purchase-invoices/route.ts` + `[id]/status/route.ts` — MODIFY: capturar lote + recepción por lote.
- `src/lib/sales/issue.ts` — MODIFY: venta FEFO para productos con lote.
- `src/app/api/transfers/[id]/route.ts` — MODIFY: transferencia preserva lote.
- `src/app/api/inventory/movement/route.ts` — MODIFY: ajuste/entrada por lote.
- `src/app/api/reports/expiry/route.ts` (+ dashboard alert endpoint) — CREATE.
- UI: editor producto (toggle), InvoiceModal (lote+vencimiento), inventario (componente), reporte, ajustes negocio.
- `locales/{es,pt,en}.json` — `batches.*`.

---

# FASE 1 — Modelo, config, helpers, FEFO, BATCHES LIVE

## Task 1: Schema — config + ProductBatch + BatchInventory + campos

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Add fields/models**

En `model Business`, agregar:
```prisma
  expiryAlertDays  Int     @default(30)
  allowExpiredSale Boolean @default(false)
```
En `model Product`, agregar:
```prisma
  hasBatches Boolean @default(false)
  batches    ProductBatch[]
```
Agregar modelos (cerca de `ProductVariant`):
```prisma
model ProductBatch {
  id         String   @id @default(cuid())
  productId  String
  lotNumber  String
  expiryDate DateTime @db.Date
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  product   Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  inventory BatchInventory[]
  movements InventoryMovement[]

  @@unique([productId, lotNumber])
  @@index([productId])
  @@map("product_batches")
}

model BatchInventory {
  id         String @id @default(cuid())
  quantity   Float  @default(0)
  batchId    String
  locationId String

  batch    ProductBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  location Location     @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@unique([batchId, locationId])
  @@map("batch_inventory")
}
```
En `model InventoryMovement`, agregar `batchId String?` + `batch ProductBatch? @relation(fields: [batchId], references: [id])`.
En `model InvoiceLineItem`, agregar `lotNumber String?` + `expiryDate DateTime? @db.Date`.
En `model Location`, agregar inversa `batchInventory BatchInventory[]`.

- [ ] **Step 2: Push + build**

Run: `bun run db:push` (Expected: en sync, no destructivo). Luego `bun run build` (Expected: OK).

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(batches): ProductBatch + BatchInventory + business expiry config + fields"
```

---

## Task 2: `batchStatus` (puro, TDD)

**Files:** Create `src/lib/batches/status.ts` + `.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/batches/status.test.ts
import { describe, it, expect } from 'vitest'
import { batchStatus } from './status'

const today = new Date('2026-07-19')
describe('batchStatus', () => {
  it('EXPIRED when expiry is before today', () => {
    expect(batchStatus(new Date('2026-07-18'), today, 30)).toBe('EXPIRED')
  })
  it('NEAR when within expiryAlertDays', () => {
    expect(batchStatus(new Date('2026-08-10'), today, 30)).toBe('NEAR') // 22 días
  })
  it('OK when beyond the threshold', () => {
    expect(batchStatus(new Date('2026-10-01'), today, 30)).toBe('OK')
  })
  it('treats exactly today as NEAR (not expired)', () => {
    expect(batchStatus(new Date('2026-07-19'), today, 30)).toBe('NEAR')
  })
})
```

- [ ] **Step 2: Run → FAIL** (`bun run test -- src/lib/batches/status.test.ts`)

- [ ] **Step 3: Implement**

```ts
// src/lib/batches/status.ts
export type BatchStatus = 'EXPIRED' | 'NEAR' | 'OK'

export function batchStatus(expiryDate: Date, today: Date, expiryAlertDays: number): BatchStatus {
  const day = 24 * 60 * 60 * 1000
  const diffDays = Math.floor((expiryDate.getTime() - today.getTime()) / day)
  if (diffDays < 0) return 'EXPIRED'
  if (diffDays <= expiryAlertDays) return 'NEAR'
  return 'OK'
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/batches/status.ts src/lib/batches/status.test.ts
git commit -m "feat(batches): batchStatus (expired/near/ok)"
```

---

## Task 3: `pickBatchesFEFO` (puro, TDD)

**Files:** Create `src/lib/batches/fefo.ts` + `.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/batches/fefo.test.ts
import { describe, it, expect } from 'vitest'
import { pickBatchesFEFO } from './fefo'

const today = new Date('2026-07-19')
// batches: { id, quantity, expiryDate }
const batches = [
  { id: 'b1', quantity: 5, expiryDate: new Date('2026-08-01') },
  { id: 'b2', quantity: 10, expiryDate: new Date('2026-09-01') },
  { id: 'expired', quantity: 100, expiryDate: new Date('2026-07-01') },
]

describe('pickBatchesFEFO', () => {
  it('takes from the earliest-expiring non-expired batch first, spanning as needed', () => {
    const picks = pickBatchesFEFO(batches, 8, { today, allowExpired: false })
    expect(picks).toEqual([{ id: 'b1', take: 5 }, { id: 'b2', take: 3 }])
  })
  it('skips expired batches when allowExpired is false', () => {
    const picks = pickBatchesFEFO(batches, 5, { today, allowExpired: false })
    expect(picks).toEqual([{ id: 'b1', take: 5 }])
  })
  it('includes expired (earliest first) when allowExpired is true', () => {
    const picks = pickBatchesFEFO(batches, 3, { today, allowExpired: true })
    expect(picks).toEqual([{ id: 'expired', take: 3 }])
  })
  it('throws when available (per policy) is insufficient', () => {
    expect(() => pickBatchesFEFO(batches, 20, { today, allowExpired: false })).toThrow(/insufficient/i)
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/batches/fefo.ts
export interface FefoBatch { id: string; quantity: number; expiryDate: Date }
export interface FefoPick { id: string; take: number }

export function pickBatchesFEFO(
  batches: FefoBatch[],
  quantity: number,
  opts: { today: Date; allowExpired: boolean },
): FefoPick[] {
  const eligible = batches
    .filter(b => b.quantity > 0 && (opts.allowExpired || b.expiryDate.getTime() >= opts.today.getTime()))
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

  const total = eligible.reduce((s, b) => s + b.quantity, 0)
  if (total < quantity) throw new Error(`insufficient batch stock: need ${quantity}, have ${total}`)

  const picks: FefoPick[] = []
  let remaining = quantity
  for (const b of eligible) {
    if (remaining <= 0) break
    const take = Math.min(b.quantity, remaining)
    picks.push({ id: b.id, take })
    remaining -= take
  }
  return picks
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/batches/fefo.ts src/lib/batches/fefo.test.ts
git commit -m "feat(batches): pickBatchesFEFO (earliest-expiry, skip/include expired)"
```

---

## Task 4: `addBatchStock` (TDD tx stub)

**Files:** Create `src/lib/inventory/addBatchStock.ts` + `.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/inventory/addBatchStock.test.ts
import { describe, it, expect } from 'vitest'
import { addBatchStock } from './addBatchStock'

function makeTx(existing: any = null) {
  const calls: any[] = []
  return {
    calls,
    batchInventory: {
      findUnique: async () => existing,
      create: async (a: any) => { calls.push(['bi.create', a]); return { id: 'bi1', quantity: a.data.quantity } },
      update: async (a: any) => { calls.push(['bi.update', a]); return { id: 'bi1', quantity: a.data.quantity } },
    },
    inventoryMovement: { create: async (a: any) => { calls.push(['mv.create', a]); return a } },
  }
}

describe('addBatchStock', () => {
  it('creates BatchInventory + movement when none exists', async () => {
    const tx = makeTx()
    await addBatchStock(tx as any, { batchId: 'b1', productId: 'p1', locationId: 'l1', delta: 6, type: 'IN', userId: 'u1' })
    expect(tx.calls[0]).toEqual(['bi.create', expect.objectContaining({ data: expect.objectContaining({ batchId: 'b1', locationId: 'l1', quantity: 6 }) })])
    const mv = tx.calls.find(c => c[0] === 'mv.create')[1]
    expect(mv.data).toMatchObject({ productId: 'p1', batchId: 'b1', locationId: 'l1', quantity: 6, type: 'IN' })
  })
  it('adds delta to an existing BatchInventory row', async () => {
    const tx = makeTx({ id: 'bi1', quantity: 4 })
    await addBatchStock(tx as any, { batchId: 'b1', productId: 'p1', locationId: 'l1', delta: 2, type: 'IN', userId: 'u1' })
    const upd = tx.calls.find(c => c[0] === 'bi.update')[1]
    expect(upd.data.quantity).toBe(6)
  })
}) 
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/inventory/addBatchStock.ts
type TxLike = any
export interface AddBatchStockArgs {
  batchId: string
  productId: string
  locationId: string
  delta: number
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'
  userId: string
  reason?: string
}

export async function addBatchStock(tx: TxLike, args: AddBatchStockArgs): Promise<void> {
  const { batchId, productId, locationId, delta, type, userId, reason } = args
  const existing = await tx.batchInventory.findUnique({ where: { batchId_locationId: { batchId, locationId } } })
  if (existing) {
    await tx.batchInventory.update({ where: { id: existing.id }, data: { quantity: existing.quantity + delta } })
  } else {
    await tx.batchInventory.create({ data: { batchId, locationId, quantity: delta } })
  }
  await tx.inventoryMovement.create({
    data: { productId, batchId, locationId, userId, type, quantity: Math.abs(delta), reason: reason ?? null },
  })
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/inventory/addBatchStock.ts src/lib/inventory/addBatchStock.test.ts
git commit -m "feat(batches): addBatchStock (per-lot entry + movement)"
```

---

## Task 5: `deductBatchesFEFO` (TDD tx stub)

**Files:** Create `src/lib/inventory/deductBatchesFEFO.ts` + `.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/inventory/deductBatchesFEFO.test.ts
import { describe, it, expect } from 'vitest'
import { deductBatchesFEFO } from './deductBatchesFEFO'

const today = new Date('2026-07-19')
function makeTx(rows: any[]) {
  const calls: any[] = []
  return {
    calls,
    batchInventory: {
      findMany: async () => rows, // rows: { id, quantity, batchId, batch: { expiryDate } }
      update: async (a: any) => { calls.push(['bi.update', a]); return a },
    },
    inventoryMovement: { create: async (a: any) => { calls.push(['mv.create', a]); return a } },
  }
}

describe('deductBatchesFEFO', () => {
  it('deducts from earliest-expiry non-expired batches, one movement per batch', async () => {
    const rows = [
      { id: 'bi1', quantity: 5, batchId: 'b1', batch: { expiryDate: new Date('2026-08-01') } },
      { id: 'bi2', quantity: 10, batchId: 'b2', batch: { expiryDate: new Date('2026-09-01') } },
    ]
    const tx = makeTx(rows)
    await deductBatchesFEFO(tx as any, { productId: 'p1', locationId: 'l1', quantity: 8, userId: 'u1', today, allowExpired: false, type: 'OUT' })
    const updates = tx.calls.filter(c => c[0] === 'bi.update').map(c => c[1].data.quantity)
    expect(updates).toEqual([0, 7]) // b1: 5-5=0, b2: 10-3=7
    const movements = tx.calls.filter(c => c[0] === 'mv.create').map(c => c[1].data.batchId)
    expect(movements).toEqual(['b1', 'b2'])
  })
  it('throws when non-expired stock is insufficient (allowExpired false)', async () => {
    const rows = [{ id: 'bi1', quantity: 2, batchId: 'b1', batch: { expiryDate: new Date('2026-07-01') } }] // expired
    const tx = makeTx(rows)
    await expect(deductBatchesFEFO(tx as any, { productId: 'p1', locationId: 'l1', quantity: 1, userId: 'u1', today, allowExpired: false, type: 'OUT' })).rejects.toThrow(/insufficient/i)
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement** (usa `pickBatchesFEFO`)

```ts
// src/lib/inventory/deductBatchesFEFO.ts
import { pickBatchesFEFO, type FefoBatch } from '@/lib/batches/fefo'

type TxLike = any
export interface DeductFEFOArgs {
  productId: string
  locationId: string
  quantity: number
  userId: string
  today: Date
  allowExpired: boolean
  type: 'OUT' | 'TRANSFER'
  reason?: string
}

export async function deductBatchesFEFO(tx: TxLike, args: DeductFEFOArgs): Promise<void> {
  const rows = await tx.batchInventory.findMany({
    where: { locationId: args.locationId, quantity: { gt: 0 }, batch: { productId: args.productId } },
    select: { id: true, quantity: true, batchId: true, batch: { select: { expiryDate: true } } },
  })
  const fefoInput: (FefoBatch & { rowId: string })[] = rows.map((r: any) => ({
    id: r.batchId, rowId: r.id, quantity: r.quantity, expiryDate: r.batch.expiryDate,
  }))
  const picks = pickBatchesFEFO(fefoInput, args.quantity, { today: args.today, allowExpired: args.allowExpired })
  for (const pick of picks) {
    const row = fefoInput.find(r => r.id === pick.id)!
    await tx.batchInventory.update({ where: { id: row.rowId }, data: { quantity: row.quantity - pick.take } })
    await tx.inventoryMovement.create({
      data: { productId: args.productId, batchId: pick.id, locationId: args.locationId, userId: args.userId, type: args.type, quantity: pick.take, reason: args.reason ?? null },
    })
  }
}
```

- [ ] **Step 4: Run → PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/inventory/deductBatchesFEFO.ts src/lib/inventory/deductBatchesFEFO.test.ts
git commit -m "feat(batches): deductBatchesFEFO (FEFO exit, one movement per lot)"
```

---

## Task 6: Extender `stockForProduct` para lotes (TDD)

**Files:** Modify `src/lib/variants/stock.ts` + `src/lib/variants/stock.test.ts`

- [ ] **Step 1: Add failing test** (agregar al describe existente)

```ts
  it('sums BatchInventory for a product with batches', () => {
    const product = { hasVariants: false, hasBatches: true }
    expect(stockForProduct(product, [], [], [{ quantity: 4 }, { quantity: 6 }])).toBe(10)
  })
```

- [ ] **Step 2: Run → FAIL** (`bun run test -- src/lib/variants/stock.test.ts`)

- [ ] **Step 3: Update `stockForProduct`**

```ts
// src/lib/variants/stock.ts
export function stockForProduct(
  product: { hasVariants: boolean; hasBatches?: boolean },
  inventory: { quantity: number }[],
  variantInventory: { quantity: number }[],
  batchInventory: { quantity: number }[] = [],
): number {
  const rows = product.hasBatches ? batchInventory : product.hasVariants ? variantInventory : inventory
  return rows.reduce((sum, r) => sum + r.quantity, 0)
}
```
(El 4º parámetro es opcional → los llamadores existentes de variantes/simple siguen compilando.)

- [ ] **Step 4: Run → PASS** (y `bun run test -- src/lib/variants/stock.test.ts` completo).

- [ ] **Step 5: Commit**

```bash
git add src/lib/variants/stock.ts src/lib/variants/stock.test.ts
git commit -m "feat(batches): stockForProduct resolves batch stock"
```

---

## Task 7: BATCHES → LIVE

**Files:** Modify `src/lib/modules/registry.ts`, `prisma/seed.ts`, `src/lib/modules/registry.test.ts`

- [ ] **Step 1: Registry** — cambiar la entrada `BATCHES` `status: 'COMING_SOON'` → `'LIVE'`.
- [ ] **Step 2: Seed** — cambiar `BATCHES` en `moduleSeed` a `'LIVE'`.
- [ ] **Step 3: DB** — `npx ts-node --compiler-options '{"module":"CommonJS"}' -e "import('@prisma/client').then(async({PrismaClient})=>{const p=new PrismaClient();await p.module.update({where:{key:'BATCHES'},data:{status:'LIVE'}});console.log('BATCHES -> LIVE');await p.\$disconnect()})"`
- [ ] **Step 4: Test** — en `registry.test.ts`, actualizar la aserción de `BATCHES.status` a `'LIVE'`. Run `bun run test -- src/lib/modules/registry.test.ts` (PASS) + `bun run build` (OK).
- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/registry.ts prisma/seed.ts src/lib/modules/registry.test.ts
git commit -m "feat(batches): BATCHES module is now LIVE"
```

---

# FASE 2 — API de gestión de lotes + toggle

## Task 8: API de lotes + toggle hasBatches (gateado, exclusivo con variantes)

**Files:** Create `src/app/api/batches/route.ts`, `src/app/api/batches/[id]/route.ts`

- [ ] **Step 1: Implement `src/app/api/batches/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard'

function bizId(req: NextRequest) { return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value }

// GET /api/batches?productId= : list a product's batches (core read, no module gate)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  const productId = new URL(request.url).searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId requerido' }, { status: 400 })
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  const batches = await prisma.productBatch.findMany({
    where: { productId },
    include: { inventory: { select: { locationId: true, quantity: true } } },
    orderBy: { expiryDate: 'asc' },
  })
  return NextResponse.json({ batches })
}

// PATCH /api/batches?productId= : toggle hasBatches on the product (gated, exclusive with hasVariants)
const toggleSchema = z.object({ productId: z.string(), hasBatches: z.boolean() })
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  try { await requireModule(prisma, businessId, 'BATCHES') }
  catch (e) { if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 }); throw e }
  const data = toggleSchema.parse(await request.json())
  const product = await prisma.product.findFirst({ where: { id: data.productId, businessId } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  if (data.hasBatches && product.hasVariants) {
    return NextResponse.json({ error: 'Un producto con variantes no puede manejar lotes' }, { status: 409 })
  }
  const updated = await prisma.product.update({ where: { id: product.id }, data: { hasBatches: data.hasBatches } })
  return NextResponse.json({ product: { id: updated.id, hasBatches: updated.hasBatches } })
}
```

- [ ] **Step 2: Implement `src/app/api/batches/[id]/route.ts`** (PATCH lote: editar lotNumber/expiryDate, gateado + ownership)

```ts
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
```

- [ ] **Step 3: Build** (`bun run build` → OK).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/batches/route.ts "src/app/api/batches/[id]/route.ts"
git commit -m "feat(batches): batches API (list, toggle hasBatches exclusive-with-variants, edit lot) gated"
```

---

# FASE 3 — Flujos

## Task 9: Recepción de compra por lote

**Files:** Modify `src/app/api/purchase-invoices/route.ts` (captura) y `src/app/api/purchase-invoices/[id]/status/route.ts` (recepción)

- [ ] **Step 1: Confirm not pending** — `git status --short -- src/app/api/purchase-invoices/route.ts "src/app/api/purchase-invoices/[id]/status/route.ts"` (esperar vacío).
- [ ] **Step 2: Capture lot on line creation** — en `purchase-invoices/route.ts`, agregar `lotNumber: z.string().optional()` y `expiryDate: z.string().optional()` al schema de línea, y guardarlos en el `invoiceLineItem` create (`expiryDate: item.expiryDate ? new Date(item.expiryDate) : null`).
- [ ] **Step 3: Reception per lot** — en `purchase-invoices/[id]/status/route.ts`, en el bloque RECEIVED (que hoy hace `adjustStock` por ítem, cargar `lotNumber`, `expiryDate` en el include de items), para cada ítem cuyo producto tenga `hasBatches` y tenga `lotNumber`+`expiryDate`:
```ts
      const batch = await tx.productBatch.upsert({
        where: { productId_lotNumber: { productId: item.productId, lotNumber: item.lotNumber } },
        update: { expiryDate: new Date(item.expiryDate) },
        create: { productId: item.productId, lotNumber: item.lotNumber, expiryDate: new Date(item.expiryDate) },
      })
      await addBatchStock(tx, { batchId: batch.id, productId: item.productId, locationId, delta: item.quantity, type: 'IN', userId: session.user.id, reason: 'Recepción de compra' })
```
Los ítems de productos SIN lote siguen con `adjustStock` como hoy. Cargar `product: { select: { hasBatches: true } }` en el include para decidir. Importar `addBatchStock`.
- [ ] **Step 4: Build** (OK).
- [ ] **Step 5: Commit**

```bash
git add src/app/api/purchase-invoices/route.ts "src/app/api/purchase-invoices/[id]/status/route.ts"
git commit -m "feat(batches): purchase reception creates/updates lot and adds batch stock"
```

---

## Task 10: Venta FEFO para productos con lote

**Files:** Modify `src/lib/sales/issue.ts`

- [ ] **Step 1: Read the file** — el loop de descuento ya existe (salta productos con receta, usa `adjustStock` por línea con variantId).
- [ ] **Step 2: Route batched products through FEFO** — cargar la config del negocio (`allowExpiredSale`) y `hasBatches` del producto. En el loop, para cada ítem cuyo producto tenga `hasBatches` (y NO tenga receta): usar `deductBatchesFEFO` en vez de `adjustStock`:
```ts
      if (product.hasBatches) {
        await deductBatchesFEFO(tx, { productId: item.productId, locationId: order.locationId, quantity: item.quantity, userId, today: new Date(issuedAt), allowExpired: business.allowExpiredSale, type: 'OUT' })
      } else {
        await adjustStock(tx, { productId: item.productId, variantId: item.variantId ?? null, locationId: order.locationId, delta: -item.quantity, type: 'OUT', userId })
      }
```
Cargar `product.hasBatches` y `business.allowExpiredSale` en las queries del issue (el issue ya carga `order` con items y `business`; extender los `select`). `issuedAt` es la fecha de emisión (usar `new Date()` no está disponible en workflows pero esto es código de app normal — usar la fecha de emisión que el issue ya calcula, o `new Date()` si el issue corre en request). Importar `deductBatchesFEFO`.

> Nota: si `deductBatchesFEFO` lanza `insufficient` (solo queda vencido y `allowExpiredSale` false), la emisión falla con error — comportamiento correcto. La ruta que llama a `issueDocument` (`sales/[orderId]/pdf`) debe devolver un 409/422 con mensaje claro en ese caso; ajustar el try/catch de esa ruta para mapear el error a una respuesta legible.

- [ ] **Step 3: Build** (OK). Si `issue.test.ts` construye ítems reales, agregar un caso de producto con lote o dejar los existentes (no-batch) verdes.
- [ ] **Step 4: Commit**

```bash
git add src/lib/sales/issue.ts "src/app/api/sales/[orderId]/pdf/route.ts"
git commit -m "feat(batches): sale decrements batched products via FEFO on issue"
```

---

## Task 11: Transferencia preserva lote

**Files:** Modify `src/app/api/transfers/[id]/route.ts`

- [ ] **Step 1: Confirm not pending** (`git status --short`).
- [ ] **Step 2: Preserve lot on transfer** — en el APPROVE→COMPLETED (que hoy usa `adjustStock` por línea), para líneas cuyo producto tenga `hasBatches`: seleccionar lotes en origen por FEFO (`allowExpired: true`, mover vencidos es válido) y por cada lote tocado: `batchInventory.update` en `fromLocation` (−take) y upsert/increment en `toLocation` (+take), con movimientos TRANSFER/IN por lote. Reusar la lógica de `pickBatchesFEFO` cargando las `batchInventory` de origen. Para líneas sin lote, `adjustStock` como hoy. Cargar `product.hasBatches` en el include.
  - Implementar un helper `transferBatchStock(tx, { productId, fromLocationId, toLocationId, quantity, userId, today })` en `src/lib/inventory/transferBatchStock.ts` (con test tx-stub) que haga el FEFO-origen + incremento-destino preservando batchId. Commitear helper + test aparte si se prefiere.
- [ ] **Step 3: Build** (OK).
- [ ] **Step 4: Commit**

```bash
git add "src/app/api/transfers/[id]/route.ts" src/lib/inventory/transferBatchStock.ts src/lib/inventory/transferBatchStock.test.ts
git commit -m "feat(batches): transfers preserve lot identity across locations (FEFO source)"
```

---

## Task 12: Ajuste / entrada manual por lote

**Files:** Modify `src/app/api/inventory/movement/route.ts`

- [ ] **Step 1: Confirm not pending** (`git status --short`).
- [ ] **Step 2: Batch-aware movement** — agregar `batchId: z.string().optional()`, `lotNumber`/`expiryDate` opcionales al schema. En el handler, si el producto tiene `hasBatches`:
  - `IN` con lote: upsert `ProductBatch(productId, lotNumber)` (set expiryDate) + `addBatchStock(+quantity)`.
  - `ADJUSTMENT` por lote (requiere `batchId`): set `BatchInventory(batchId, locationId).quantity = data.quantity` + movimiento ADJUSTMENT con batchId.
  - `OUT` con lote: `deductBatchesFEFO` (allowExpired true para ajustes/salidas manuales) o `batchId` explícito si se envía.
  Productos sin lote: el flujo actual (adjustStock/ADJUSTMENT inline) sin cambios. Importar `addBatchStock`/`deductBatchesFEFO`.
- [ ] **Step 3: Build** (OK).
- [ ] **Step 4: Commit**

```bash
git add src/app/api/inventory/movement/route.ts
git commit -m "feat(batches): inventory movement is lot-aware (entry + per-lot adjustment)"
```

---

# FASE 4 — Reportes / alertas

## Task 13: Endpoint de reporte de vencimientos

**Files:** Create `src/app/api/reports/expiry/route.ts`

- [ ] **Step 1: Implement** — GET que devuelve, para el negocio, los lotes con stock (`BatchInventory.quantity > 0`) con producto, lote, ubicación, cantidad, `expiryDate`, y `status` (usando `batchStatus` con `business.expiryAlertDays` y `today` del servidor). Filtros opcionales `?status=&locationId=&productId=`. Guardar por `businessId` (join `batch.product.businessId`). Devolver también un resumen `{ nearCount, expiredCount, nearQty, expiredQty }` para el widget.
```ts
// forma de la respuesta
{ items: [{ productName, lotNumber, locationName, quantity, expiryDate, status }], summary: { nearCount, expiredCount } }
```
- [ ] **Step 2: Build** (OK).
- [ ] **Step 3: Commit**

```bash
git add src/app/api/reports/expiry/route.ts
git commit -m "feat(batches): expiry report endpoint (near/expired classification + summary)"
```

---

# FASE 5 — UI

## Task 14: Ajustes del negocio — umbral + permitir vencidos

**Files:** Modify `src/app/warehouse/settings/page.tsx` (confirmar NO pendiente) y su API de negocio.

- [ ] **Step 1: Confirm not pending** — `git status --short -- src/app/warehouse/settings/page.tsx`.
- [ ] **Step 2: Add fields** — en ajustes del negocio, agregar inputs **Días de alerta de vencimiento** (`expiryAlertDays`, number) y **Permitir venta de vencidos** (`allowExpiredSale`, toggle). Persistir vía la API de negocio existente (`/api/business/profile` u equivalente — leer cuál usa la página; agregar los dos campos al schema y al update). Gatear la sección por `<ModuleGate module="BATCHES">` o mostrarla siempre (decisión: mostrarla solo si el tenant tiene BATCHES via `useModules().has('BATCHES')`). Claves i18n `batches.*` (paridad).
- [ ] **Step 3: Build + parity** (`bun run test -- src/lib/i18n/parity.test.ts` PASS, `bun run build` OK).
- [ ] **Step 4: Commit** (archivos específicos).

```bash
git add src/app/warehouse/settings/page.tsx <api-negocio> locales/es.json locales/pt.json locales/en.json
git commit -m "feat(batches): business settings for expiry threshold + allow expired sale"
```

---

## Task 15: UI compra — lote + vencimiento por línea

**Files:** Modify `src/components/warehouse/InvoiceModal.tsx` (confirmar NO pendiente)

- [ ] **Step 1: Confirm not pending**.
- [ ] **Step 2: Add lot inputs** — cuando la línea es de un producto con `hasBatches`, mostrar campos **lote** y **fecha de vencimiento**; incluirlos en el payload al crear la factura. Mirror del patrón del selector de variante que ya existe en ese modal. i18n `batches.*`.
- [ ] **Step 3: Build + parity** (OK/PASS).
- [ ] **Step 4: Commit**.

```bash
git add src/components/warehouse/InvoiceModal.tsx src/app/warehouse/invoices/page.tsx locales/es.json locales/pt.json locales/en.json
git commit -m "feat(batches): purchase line captures lot + expiry for batched products"
```

---

## Task 16: UI producto — toggle lotes; inventario — vista por lote; reporte de vencimientos

**Files:** Create `src/components/products/BatchToggle.tsx`, `src/components/inventory/BatchStockRows.tsx`, `src/app/warehouse/reports/expiry/page.tsx`

- [ ] **Step 1: Confirm targets** — el editor de producto principal está en un archivo pendiente (`warehouse/products/page.tsx`); NO editarlo. Crear componentes aislados:
  - `BatchToggle` (client, gateado `<ModuleGate module="BATCHES">`): toggle `hasBatches` vía `PATCH /api/batches`, deshabilitado si el producto ya tiene variantes (muestra el motivo). Montar en la ruta standalone de gestión (análogo a `/warehouse/products/[id]/variants` → crear `/warehouse/products/[id]/batches/page.tsx` que renderice el toggle + la lista de lotes del producto vía `GET /api/batches?productId=`).
  - `BatchStockRows` (client): dado producto+ubicación, lista lotes con stock + vencimiento + estado (color por `batchStatus`). Listo para montar bajo una fila de producto con lotes.
- [ ] **Step 2: Reporte de vencimientos** — `src/app/warehouse/reports/expiry/page.tsx` (client) que consume `/api/reports/expiry`, tabla con estado por color, filtros. i18n `batches.*` (paridad).
- [ ] **Step 3: Build + parity** (OK/PASS).
- [ ] **Step 4: Commit**.

```bash
git add src/components/products/BatchToggle.tsx "src/app/warehouse/products/[id]/batches/page.tsx" src/components/inventory/BatchStockRows.tsx src/app/warehouse/reports/expiry/page.tsx locales/es.json locales/pt.json locales/en.json
git commit -m "feat(batches): product batch toggle + per-lot stock rows + expiry report page"
```

---

## Task 17: Suite completa + build gate

- [ ] **Step 1: `bun run test`** → todos verdes.
- [ ] **Step 2: `bun run build`** → OK.
- [ ] **Step 3:** `git status --short | grep '^ M' | wc -l` → **11** (pendientes intactos). Si bajó, investigar.

---

## Self-Review (contra el spec)

- **§3.1 Business config** → Task 1 + Task 14 (UI). ✅
- **§3.2 Product.hasBatches (exclusivo)** → Task 1 (campo) + Task 8 (validación exclusividad) + Task 16 (toggle deshabilitado). ✅
- **§3.3/3.4 ProductBatch/BatchInventory** → Task 1. ✅
- **§3.5 batchId/lotNumber/expiryDate** → Task 1. ✅
- **§4.1 batchStatus** → Task 2. ✅
- **§4.2 addBatchStock** → Task 4. ✅
- **§4.3 deductBatchesFEFO (+ pickBatchesFEFO)** → Tasks 3, 5. ✅
- **§4.4 stockForProduct** → Task 6. ✅
- **§5 flujos (recepción, venta FEFO, transferencia, ajuste, entrada)** → Tasks 9, 10, 11, 12. ✅
- **§6 BATCHES LIVE + gating** → Task 7 (LIVE) + Task 8 (gating). ✅
- **§7 reportes/alertas** → Task 13 (endpoint) + Task 16 (página) + summary para dashboard. ✅ (widget en dashboard: el endpoint provee summary; el archivo dashboard/warehouse es PENDIENTE → el widget se monta cuando ese archivo sea commitable, o se muestra en la página de reporte; anotado.)
- **§8 UI** → Tasks 14, 15, 16. ✅
- **§9 testing** → Tasks 2,3,4,5,6 (puras/tx-stub) + guard (Task 8) + flujos. ✅
- **§11 criterios** → cubiertos por Tasks 1-16 + Task 17 (gate).

**Notas de riesgo:** el widget de dashboard depende de un archivo pendiente → se difiere su montaje (el endpoint summary queda listo). Task 10 debe mapear el error `insufficient` de FEFO a una respuesta legible en la ruta del PDF. Task 11 introduce `transferBatchStock` (helper testeable) para no dispersar la lógica FEFO de transferencia. Cada task de flujo/UI verifica `git status` del archivo y aísla si es pendiente (lección [[feedback_subagent_pending_files]]).

**Type consistency:** `batchStatus(expiry, today, days)`, `pickBatchesFEFO(batches, qty, {today,allowExpired})`, `addBatchStock(tx, args)`, `deductBatchesFEFO(tx, args)` con firmas consistentes en Tasks 2-5, 9-12. `hasBatches` consistente schema/API/UI. `ProductBatch`/`BatchInventory` campos consistentes con Task 1. ✅
