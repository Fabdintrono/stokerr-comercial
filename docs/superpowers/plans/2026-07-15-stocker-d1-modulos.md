# Stocker D1 — Módulos por cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-tenant optional modules (FINANCE/BI/CRM) as plans + paid add-ons, managed from the super-admin panel, with a code registry, a DB catalog, per-client activation/override, a pure effective-modules resolver, and double-layer enforcement (server 403 guard + UI gating).

**Architecture:** Module keys live in a code registry (source of truth for what code exists). A DB `Module` catalog (admin-editable price/plan-inclusion/active) plus `TenantModule` rows (per-client add-on/override, with `priceAtActivation` frozen for later USDT billing). A pure `effectiveModules(plan, catalog, overrides)` resolves the active set. Server guard `requireModule` returns 403; a client `ModulesProvider` + `ModuleGate` + sidebar filtering handle UX.

**Tech Stack:** Next.js 16 App Router, Prisma + PostgreSQL (live commercial Supabase already connected), Vitest, decimal.js, React 19, Radix UI.

**Spec:** `docs/superpowers/specs/2026-07-15-stocker-d1-modulos-design.md`

**Branch:** Continue on `feature/multimoneda` (D1 depends on Block A's `Currency` enum, which is on this branch and not yet merged). Do NOT touch the 13 pre-existing pending files; use explicit `git add` only.

---

## File Structure

**New files:**
- `src/lib/modules/registry.ts` — `ModuleKey`, `MODULE_REGISTRY`, `MODULE_KEYS`
- `src/lib/modules/registry.test.ts`
- `src/lib/modules/effectiveModules.ts` — pure resolver
- `src/lib/modules/effectiveModules.test.ts`
- `src/lib/modules/guard.ts` — `getEnabledModules`, `requireModule`, `ModuleForbiddenError`
- `src/lib/modules/guard.test.ts`
- `src/app/api/me/modules/route.ts` — GET effective modules for current tenant
- `src/app/api/admin/modules/route.ts` — GET/PUT catalog (super-admin)
- `src/app/api/admin/clients/[id]/modules/route.ts` — GET/PUT per-client modules (super-admin)
- `src/components/modules/ModulesProvider.tsx` — context + `useModules()`
- `src/components/modules/ModuleGate.tsx` — wrapper for gated pages
- `src/app/super-admin/modules/page.tsx` — catalog admin UI
- `src/app/finance/page.tsx`, `src/app/crm/page.tsx`, `src/app/analytics-pro/page.tsx` — "coming soon" gated placeholders

**Modified files:**
- `prisma/schema.prisma` — `Module`, `TenantModule`, `ModuleSource`, Business relation
- `prisma/seed.ts` — seed Module rows from registry
- `src/components/layout/WarehouseSidebar.tsx` — add optional `module?` gating (pattern for other sidebars)
- `src/app/super-admin/licenses/page.tsx` — add per-client modules section

---

## Task 1: Module registry (code)

**Files:**
- Create: `src/lib/modules/registry.ts`
- Test: `src/lib/modules/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { MODULE_REGISTRY, MODULE_KEYS } from './registry'

describe('module registry', () => {
  it('defines FINANCE, BI, CRM', () => {
    expect(MODULE_KEYS.sort()).toEqual(['BI', 'CRM', 'FINANCE'])
  })
  it('each module has a label and at least one route', () => {
    for (const k of MODULE_KEYS) {
      expect(MODULE_REGISTRY[k].label.length).toBeGreaterThan(0)
      expect(MODULE_REGISTRY[k].routes.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- modules/registry`
Expected: FAIL — cannot find module `./registry`.

- [ ] **Step 3: Write minimal implementation**

```ts
export type ModuleKey = 'FINANCE' | 'BI' | 'CRM'

export interface ModuleDef {
  key: ModuleKey
  label: string
  description: string
  routes: string[]
}

export const MODULE_REGISTRY: Record<ModuleKey, ModuleDef> = {
  FINANCE: { key: 'FINANCE', label: 'Finanzas', description: 'Contabilidad, gastos, flujo de caja', routes: ['/finance'] },
  BI:      { key: 'BI',      label: 'BI / Analytics', description: 'Dashboards y reportes avanzados', routes: ['/analytics-pro'] },
  CRM:     { key: 'CRM',     label: 'CRM', description: 'Clientes, seguimiento, campañas', routes: ['/crm'] },
}

export const MODULE_KEYS = Object.keys(MODULE_REGISTRY) as ModuleKey[]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- modules/registry`
Expected: PASS (2).

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/registry.ts src/lib/modules/registry.test.ts
git commit -m "feat: module registry (FINANCE/BI/CRM)"
```

---

## Task 2: effectiveModules resolver

**Files:**
- Create: `src/lib/modules/effectiveModules.ts`
- Test: `src/lib/modules/effectiveModules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { effectiveModules } from './effectiveModules'

const catalog = [
  { key: 'FINANCE' as const, active: true, includedInPlans: ['ENTERPRISE' as const] },
  { key: 'BI' as const, active: true, includedInPlans: [] },
  { key: 'CRM' as const, active: false, includedInPlans: ['ENTERPRISE' as const] },
]

describe('effectiveModules', () => {
  it('includes a module bundled by the plan', () => {
    const r = effectiveModules('ENTERPRISE', catalog, [])
    expect(r.has('FINANCE')).toBe(true)
  })
  it('excludes a plan-bundled module when globally inactive', () => {
    const r = effectiveModules('ENTERPRISE', catalog, [])
    expect(r.has('CRM')).toBe(false) // active:false
  })
  it('enables an add-on via override even if plan does not include it', () => {
    const r = effectiveModules('STARTER', catalog, [{ moduleKey: 'BI', enabled: true }])
    expect(r.has('BI')).toBe(true)
  })
  it('disables a plan-included module via override off', () => {
    const r = effectiveModules('ENTERPRISE', catalog, [{ moduleKey: 'FINANCE', enabled: false }])
    expect(r.has('FINANCE')).toBe(false)
  })
  it('a basic plan with no overrides has no premium modules', () => {
    const r = effectiveModules('STARTER', catalog, [])
    expect(r.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- effectiveModules`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { Plan } from '@prisma/client'
import { ModuleKey } from './registry'

export interface CatalogEntry { key: ModuleKey; active: boolean; includedInPlans: Plan[] }
export interface TenantOverride { moduleKey: ModuleKey; enabled: boolean }

export function effectiveModules(
  plan: Plan,
  catalog: CatalogEntry[],
  overrides: TenantOverride[],
): Set<ModuleKey> {
  const result = new Set<ModuleKey>()
  const overrideMap = new Map(overrides.map(o => [o.moduleKey, o.enabled]))
  for (const m of catalog) {
    if (!m.active) continue
    const includedByPlan = m.includedInPlans.includes(plan)
    const override = overrideMap.get(m.key)
    const on = override !== undefined ? override : includedByPlan
    if (on) result.add(m.key)
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- effectiveModules`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/effectiveModules.ts src/lib/modules/effectiveModules.test.ts
git commit -m "feat: effectiveModules resolver (plan + add-ons - overrides)"
```

---

## Task 3: Schema — Module, TenantModule, ModuleSource

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `ModuleSource` enum** (near other enums)

```prisma
enum ModuleSource {
  PLAN
  ADDON
}
```

- [ ] **Step 2: Add `Module` and `TenantModule` models** (after the `ExchangeRate` model)

```prisma
model Module {
  id              String   @id @default(cuid())
  key             String   @unique
  name            String
  description     String?
  addOnPrice      Decimal  @default(0) @db.Decimal(18, 2)
  priceCurrency   Currency @default(USD)
  includedInPlans Plan[]   @default([])
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenantModules TenantModule[]
  @@map("modules")
}

model TenantModule {
  id                String       @id @default(cuid())
  businessId        String
  business          Business     @relation(fields: [businessId], references: [id], onDelete: Cascade)
  moduleKey         String
  enabled           Boolean      @default(true)
  source            ModuleSource @default(ADDON)
  priceAtActivation Decimal?     @db.Decimal(18, 2)
  activatedAt       DateTime     @default(now())

  module Module @relation(fields: [moduleKey], references: [key], onDelete: Cascade)

  @@unique([businessId, moduleKey])
  @@index([businessId])
  @@map("tenant_modules")
}
```

- [ ] **Step 3: Add relations to `Business`** (with the other relations)

```prisma
  tenantModules TenantModule[]
```

- [ ] **Step 4: Push schema to the live commercial DB**

Run: `npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema" + client generated. (DATABASE_URL already points to the commercial Supabase.)

- [ ] **Step 5: Verify tables + typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from new Prisma types.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: Module + TenantModule schema (per-tenant modules)"
```

---

## Task 4: Seed modules from registry

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add module seeding near the end of the seed's main function**

Find the section that logs "Creando configuración" in `prisma/seed.ts` and add, before the final success log:
```ts
  // Módulos (catálogo) — sembrados desde el registro de código
  console.log('🧩 Creando catálogo de módulos...')
  const moduleSeed = [
    { key: 'FINANCE', name: 'Finanzas', description: 'Contabilidad, gastos, flujo de caja' },
    { key: 'BI', name: 'BI / Analytics', description: 'Dashboards y reportes avanzados' },
    { key: 'CRM', name: 'CRM', description: 'Clientes, seguimiento, campañas' },
  ]
  for (const m of moduleSeed) {
    await prisma.module.upsert({
      where: { key: m.key },
      update: {},
      create: { key: m.key, name: m.name, description: m.description, addOnPrice: 0, includedInPlans: [], active: true },
    })
  }
  console.log('✅ Catálogo de módulos creado')
```

- [ ] **Step 2: Run the seed against the live DB**

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts`
Expected: logs include "✅ Catálogo de módulos creado" with no errors.
(Note: the `db:seed` npm script mangles the JSON arg in this shell — use the explicit `npx ts-node` command above.)

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed module catalog from registry"
```

---

## Task 5: Server guard

**Files:**
- Create: `src/lib/modules/guard.ts`
- Test: `src/lib/modules/guard.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { getEnabledModules, ModuleForbiddenError, requireModule } from './guard'

function fakePrisma(plan: string, catalog: any[], overrides: any[]) {
  return {
    business: { findUnique: vi.fn().mockResolvedValue({ plan }) },
    module: { findMany: vi.fn().mockResolvedValue(catalog) },
    tenantModule: { findMany: vi.fn().mockResolvedValue(overrides) },
  } as any
}

describe('getEnabledModules', () => {
  it('resolves plan + overrides into a set', async () => {
    const prisma = fakePrisma('STARTER',
      [{ key: 'CRM', active: true, includedInPlans: [] }],
      [{ moduleKey: 'CRM', enabled: true }])
    const set = await getEnabledModules(prisma, 'biz_1')
    expect(set.has('CRM')).toBe(true)
  })
})

describe('requireModule', () => {
  it('throws ModuleForbiddenError when module not enabled', async () => {
    const prisma = fakePrisma('STARTER', [{ key: 'CRM', active: true, includedInPlans: [] }], [])
    await expect(requireModule(prisma, 'biz_1', 'CRM')).rejects.toBeInstanceOf(ModuleForbiddenError)
  })
  it('resolves when module enabled', async () => {
    const prisma = fakePrisma('STARTER',
      [{ key: 'CRM', active: true, includedInPlans: [] }],
      [{ moduleKey: 'CRM', enabled: true }])
    await expect(requireModule(prisma, 'biz_1', 'CRM')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- modules/guard`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { PrismaClient } from '@prisma/client'
import { ModuleKey } from './registry'
import { effectiveModules, CatalogEntry, TenantOverride } from './effectiveModules'

export class ModuleForbiddenError extends Error {
  constructor(public moduleKey: string) {
    super(`module ${moduleKey} not enabled for tenant`)
    this.name = 'ModuleForbiddenError'
  }
}

export async function getEnabledModules(prisma: PrismaClient, businessId: string): Promise<Set<ModuleKey>> {
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { plan: true } })
  if (!business) return new Set()
  const catalog = await prisma.module.findMany({ select: { key: true, active: true, includedInPlans: true } })
  const overrides = await prisma.tenantModule.findMany({ where: { businessId }, select: { moduleKey: true, enabled: true } })
  return effectiveModules(
    business.plan,
    catalog as unknown as CatalogEntry[],
    overrides as unknown as TenantOverride[],
  )
}

export async function requireModule(prisma: PrismaClient, businessId: string, key: ModuleKey): Promise<void> {
  const set = await getEnabledModules(prisma, businessId)
  if (!set.has(key)) throw new ModuleForbiddenError(key)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- modules/guard`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/guard.ts src/lib/modules/guard.test.ts
git commit -m "feat: server module guard (getEnabledModules, requireModule)"
```

---

## Task 6: GET /api/me/modules

**Files:**
- Create: `src/app/api/me/modules/route.ts`

- [ ] **Step 1: Implement the route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEnabledModules } from '@/lib/modules/guard'

function resolveBusinessId(req: NextRequest): string | undefined {
  return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value || undefined
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const businessId = resolveBusinessId(req)
  if (!businessId) return NextResponse.json({ modules: [] })
  const set = await getEnabledModules(prisma, businessId)
  return NextResponse.json({ modules: Array.from(set) })
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/me/modules/route.ts
git commit -m "feat: GET /api/me/modules (effective modules for current tenant)"
```

---

## Task 7: Admin catalog API

**Files:**
- Create: `src/app/api/admin/modules/route.ts`

- [ ] **Step 1: Implement GET (list catalog) + PUT (update one module)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') return null
  return session
}

const putSchema = z.object({
  key: z.string(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  addOnPrice: z.number().nonnegative(),
  priceCurrency: z.enum(['USD', 'VES', 'BRL']),
  includedInPlans: z.array(z.enum(['STARTER', 'GROWTH', 'ENTERPRISE'])),
  active: z.boolean(),
})

export async function GET() {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const modules = await prisma.module.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(modules)
}

export async function PUT(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const parsed = putSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const { key, ...data } = parsed.data
  const updated = await prisma.module.update({ where: { key }, data })
  return NextResponse.json(updated)
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors. (If `session.user.role` is typed via `next-auth.d.ts`, drop the `as any`.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/modules/route.ts
git commit -m "feat: admin module catalog API (GET/PUT)"
```

---

## Task 8: Admin per-client modules API

**Files:**
- Create: `src/app/api/admin/clients/[id]/modules/route.ts`

- [ ] **Step 1: Implement GET (effective + overrides) + PUT (set an override / add-on)**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEnabledModules } from '@/lib/modules/guard'
import { z } from 'zod'

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') return null
  return session
}

const putSchema = z.object({
  moduleKey: z.string(),
  enabled: z.boolean(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const overrides = await prisma.tenantModule.findMany({ where: { businessId: id } })
  const effective = Array.from(await getEnabledModules(prisma, id))
  return NextResponse.json({ overrides, effective })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const parsed = putSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const { moduleKey, enabled } = parsed.data
  const mod = await prisma.module.findUnique({ where: { key: moduleKey } })
  if (!mod) return NextResponse.json({ error: 'unknown module' }, { status: 404 })
  const row = await prisma.tenantModule.upsert({
    where: { businessId_moduleKey: { businessId: id, moduleKey } },
    update: { enabled },
    create: { businessId: id, moduleKey, enabled, source: 'ADDON', priceAtActivation: mod.addOnPrice },
  })
  return NextResponse.json(row)
}
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors. Confirm the compound unique accessor name `businessId_moduleKey` matches the generated client (from `@@unique([businessId, moduleKey])`).

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/clients/[id]/modules/route.ts"
git commit -m "feat: admin per-client modules API (GET/PUT override)"
```

---

## Task 9: ModulesProvider + useModules + ModuleGate

**Files:**
- Create: `src/components/modules/ModulesProvider.tsx`
- Create: `src/components/modules/ModuleGate.tsx`

- [ ] **Step 1: Implement provider + hook**

`src/components/modules/ModulesProvider.tsx`:
```tsx
'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { ModuleKey } from '@/lib/modules/registry'

interface Ctx { modules: Set<ModuleKey>; loading: boolean; has: (k: ModuleKey) => boolean }
const ModulesContext = createContext<Ctx>({ modules: new Set(), loading: true, has: () => false })

export function ModulesProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<Set<ModuleKey>>(new Set())
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/me/modules')
      .then(r => r.json())
      .then(d => setModules(new Set(d.modules ?? [])))
      .catch(() => setModules(new Set()))
      .finally(() => setLoading(false))
  }, [])
  return (
    <ModulesContext.Provider value={{ modules, loading, has: k => modules.has(k) }}>
      {children}
    </ModulesContext.Provider>
  )
}

export const useModules = () => useContext(ModulesContext)
```

`src/components/modules/ModuleGate.tsx`:
```tsx
'use client'
import type { ModuleKey } from '@/lib/modules/registry'
import { useModules } from './ModulesProvider'

export function ModuleGate({ module, children }: { module: ModuleKey; children: React.ReactNode }) {
  const { has, loading } = useModules()
  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>
  if (!has(module)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Módulo no activo</h2>
        <p className="text-muted-foreground">Este módulo no está incluido en tu plan. Contáctanos para activarlo.</p>
      </div>
    )
  }
  return <>{children}</>
}
```

- [ ] **Step 2: Mount the provider** in the authenticated layout. Find the root providers file (look in `src/components/providers/` and the layout that wraps warehouse/restaurant apps) and wrap children with `<ModulesProvider>` alongside the existing providers. Verify with `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add src/components/modules/ModulesProvider.tsx src/components/modules/ModuleGate.tsx
git commit -m "feat: ModulesProvider, useModules, ModuleGate"
```

(If Step 2 modified a providers/layout file, add it to this commit with explicit path.)

---

## Task 10: Sidebar gating (WarehouseSidebar pattern)

**Files:**
- Modify: `src/components/layout/WarehouseSidebar.tsx`

- [ ] **Step 1: Add an optional `module` field to the nav item types**

In the `NavItem` and `SubItem` interfaces add:
```ts
  module?: import('@/lib/modules/registry').ModuleKey
```

- [ ] **Step 2: Filter nav items by enabled modules**

Inside the component, use the hook and filter items whose `module` is set but not enabled:
```tsx
import { useModules } from '@/components/modules/ModulesProvider'
// ...inside component:
const { has, loading } = useModules()
const visibleItems = navItems.filter(i => !i.module || loading || has(i.module))
```
Render `visibleItems` instead of `navItems`. (Items without a `module` always show. During `loading`, show them to avoid flicker; the server guard is still the real gate.)

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/WarehouseSidebar.tsx
git commit -m "feat: module-gated nav items in WarehouseSidebar"
```

> NOTE: Other sidebars (`RestaurantSidebar`, `SuperAdminSidebar`, etc.) follow the same pattern when
> their module-gated sections exist. Not needed until those modules add nav entries.

---

## Task 11: Admin catalog page

**Files:**
- Create: `src/app/super-admin/modules/page.tsx`

- [ ] **Step 1: Build the catalog admin page**

`src/app/super-admin/modules/page.tsx` (client component; model layout after `src/app/super-admin/licenses/page.tsx`, reuse `ui/*` Card/Button/Input/Switch, dark theme, `react-hot-toast`):
```tsx
'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

type Plan = 'STARTER' | 'GROWTH' | 'ENTERPRISE'
type Cur = 'USD' | 'VES' | 'BRL'
interface Module {
  key: string; name: string; description: string | null
  addOnPrice: string | number; priceCurrency: Cur; includedInPlans: Plan[]; active: boolean
}
const PLANS: Plan[] = ['STARTER', 'GROWTH', 'ENTERPRISE']

export default function ModulesAdminPage() {
  const [mods, setMods] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const d = await fetch('/api/admin/modules').then(r => r.json())
    setMods(Array.isArray(d) ? d : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save(m: Module) {
    const res = await fetch('/api/admin/modules', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...m, addOnPrice: Number(m.addOnPrice) }),
    })
    if (res.ok) toast.success(`${m.name} guardado`)
    else toast.error('Error al guardar')
  }

  function patch(key: string, p: Partial<Module>) {
    setMods(ms => ms.map(m => (m.key === key ? { ...m, ...p } : m)))
  }

  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">Módulos</h1>
      {mods.map(m => (
        <div key={m.key} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">{m.name} <span className="text-xs text-muted-foreground">({m.key})</span></div>
              <div className="text-sm text-muted-foreground">{m.description}</div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={m.active} onChange={e => patch(m.key, { active: e.target.checked })} />
              Activo
            </label>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <label className="text-sm">
              <span className="block text-muted-foreground">Precio add-on</span>
              <input className="mt-1 w-32 rounded-md bg-background border border-border p-2"
                value={m.addOnPrice} onChange={e => patch(m.key, { addOnPrice: e.target.value })} />
            </label>
            <label className="text-sm">
              <span className="block text-muted-foreground">Moneda</span>
              <select className="mt-1 rounded-md bg-background border border-border p-2"
                value={m.priceCurrency} onChange={e => patch(m.key, { priceCurrency: e.target.value as Cur })}>
                {(['USD', 'VES', 'BRL'] as Cur[]).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <div className="text-sm">
              <span className="block text-muted-foreground">Incluido en planes</span>
              <div className="mt-1 flex gap-3">
                {PLANS.map(p => (
                  <label key={p} className="flex items-center gap-1">
                    <input type="checkbox" checked={m.includedInPlans.includes(p)}
                      onChange={e => patch(m.key, {
                        includedInPlans: e.target.checked
                          ? [...m.includedInPlans, p]
                          : m.includedInPlans.filter(x => x !== p),
                      })} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={() => save(m)}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium">Guardar</button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add a nav entry** for `/super-admin/modules` in `src/components/layout/SuperAdminSidebar.tsx` (match the existing item shape). Verify with `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add src/app/super-admin/modules/page.tsx src/components/layout/SuperAdminSidebar.tsx
git commit -m "feat: super-admin module catalog page"
```

---

## Task 12: Per-client modules UI in licenses page

**Files:**
- Modify: `src/app/super-admin/licenses/page.tsx`

- [ ] **Step 1: Add a modules panel to the per-client editor**

When a client row is expanded/edited (the page already has `editingId`), fetch `GET /api/admin/clients/${id}/modules` and render a toggle per module in `MODULE_KEYS`, showing whether it's effective and letting the admin flip the override via `PUT`. Add this block inside the editing UI:
```tsx
// near other imports
import { MODULE_KEYS, MODULE_REGISTRY } from '@/lib/modules/registry'
// component state
const [clientMods, setClientMods] = useState<{ effective: string[]; overrides: any[] }>({ effective: [], overrides: [] })

async function loadClientMods(id: string) {
  const d = await fetch(`/api/admin/clients/${id}/modules`).then(r => r.json())
  setClientMods(d)
}

async function toggleClientMod(id: string, moduleKey: string, enabled: boolean) {
  const res = await fetch(`/api/admin/clients/${id}/modules`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moduleKey, enabled }),
  })
  if (res.ok) { toast.success('Módulo actualizado'); loadClientMods(id) }
  else toast.error('Error')
}
```
Call `loadClientMods(client.id)` when entering edit mode for a client, and render:
```tsx
<div className="mt-4 border-t border-border pt-3">
  <div className="text-sm text-muted-foreground mb-2">Módulos</div>
  {MODULE_KEYS.map(k => (
    <label key={k} className="flex items-center justify-between py-1">
      <span className="text-foreground">{MODULE_REGISTRY[k].label}</span>
      <input type="checkbox"
        checked={clientMods.effective.includes(k)}
        onChange={e => toggleClientMod(editingId!, k, e.target.checked)} />
    </label>
  ))}
</div>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/app/super-admin/licenses/page.tsx
git commit -m "feat: per-client module toggles in licenses page"
```

---

## Task 13: Gated placeholder pages

**Files:**
- Create: `src/app/finance/page.tsx`
- Create: `src/app/crm/page.tsx`
- Create: `src/app/analytics-pro/page.tsx`

- [ ] **Step 1: Create the three "coming soon" gated pages**

`src/app/finance/page.tsx`:
```tsx
'use client'
import { ModuleGate } from '@/components/modules/ModuleGate'

export default function FinancePage() {
  return (
    <ModuleGate module="FINANCE">
      <div className="p-8 text-center space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Finanzas</h1>
        <p className="text-muted-foreground">Módulo activo. Funcionalidad próximamente.</p>
      </div>
    </ModuleGate>
  )
}
```

`src/app/crm/page.tsx`:
```tsx
'use client'
import { ModuleGate } from '@/components/modules/ModuleGate'

export default function CrmPage() {
  return (
    <ModuleGate module="CRM">
      <div className="p-8 text-center space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">CRM</h1>
        <p className="text-muted-foreground">Módulo activo. Funcionalidad próximamente.</p>
      </div>
    </ModuleGate>
  )
}
```

`src/app/analytics-pro/page.tsx`:
```tsx
'use client'
import { ModuleGate } from '@/components/modules/ModuleGate'

export default function AnalyticsProPage() {
  return (
    <ModuleGate module="BI">
      <div className="p-8 text-center space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">BI / Analytics</h1>
        <p className="text-muted-foreground">Módulo activo. Funcionalidad próximamente.</p>
      </div>
    </ModuleGate>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: three new routes compile.

- [ ] **Step 3: Commit**

```bash
git add src/app/finance/page.tsx src/app/crm/page.tsx src/app/analytics-pro/page.tsx
git commit -m "feat: gated placeholder pages for FINANCE/CRM/BI"
```

---

## Task 14: Full verification

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all suites pass (currency, rates, modules registry/effectiveModules/guard, dualPrice).

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors, build succeeds.

- [ ] **Step 3: Confirm pending files untouched**

Run: `git status --short | grep -c '^ M'`
Expected: 13 (the pre-existing pending fixes remain untouched).

- [ ] **Step 4: Final commit (if any fixups)**

```bash
git add -- src/lib/modules src/app/api/me src/app/api/admin/modules src/app/super-admin/modules
git commit -m "chore: D1 modules block complete" || echo "nothing to commit"
```

---

## Self-Review checklist (done while writing)

- **Spec coverage:** registry (Task 1); effectiveModules resolver (Task 2); Module+TenantModule schema (Task 3); seed (Task 4); server guard 403 (Task 5); `/api/me/modules` (Task 6); admin catalog API+page (Tasks 7, 11); per-client API+UI (Tasks 8, 12); ModulesProvider/ModuleGate + sidebar gating (Tasks 9, 10); placeholder pages (Task 13); testing (Tasks 1,2,5 + Task 14). Plan-inclusion defaults empty (Task 4 seed) per business policy; ENTERPRISE handled via manual per-client toggles (Task 12).
- **Placeholder scan:** every code step has real code. "Coming soon" pages are intentional product placeholders, not plan placeholders.
- **Type consistency:** `ModuleKey` used throughout; `effectiveModules(plan, catalog, overrides)` signature identical in Tasks 2, 5; `CatalogEntry`/`TenantOverride` reused; compound keys `businessId_moduleKey` flagged to verify against generated client; guard returns `Set<ModuleKey>` consumed by `/api/me/modules` and provider.
- **Deferred (documented):** building the real FINANCE/BI/CRM features; USDT billing of add-ons (Block C); other sidebars' gating until they add module nav entries; D2 per-client code customization (separate spec).
