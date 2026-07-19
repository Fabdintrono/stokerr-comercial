# Variantes de Producto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un producto puede tener variantes por atributos (SKU/precio/stock propios) conscientes en todo el loop de stock (catálogo, inventario, POS/venta, compras, transferencias), como overlay que no toca el stock simple existente.

**Architecture:** Tabla `ProductVariant` + `VariantInventory` (stock de variantes separado; `Inventory` intacto). Un helper central `adjustStock` rutea a `VariantInventory` (si hay `variantId`) o `Inventory` (simple); todos los flujos lo usan. Módulo `VARIANTS` pasa a LIVE y gatea la gestión de variantes.

**Tech Stack:** Next.js 16 App Router, Prisma (`prisma db push`, sin migraciones versionadas), Vitest (`bun run test`, node env), i18n del bloque E, sistema de módulos D1/verticales.

**Regla git de este repo:** hay 11 archivos sin commitear que NO se deben commitear. SIEMPRE `git add <archivos específicos>`, NUNCA `git add -A`/`git add .`. **OJO — estos archivos del set pendiente NO se tocan en este plan:** `src/app/api/dashboard/warehouse/route.ts`, `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts` (verificar si está en pendientes antes de tocar — si `git status` lo muestra como ` M`, coordinar), `src/app/api/replenishment/[id]/route.ts`, `src/app/api/public/kitchen/[token]/order/[orderId]/route.ts`, `src/app/restaurant/*` pendientes, `src/app/warehouse/{dashboard,inventory,products,replenishment}/page.tsx`, `src/components/layout/NotificationBell.tsx`. Antes de editar cualquier archivo, correr `git status --short -- <archivo>`; si aparece como ` M` (pendiente), reportar y NO commitearlo mezclado.

**Fases:** (1) modelo + helpers puros + adjustStock + módulo LIVE · (2) API de gestión de variantes + gating · (3) flujos de stock (movimiento, transferencias, compras, venta) · (4) UI.

---

## File Structure

- `prisma/schema.prisma` — MODIFY: `Product.hasVariants`+`variantOptions`+`variants`; `ProductVariant`, `VariantInventory` nuevos; `variantId?` en `InventoryMovement`/`OrderItem`/`InvoiceLineItem`/`TransferLineItem`; relación inversa en `Location`.
- `src/lib/variants/displayName.ts` (+ test) — `variantDisplayName(attributes)`.
- `src/lib/variants/pricing.ts` (+ test) — `effectivePrice`/`effectiveCost`.
- `src/lib/variants/stock.ts` (+ test) — `stockForProduct` (resolución variante/simple).
- `src/lib/inventory/adjustStock.ts` (+ test) — helper central de mutación de stock.
- `src/lib/modules/liveModules.ts` (+ test) — filtra catálogo por `status==='LIVE'`.
- `src/lib/modules/registry.ts` — MODIFY: `VARIANTS` status `LIVE`.
- `prisma/seed.ts` — MODIFY: `VARIANTS` status `LIVE`.
- `src/app/api/variants/route.ts` (+ `[id]/route.ts`) — CREATE: CRUD de variantes, gateado.
- `src/app/api/inventory/movement/route.ts` — MODIFY: aceptar `variantId`, usar `adjustStock`.
- `src/app/api/transfers/[id]/route.ts` — MODIFY: transferir variantes vía `adjustStock`.
- `src/app/api/purchase-invoices/[id]/status/route.ts` — MODIFY: recibir stock por variante.
- `src/app/api/orders/route.ts` — MODIFY: `OrderItem.variantId` + descuento por variante en venta.
- `src/app/api/sales/[orderId]/pdf/route.ts` y `/sales/new` UI — MODIFY: mostrar variante.
- UI: editor de producto, inventario, POS/`/sales/new`, compras — MODIFY (Fase 4).
- `locales/{es,pt,en}.json` — MODIFY: claves `variants.*`.

---

# FASE 1 — Modelo, helpers puros, adjustStock, módulo LIVE

## Task 1: Schema — ProductVariant, VariantInventory, variantId en tablas de movimiento

**Files:** Modify `prisma/schema.prisma`

- [ ] **Step 1: Add fields/models**

En `model Product`, agregar (junto a los otros campos escalares y relaciones):
```prisma
  hasVariants    Boolean @default(false)
  variantOptions Json?
```
y en sus relaciones:
```prisma
  variants ProductVariant[]
```

Agregar los modelos nuevos (cerca de `Product`):
```prisma
model ProductVariant {
  id         String   @id @default(cuid())
  productId  String
  attributes Json
  sku        String?
  barcode    String?
  costPrice  Decimal? @db.Decimal(18, 2)
  salePrice  Decimal? @db.Decimal(18, 2)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  product       Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  inventory     VariantInventory[]
  movements     InventoryMovement[]
  orderItems    OrderItem[]
  invoiceItems  InvoiceLineItem[]
  transferItems TransferLineItem[]

  @@index([productId])
  @@map("product_variants")
}

model VariantInventory {
  id         String @id @default(cuid())
  quantity   Float  @default(0)
  variantId  String
  locationId String

  variant  ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  location Location       @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@unique([variantId, locationId])
  @@map("variant_inventory")
}
```

En `model InventoryMovement` agregar `variantId String?` y `variant ProductVariant? @relation(fields: [variantId], references: [id])`.
En `model OrderItem` agregar `variantId String?` y `variant ProductVariant? @relation(fields: [variantId], references: [id])`.
En `model InvoiceLineItem` agregar `variantId String?` y `variant ProductVariant? @relation(fields: [variantId], references: [id])`.
En `model TransferLineItem` agregar `variantId String?` y `variant ProductVariant? @relation(fields: [variantId], references: [id])`.
En `model Location` agregar la relación inversa `variantInventory VariantInventory[]`.

- [ ] **Step 2: Push + regenerate**

Run: `bun run db:push`
Expected: "Your database is now in sync with your Prisma schema." (agrega tablas/columnas nullable; no destructivo). Si pide data loss, STOP y reportar.

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: build OK (cliente Prisma reconoce los modelos).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(variants): ProductVariant + VariantInventory + variantId on movement tables"
```

---

## Task 2: `variantDisplayName` (puro, TDD)

**Files:** Create `src/lib/variants/displayName.ts` + `src/lib/variants/displayName.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/variants/displayName.test.ts
import { describe, it, expect } from 'vitest'
import { variantDisplayName } from './displayName'

describe('variantDisplayName', () => {
  it('joins attribute values with " / " in insertion order', () => {
    expect(variantDisplayName({ Talla: 'M', Color: 'Rojo' })).toBe('M / Rojo')
  })
  it('handles a single attribute', () => {
    expect(variantDisplayName({ Medida: '3/8"' })).toBe('3/8"')
  })
  it('returns empty string for no attributes', () => {
    expect(variantDisplayName({})).toBe('')
  })
})
```

- [ ] **Step 2: Run → FAIL**

Run: `bun run test -- src/lib/variants/displayName.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/variants/displayName.ts
export function variantDisplayName(attributes: Record<string, string>): string {
  return Object.values(attributes).join(' / ')
}
```

- [ ] **Step 4: Run → PASS**

Run: `bun run test -- src/lib/variants/displayName.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/variants/displayName.ts src/lib/variants/displayName.test.ts
git commit -m "feat(variants): variantDisplayName helper"
```

---

## Task 3: `effectivePrice`/`effectiveCost` (puro, TDD)

**Files:** Create `src/lib/variants/pricing.ts` + `src/lib/variants/pricing.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/variants/pricing.test.ts
import { describe, it, expect } from 'vitest'
import { effectivePrice, effectiveCost } from './pricing'

describe('effective price/cost', () => {
  it('uses variant value when set', () => {
    expect(effectivePrice({ salePrice: '12.50' }, { salePrice: '10.00' })).toBe('12.50')
    expect(effectiveCost({ costPrice: '5.00' }, { costPrice: '4.00' })).toBe('5.00')
  })
  it('falls back to product value when variant is null/undefined', () => {
    expect(effectivePrice({ salePrice: null }, { salePrice: '10.00' })).toBe('10.00')
    expect(effectiveCost({}, { costPrice: '4.00' })).toBe('4.00')
  })
})
```

- [ ] **Step 2: Run → FAIL**

Run: `bun run test -- src/lib/variants/pricing.test.ts`

- [ ] **Step 3: Implement** (precios como string por Decimal de Prisma)

```ts
// src/lib/variants/pricing.ts
type PriceLike = { salePrice?: string | null }
type CostLike = { costPrice?: string | null }

export function effectivePrice(variant: PriceLike, product: { salePrice: string }): string {
  return variant.salePrice != null ? variant.salePrice : product.salePrice
}

export function effectiveCost(variant: CostLike, product: { costPrice: string }): string {
  return variant.costPrice != null ? variant.costPrice : product.costPrice
}
```

- [ ] **Step 4: Run → PASS**

Run: `bun run test -- src/lib/variants/pricing.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/variants/pricing.ts src/lib/variants/pricing.test.ts
git commit -m "feat(variants): effectivePrice/effectiveCost with product fallback"
```

---

## Task 4: `stockForProduct` (puro, TDD)

**Files:** Create `src/lib/variants/stock.ts` + `src/lib/variants/stock.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/variants/stock.test.ts
import { describe, it, expect } from 'vitest'
import { stockForProduct } from './stock'

describe('stockForProduct', () => {
  it('sums VariantInventory quantities for a product with variants', () => {
    const product = { hasVariants: true }
    const variantInv = [{ quantity: 3 }, { quantity: 5 }]
    expect(stockForProduct(product, [], variantInv)).toBe(8)
  })
  it('uses Inventory quantity for a simple product', () => {
    const product = { hasVariants: false }
    const inv = [{ quantity: 7 }]
    expect(stockForProduct(product, inv, [])).toBe(7)
  })
  it('returns 0 when no rows', () => {
    expect(stockForProduct({ hasVariants: false }, [], [])).toBe(0)
    expect(stockForProduct({ hasVariants: true }, [], [])).toBe(0)
  })
})
```

- [ ] **Step 2: Run → FAIL**

Run: `bun run test -- src/lib/variants/stock.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/variants/stock.ts
export function stockForProduct(
  product: { hasVariants: boolean },
  inventory: { quantity: number }[],
  variantInventory: { quantity: number }[],
): number {
  const rows = product.hasVariants ? variantInventory : inventory
  return rows.reduce((sum, r) => sum + r.quantity, 0)
}
```

- [ ] **Step 4: Run → PASS**

Run: `bun run test -- src/lib/variants/stock.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/variants/stock.ts src/lib/variants/stock.test.ts
git commit -m "feat(variants): stockForProduct resolves variant vs simple stock"
```

---

## Task 5: `adjustStock` — helper central de mutación (TDD con tx stub)

**Files:** Create `src/lib/inventory/adjustStock.ts` + `src/lib/inventory/adjustStock.test.ts`

Modelo tomado del patrón real en `src/app/api/inventory/movement/route.ts` (findUnique/create/update Inventory + create InventoryMovement).

- [ ] **Step 1: Failing test** (tx stub captura llamadas; sin DB)

```ts
// src/lib/inventory/adjustStock.test.ts
import { describe, it, expect } from 'vitest'
import { adjustStock } from './adjustStock'

function makeTx(existing: { variant?: any; simple?: any } = {}) {
  const calls: any[] = []
  return {
    calls,
    variantInventory: {
      findUnique: async () => existing.variant ?? null,
      create: async (a: any) => { calls.push(['vi.create', a]); return { id: 'vi1', quantity: a.data.quantity } },
      update: async (a: any) => { calls.push(['vi.update', a]); return { id: 'vi1', quantity: a.data.quantity } },
    },
    inventory: {
      findUnique: async () => existing.simple ?? null,
      create: async (a: any) => { calls.push(['inv.create', a]); return { id: 'inv1', quantity: a.data.quantity } },
      update: async (a: any) => { calls.push(['inv.update', a]); return { id: 'inv1', quantity: a.data.quantity } },
    },
    inventoryMovement: { create: async (a: any) => { calls.push(['mv.create', a]); return a } },
  }
}

describe('adjustStock', () => {
  it('routes to VariantInventory when variantId present, creating the row and a movement', async () => {
    const tx = makeTx()
    await adjustStock(tx as any, { productId: 'p1', variantId: 'v1', locationId: 'l1', delta: 3, type: 'IN', userId: 'u1' })
    expect(tx.calls[0]).toEqual(['vi.create', expect.objectContaining({ data: expect.objectContaining({ variantId: 'v1', locationId: 'l1', quantity: 3 }) })])
    const mv = tx.calls.find(c => c[0] === 'mv.create')[1]
    expect(mv.data).toMatchObject({ productId: 'p1', variantId: 'v1', locationId: 'l1', quantity: 3, type: 'IN' })
  })
  it('adds delta to an existing VariantInventory row', async () => {
    const tx = makeTx({ variant: { id: 'vi1', quantity: 5 } })
    await adjustStock(tx as any, { productId: 'p1', variantId: 'v1', locationId: 'l1', delta: -2, type: 'OUT', userId: 'u1' })
    const upd = tx.calls.find(c => c[0] === 'vi.update')[1]
    expect(upd.data.quantity).toBe(3)
  })
  it('routes to Inventory when no variantId (simple product)', async () => {
    const tx = makeTx()
    await adjustStock(tx as any, { productId: 'p1', locationId: 'l1', delta: 4, type: 'IN', userId: 'u1' })
    expect(tx.calls[0][0]).toBe('inv.create')
    const mv = tx.calls.find(c => c[0] === 'mv.create')[1]
    expect(mv.data.variantId ?? null).toBeNull()
  })
})
```

- [ ] **Step 2: Run → FAIL**

Run: `bun run test -- src/lib/inventory/adjustStock.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/inventory/adjustStock.ts
type TxLike = any // Prisma tx client; typed loosely to keep the helper simple

export interface AdjustStockArgs {
  productId: string
  variantId?: string | null
  locationId: string
  delta: number
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'
  userId: string
  reason?: string
}

export async function adjustStock(tx: TxLike, args: AdjustStockArgs): Promise<void> {
  const { productId, variantId, locationId, delta, type, userId, reason } = args
  let inventoryId: string | null = null

  if (variantId) {
    const existing = await tx.variantInventory.findUnique({ where: { variantId_locationId: { variantId, locationId } } })
    if (existing) {
      await tx.variantInventory.update({ where: { id: existing.id }, data: { quantity: existing.quantity + delta } })
    } else {
      await tx.variantInventory.create({ data: { variantId, locationId, quantity: delta } })
    }
  } else {
    const existing = await tx.inventory.findUnique({ where: { productId_locationId: { productId, locationId } } })
    if (existing) {
      inventoryId = existing.id
      await tx.inventory.update({ where: { id: existing.id }, data: { quantity: existing.quantity + delta } })
    } else {
      const created = await tx.inventory.create({ data: { productId, locationId, quantity: delta } })
      inventoryId = created.id
    }
  }

  await tx.inventoryMovement.create({
    data: {
      productId,
      variantId: variantId ?? null,
      locationId,
      userId,
      type,
      quantity: Math.abs(delta),
      reason: reason ?? null,
      inventoryId,
    },
  })
}
```

- [ ] **Step 4: Run → PASS**

Run: `bun run test -- src/lib/inventory/adjustStock.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/inventory/adjustStock.ts src/lib/inventory/adjustStock.test.ts
git commit -m "feat(variants): adjustStock central helper (routes variant vs simple + movement)"
```

---

## Task 6: `liveModules` helper (cierra hallazgo del review de verticales, TDD)

**Files:** Create `src/lib/modules/liveModules.ts` + `src/lib/modules/liveModules.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/modules/liveModules.test.ts
import { describe, it, expect } from 'vitest'
import { liveModules } from './liveModules'

describe('liveModules', () => {
  it('keeps only LIVE-status modules', () => {
    const enabled = new Set(['RESTAURANT', 'VARIANTS', 'BATCHES'])
    const catalog = [
      { key: 'RESTAURANT', status: 'LIVE' },
      { key: 'VARIANTS', status: 'LIVE' },
      { key: 'BATCHES', status: 'COMING_SOON' },
    ]
    expect(liveModules(enabled as any, catalog as any)).toEqual(new Set(['RESTAURANT', 'VARIANTS']))
  })
  it('drops enabled keys not present in catalog', () => {
    expect(liveModules(new Set(['X']) as any, [] as any)).toEqual(new Set())
  })
})
```

- [ ] **Step 2: Run → FAIL**

Run: `bun run test -- src/lib/modules/liveModules.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/modules/liveModules.ts
import type { ModuleKey } from './registry'

export function liveModules(
  enabled: Set<ModuleKey>,
  catalog: { key: ModuleKey; status: 'LIVE' | 'COMING_SOON' }[],
): Set<ModuleKey> {
  const liveKeys = new Set(catalog.filter(m => m.status === 'LIVE').map(m => m.key))
  return new Set([...enabled].filter(k => liveKeys.has(k)))
}
```

- [ ] **Step 4: Run → PASS**

Run: `bun run test -- src/lib/modules/liveModules.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/liveModules.ts src/lib/modules/liveModules.test.ts
git commit -m "feat(modules): liveModules filters COMING_SOON out of a live-feature gate"
```

---

## Task 7: Módulo VARIANTS → LIVE (registry + seed + DB)

**Files:** Modify `src/lib/modules/registry.ts`, `prisma/seed.ts`

- [ ] **Step 1: Update registry status**

En `src/lib/modules/registry.ts`, cambiar la entrada `VARIANTS` de `status: 'COMING_SOON'` a `status: 'LIVE'`.

- [ ] **Step 2: Update seed**

En `prisma/seed.ts` (array `moduleSeed`), cambiar el status de `VARIANTS` de `'COMING_SOON'` a `'LIVE'`.

- [ ] **Step 3: Update the live DB**

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' -e "import('@prisma/client').then(async({PrismaClient})=>{const p=new PrismaClient();await p.module.update({where:{key:'VARIANTS'},data:{status:'LIVE'}});console.log('VARIANTS → LIVE');await p.\$disconnect()})"`
Expected: `VARIANTS → LIVE`.

- [ ] **Step 4: Verify registry test still green + build**

Run: `bun run test -- src/lib/modules/registry.test.ts && bun run build`
Expected: registry test may assert `VARIANTS` is COMING_SOON — if so, update that assertion to `LIVE` in `src/lib/modules/registry.test.ts` (and add the file to the commit). Build OK.

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/registry.ts prisma/seed.ts src/lib/modules/registry.test.ts
git commit -m "feat(variants): VARIANTS module is now LIVE"
```

---

# FASE 2 — API de gestión de variantes + gating

## Task 8: API CRUD de variantes (gateada por VARIANTS)

**Files:** Create `src/app/api/variants/route.ts`, `src/app/api/variants/[id]/route.ts`

Sigue el patrón de las rutas existentes (sesión, `businessId` de header/cookie, zod, `requireModule`).

- [ ] **Step 1: Implement `src/app/api/variants/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard'

const createSchema = z.object({
  productId: z.string(),
  attributes: z.record(z.string(), z.string()),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.number().optional(),
  salePrice: z.number().optional(),
})

function bizId(req: NextRequest) {
  return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  const productId = new URL(request.url).searchParams.get('productId')
  if (!productId) return NextResponse.json({ error: 'productId requerido' }, { status: 400 })
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  const variants = await prisma.productVariant.findMany({ where: { productId }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ variants })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businessId = bizId(request)
  if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 })
  try {
    await requireModule(prisma, businessId, 'VARIANTS')
  } catch (e) {
    if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 })
    throw e
  }
  const data = createSchema.parse(await request.json())
  const product = await prisma.product.findFirst({ where: { id: data.productId, businessId } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  const variant = await prisma.productVariant.create({
    data: {
      productId: data.productId,
      attributes: data.attributes,
      sku: data.sku,
      barcode: data.barcode,
      costPrice: data.costPrice,
      salePrice: data.salePrice,
    },
  })
  if (!product.hasVariants) {
    await prisma.product.update({ where: { id: product.id }, data: { hasVariants: true } })
  }
  return NextResponse.json({ variant }, { status: 201 })
}
```

- [ ] **Step 2: Implement `src/app/api/variants/[id]/route.ts`** (PATCH + DELETE, gateados)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard'

const patchSchema = z.object({
  attributes: z.record(z.string(), z.string()).optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  costPrice: z.number().nullable().optional(),
  salePrice: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
})

function bizId(req: NextRequest) {
  return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value
}

async function guard(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const businessId = bizId(req)
  if (!businessId) return { error: NextResponse.json({ error: 'Sin negocio' }, { status: 400 }) }
  try { await requireModule(prisma, businessId, 'VARIANTS') }
  catch (e) {
    if (e instanceof ModuleForbiddenError) return { error: NextResponse.json({ error: 'module not enabled' }, { status: 403 }) }
    throw e
  }
  return { businessId }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(request); if (g.error) return g.error
  const { id } = await params
  const data = patchSchema.parse(await request.json())
  const variant = await prisma.productVariant.update({ where: { id }, data })
  return NextResponse.json({ variant })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(request); if (g.error) return g.error
  const { id } = await params
  await prisma.productVariant.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
```
(Soft-delete: `isActive=false`, no borra stock/histórico — spec §8.)

- [ ] **Step 3: Build**

Run: `bun run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/variants/route.ts "src/app/api/variants/[id]/route.ts"
git commit -m "feat(variants): variant CRUD API gated by VARIANTS module"
```

---

# FASE 3 — Flujos de stock

## Task 9: `inventory/movement` acepta variantId y usa adjustStock

**Files:** Modify `src/app/api/inventory/movement/route.ts`

- [ ] **Step 1: Confirm not pending**

Run: `git status --short -- src/app/api/inventory/movement/route.ts`
Expected: vacío (no pendiente). Si aparece ` M`, reportar y parar.

- [ ] **Step 2: Add variantId + delegate to adjustStock**

Agregar `variantId: z.string().optional()` a `createMovementSchema`. Importar `import { adjustStock } from '@/lib/inventory/adjustStock'`. Reemplazar el bloque `$transaction` (el que hace find/create/update inventory + create movement, ~líneas 70-120) por un cálculo de `delta` según `type` y una llamada a `adjustStock`:
```ts
    const delta =
      data.type === 'IN' ? data.quantity :
      data.type === 'ADJUSTMENT' ? await computeAdjustmentDelta() :
      -data.quantity;
    await prisma.$transaction(async (tx) => {
      await adjustStock(tx, {
        productId: data.productId,
        variantId: data.variantId ?? null,
        locationId: data.locationId,
        delta,
        type: data.type,
        userId: session.user.id,
        reason: data.reason,
      });
    });
    return NextResponse.json({ ok: true });
```
Para `ADJUSTMENT` (que fija cantidad absoluta), calcular el delta contra el stock actual: leer el quantity actual (VariantInventory si `variantId`, si no Inventory) y `delta = data.quantity - actual`. Implementar `computeAdjustmentDelta` inline leyendo la fila correspondiente antes de la transacción (o dentro). Mantener las validaciones de producto/location existentes.

- [ ] **Step 3: Build**

Run: `bun run build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/inventory/movement/route.ts
git commit -m "feat(variants): inventory movement is variant-aware via adjustStock"
```

---

## Task 10: Transferencias por variante

**Files:** Modify `src/app/api/transfers/[id]/route.ts` y la creación de transfer (`src/app/api/transfers/route.ts`)

- [ ] **Step 1: Confirm not pending**

Run: `git status --short -- "src/app/api/transfers/[id]/route.ts" src/app/api/transfers/route.ts`
Expected: vacío.

- [ ] **Step 2: Accept variantId on transfer line creation**

READ `src/app/api/transfers/route.ts`. En el schema de creación de líneas, agregar `variantId: z.string().optional()` por ítem, y guardarlo en `tx.transferLineItem.create({ data: { ..., variantId } })`.

- [ ] **Step 3: Move variant stock on confirm**

READ `src/app/api/transfers/[id]/route.ts` (el APPROVE que hace COMPLETED, ~líneas 54-90: hoy usa `tx.inventory.findUnique/update` para from/to). Importar `adjustStock`. Reemplazar la mutación manual de `fromInv`/`toInv` por, para cada line item:
```ts
      await adjustStock(tx, { productId: item.productId, variantId: item.variantId ?? null, locationId: transfer.fromLocationId, delta: -item.quantity, type: 'TRANSFER', userId: session.user.id });
      await adjustStock(tx, { productId: item.productId, variantId: item.variantId ?? null, locationId: transfer.toLocationId, delta: item.quantity, type: 'IN', userId: session.user.id });
```
(cargar `lineItems` con `variantId` en el include del transfer).

- [ ] **Step 4: Build**

Run: `bun run build`
Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/transfers/[id]/route.ts" src/app/api/transfers/route.ts
git commit -m "feat(variants): transfers move variant stock via adjustStock"
```

---

## Task 11: Compras/recepción por variante

**Files:** Modify `src/app/api/purchase-invoices/[id]/status/route.ts` y la creación de líneas de factura.

- [ ] **Step 1: Confirm not pending**

Run: `git status --short -- "src/app/api/purchase-invoices/[id]/status/route.ts"`
Expected: vacío.

- [ ] **Step 2: Accept variantId on invoice line creation**

Localizar dónde se crean los `InvoiceLineItem` (READ `src/app/api/purchase-invoices/route.ts` o el `[id]` de edición) y agregar `variantId` opcional al schema y al `create`.

- [ ] **Step 3: Increment variant stock on RECEIVED**

En `src/app/api/purchase-invoices/[id]/status/route.ts` (bloque `data.status === 'RECEIVED' && existing.status !== 'RECEIVED'`, ~líneas 53-96 que hoy hacen `tx.inventory.findUnique/update` + movement), cargar `variantId` en cada `item` del include, importar `adjustStock` y reemplazar la mutación por:
```ts
        await adjustStock(tx, { productId: item.productId, variantId: item.variantId ?? null, locationId, delta: item.quantity, type: 'IN', userId: session.user.id, reason: 'Recepción de compra' });
```
(usar el `locationId` que la ruta ya resuelve para la factura).

- [ ] **Step 4: Build**

Run: `bun run build`
Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/purchase-invoices/[id]/status/route.ts" src/app/api/purchase-invoices/route.ts
git commit -m "feat(variants): purchase reception increments variant stock via adjustStock"
```

---

## Task 12: Venta consciente de variante (OrderItem.variantId + descuento)

**Files:** Modify `src/app/api/orders/route.ts`

- [ ] **Step 1: Confirm not pending**

Run: `git status --short -- src/app/api/orders/route.ts`
Expected: vacío.

- [ ] **Step 2: Store variantId + decrement variant stock**

READ `src/app/api/orders/route.ts` POST fully. En el schema de ítems, agregar `variantId: z.string().optional()`. Al crear cada `OrderItem`, guardar `variantId`. Si la ruta hoy descuenta stock al crear/cerrar la orden, reemplazar esa mutación por `adjustStock` con `variantId` (delta negativo, type OUT). **Si la ruta NO descuenta stock hoy** (verificar), agregar el descuento SOLO para líneas con `variantId` NO es correcto — el descuento debe aplicar igual a simples; en ese caso, agregar el descuento vía `adjustStock` para todas las líneas al crear la venta (delta `-quantity`, type OUT), respetando el comportamiento esperado de una venta. Precio de la línea = precio efectivo de la variante (usar `effectivePrice`). Reportar en el commit si se agregó descuento nuevo o se adaptó el existente.

- [ ] **Step 3: Build**

Run: `bun run build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat(variants): sales store variantId and decrement variant stock"
```

---

# FASE 4 — UI

## Task 13: Editor de producto — definir atributos y gestionar variantes

**Files:** Modify el editor/form de producto (READ para localizarlo: probablemente un modal/form en `src/app/warehouse/products/` NO-pendiente, o un componente `ProductForm`). Si el único editor está en `src/app/warehouse/products/page.tsx` (PENDIENTE), crear un componente nuevo `src/components/products/VariantEditor.tsx` y montarlo desde una ruta/página NO pendiente, o reportar para coordinar.

- [ ] **Step 1: Confirm the product editor location + pending status**

Run: `grep -rln "hasVariants\|ProductForm\|crear producto\|salePrice" src/app/warehouse/products src/components 2>/dev/null; git status --short -- src/app/warehouse/products/page.tsx`
Si el editor está en un archivo pendiente, crear `src/components/products/VariantEditor.tsx` como componente aislado (gateado con `<ModuleGate module="VARIANTS">`) que: muestra el toggle `hasVariants`, editor de `variantOptions` (nombre + valores), y la lista de variantes (agregar/editar/desactivar vía `/api/variants`). Reportar dónde se montó.

- [ ] **Step 2: Implement `VariantEditor` component**

Componente client que usa `/api/variants` (GET por productId, POST/PATCH/DELETE). Usa `variantDisplayName` para mostrar cada variante. Envolver en `<ModuleGate module="VARIANTS">`. Agregar claves i18n `variants.*` (title, addVariant, attributes, values, sku, price, cost, deactivate) a los 3 locales manteniendo paridad.

- [ ] **Step 3: Build + parity**

Run: `bun run test -- src/lib/i18n/parity.test.ts && bun run build`
Expected: PASS/OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/products/VariantEditor.tsx locales/es.json locales/pt.json locales/en.json <archivo-donde-se-montó>
git commit -m "feat(variants): product variant editor (attributes + variants), gated"
```

---

## Task 14: Selector de variante en POS / `/sales/new` / compras

**Files:** Modify `src/app/sales/new/page.tsx` (NO pendiente) y el POS/compras según corresponda (verificar pendientes primero).

- [ ] **Step 1: Confirm non-pending targets**

Run: `git status --short -- src/app/sales/new/page.tsx`
Expected: vacío. Para el POS de restaurante (`/pos`) y compras, verificar pendientes; si el archivo está pendiente, coordinar/omitir y reportar.

- [ ] **Step 2: Add variant selector to /sales/new**

En `src/app/sales/new/page.tsx`, al agregar un producto con `hasVariants`, mostrar un selector de variante (cargando `/api/variants?productId=`); la línea guarda `variantId` y usa el precio efectivo de la variante. Enviar `variantId` en el POST a `/api/orders`.

- [ ] **Step 3: Build**

Run: `bun run build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/app/sales/new/page.tsx
git commit -m "feat(variants): variant selector in new-sale flow"
```

---

## Task 15: Inventario expandible por variante

**Files:** La vista de inventario NO pendiente (verificar; `src/app/warehouse/inventory/page.tsx` es PENDIENTE → crear un subcomponente o coordinar).

- [ ] **Step 1: Confirm pending status**

Run: `git status --short -- src/app/warehouse/inventory/page.tsx`
Si pendiente: crear `src/components/inventory/VariantStockRows.tsx` (client) que, dado un producto con `hasVariants`, lista sus variantes con stock (de `VariantInventory` vía un endpoint `/api/inventory?productId=` que devuelva stock por variante — verificar si `src/app/api/inventory/route.ts` ya soporta esto; si no, extenderlo, es NO pendiente). Montarlo donde sea posible sin tocar el archivo pendiente, o reportar para coordinar.

- [ ] **Step 2: Extend `/api/inventory` to return variant stock**

READ `src/app/api/inventory/route.ts` (NO pendiente). Agregar: si un producto tiene `hasVariants`, incluir sus variantes con su `VariantInventory` por location. Devolver la forma que consuma el componente.

- [ ] **Step 3: Build**

Run: `bun run build`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/inventory/VariantStockRows.tsx src/app/api/inventory/route.ts
git commit -m "feat(variants): inventory shows per-variant stock"
```

---

## Task 16: Suite completa + build gate

**Files:** none

- [ ] **Step 1: Full suite**

Run: `bun run test`
Expected: todos verdes (nuevos de variantes + previos).

- [ ] **Step 2: Build**

Run: `bun run build`
Expected: OK.

- [ ] **Step 3: Confirm pending untouched**

Run: `git status --short | grep '^ M' | wc -l`
Expected: 11 (los pendientes intactos). Si bajó, investigar qué archivo pendiente se commiteó.

- [ ] **Step 4: Commit (si hubo ajustes)**

```bash
git add <archivos-específicos-de-variantes>
git commit -m "chore(variants): finalize — full suite green, build OK"
```

---

## Self-Review (contra el spec)

- **§3.1 Product.hasVariants/variantOptions** → Task 1. ✅
- **§3.2 ProductVariant** → Task 1. ✅
- **§3.3 VariantInventory** → Task 1. ✅
- **§3.4 variantId en movement/order/invoice/transfer** → Task 1. ✅
- **§4.1 adjustStock** → Task 5. ✅
- **§4.2 stockForProduct** → Task 4. ✅
- **§4.3 flujos (POS/venta, compras, transferencias, ajuste)** → Tasks 9 (ajuste/movimiento), 10 (transferencias), 11 (compras), 12 (venta). ✅
- **§5 módulo VARIANTS LIVE + gating** → Task 7 (LIVE) + Task 8 (gating CRUD). ✅
- **§5 liveModules** → Task 6. ✅
- **§5.1 variantDisplayName / effectivePrice / effectiveCost** → Tasks 2, 3. ✅
- **§6 UI (editor, inventario, POS/sales/compras)** → Tasks 13, 14, 15. ✅
- **§7 testing** → cada task trae sus tests puros; guard en Task 8; flujos en 9-12. ✅
- **§9 criterios** → cubiertos por Tasks 1-15 + Task 16 (gate).

**Riesgo/nota:** las UI (Tasks 13-15) y algunos flujos tocan archivos que pueden estar en el set pendiente (products/inventory pages). Cada task de UI empieza confirmando `git status` del archivo; si es pendiente, crea un componente aislado o reporta para coordinar — para NO bundlear pendientes (lección [[feedback_subagent_pending_files]]). Task 12 (venta) verifica si la venta hoy descuenta stock antes de decidir adaptar vs agregar.

**Type consistency:** `adjustStock(tx, AdjustStockArgs)` con `variantId?: string|null` consistente en Tasks 5,9,10,11,12. `variantDisplayName(Record<string,string>)`, `effectivePrice/effectiveCost` firmas consistentes. `liveModules(Set, catalog)` consistente. `ProductVariant`/`VariantInventory` nombres de campo consistentes con el schema de Task 1. ✅

**Placeholder scan:** los `READ`/`git status --short` de "confirmar primero" son inspección legítima (rutas grandes/variables), no placeholders de código. Task 12 y las UI tienen ramas condicionales explícitas por la incertidumbre real de esos archivos (grandes/pendientes), con instrucción concreta en cada rama.
