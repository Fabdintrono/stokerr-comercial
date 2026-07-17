# Framework de Verticales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir Stocker en plataforma multi-vertical: `Business.vertical` (6 verticales) que pre-activa un preset de módulos, con las features de restaurante gateadas detrás de un módulo `RESTAURANT`, reusando el sistema de módulos D1.

**Architecture:** Se extiende el registry de módulos (`src/lib/modules/`) con 4 módulos nuevos + campo `status`. Un mapa puro `VERTICAL_PRESETS` decide qué módulos activar por vertical; `applyVerticalPreset` los materializa como `TenantModule` en la creación del negocio (super-admin `/api/admin/clients`). Las rutas/sidebar/APIs de restaurante se gatean con el `ModuleGate`/`requireModule` existentes. No se toca `Product`/`Inventory`/`Order`.

**Tech Stack:** Next.js 16 App Router, Prisma (`prisma db push`, sin migraciones versionadas), Vitest (node env, `bun run test`), i18n key-based del bloque E.

**Nota de realidad del código (desviación del spec §6.1):** El `/register` self-serve **solo crea un `User`** (rol USER), NO crea `Business`. La creación del negocio ocurre en el POST de `/api/admin/clients` (super-admin). Por eso el vertical se fija ahí, no en `/register`. Cuando exista un flujo self-serve de creación de negocio, reusará el mismo `applyVerticalPreset`.

**Regla git de este repo:** hay ~13 archivos sin commitear que NO se deben commitear. SIEMPRE `git add <archivos específicos>`, NUNCA `git add -A`/`git add .`.

---

## File Structure

- `src/lib/modules/registry.ts` — MODIFY: ampliar `ModuleKey`, agregar 4 módulos + campo `status` en `ModuleDef`.
- `src/lib/modules/verticals.ts` — CREATE: `BusinessVertical`, `VERTICAL_PRESETS`, `presetModules()`.
- `src/lib/modules/verticals.test.ts` — CREATE.
- `src/lib/modules/applyVerticalPreset.ts` — CREATE: materializa el preset como `TenantModule` (recibe un tx).
- `src/lib/modules/applyVerticalPreset.test.ts` — CREATE.
- `src/lib/modules/decideVertical.ts` — CREATE: función pura para la migración (locations → vertical).
- `src/lib/modules/decideVertical.test.ts` — CREATE.
- `prisma/schema.prisma` — MODIFY: enum `BusinessVertical` + `Business.vertical`; enum `ModuleStatus` + `Module.status`.
- `prisma/seed.ts` — MODIFY: agregar 4 módulos al `moduleSeed` + `status`.
- `src/app/api/admin/clients/route.ts` — MODIFY: `vertical` en el schema + `business.create` + `applyVerticalPreset`.
- `src/components/layout/RestaurantSidebar.tsx` — MODIFY: marcar items con `module: 'RESTAURANT'`.
- `src/components/layout/WarehouseSidebar.tsx` — MODIFY: marcar el item de reposiciones con `module: 'RESTAURANT'`.
- `src/app/restaurant/layout.tsx` — MODIFY: envolver `children` con `<ModuleGate module="RESTAURANT">`.
- `src/app/(waiter)/layout.tsx` — MODIFY: idem.
- `src/app/api/recipes/route.ts`, `src/app/api/tables/route.ts`, `src/app/api/replenishment/route.ts` — MODIFY: `requireModule('RESTAURANT')`.
- `src/app/api/auth/business/route.ts` — MODIFY: incluir `vertical` en la respuesta.
- `locales/es.json`, `locales/pt.json`, `locales/en.json` — MODIFY: claves `vertical.shellTitle.*`.
- `src/components/layout/WarehouseHeader.tsx` — MODIFY: título del shell por vertical.
- `src/app/super-admin/modules/page.tsx` — MODIFY: badge de estado LIVE/COMING_SOON.
- `scripts/migrate-verticals.ts` — CREATE: migración one-off.

---

## Task 1: Registry — módulos nuevos + campo `status`

**Files:**
- Modify: `src/lib/modules/registry.ts`
- Test: `src/lib/modules/registry.test.ts` (ya existe; se le agrega un caso)

- [ ] **Step 1: Write the failing test** (agregar al final del `describe` existente en `src/lib/modules/registry.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { MODULE_REGISTRY, MODULE_KEYS } from './registry'

describe('registry verticals extension', () => {
  it('includes the 4 new module keys', () => {
    for (const k of ['RESTAURANT', 'WHOLESALE', 'VARIANTS', 'BATCHES'] as const) {
      expect(MODULE_KEYS).toContain(k)
    }
  })
  it('every module has a valid status', () => {
    for (const k of MODULE_KEYS) {
      expect(['LIVE', 'COMING_SOON']).toContain(MODULE_REGISTRY[k].status)
    }
  })
  it('RESTAURANT is LIVE; WHOLESALE/VARIANTS/BATCHES are COMING_SOON', () => {
    expect(MODULE_REGISTRY.RESTAURANT.status).toBe('LIVE')
    expect(MODULE_REGISTRY.WHOLESALE.status).toBe('COMING_SOON')
    expect(MODULE_REGISTRY.VARIANTS.status).toBe('COMING_SOON')
    expect(MODULE_REGISTRY.BATCHES.status).toBe('COMING_SOON')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/lib/modules/registry.test.ts`
Expected: FAIL (keys/status no existen).

- [ ] **Step 3: Replace `src/lib/modules/registry.ts` with:**

```ts
export type ModuleKey = 'FINANCE' | 'BI' | 'CRM' | 'RESTAURANT' | 'WHOLESALE' | 'VARIANTS' | 'BATCHES'

export type ModuleStatus = 'LIVE' | 'COMING_SOON'

export interface ModuleDef {
  key: ModuleKey
  label: string
  description: string
  routes: string[]
  status: ModuleStatus
}

export const MODULE_REGISTRY: Record<ModuleKey, ModuleDef> = {
  FINANCE:    { key: 'FINANCE',    label: 'Finanzas',       description: 'Contabilidad, gastos, flujo de caja', routes: ['/finance'],       status: 'LIVE' },
  BI:         { key: 'BI',         label: 'BI / Analytics', description: 'Dashboards y reportes avanzados',      routes: ['/analytics-pro'], status: 'LIVE' },
  CRM:        { key: 'CRM',        label: 'CRM',            description: 'Clientes, seguimiento, campañas',      routes: ['/crm'],           status: 'LIVE' },
  RESTAURANT: { key: 'RESTAURANT', label: 'Restaurante',    description: 'Mesas, recetas, cocina, reposición local↔almacén', routes: ['/restaurant', '/cocina', '/mesa', '/waiter'], status: 'LIVE' },
  WHOLESALE:  { key: 'WHOLESALE',  label: 'Mayorista',      description: 'Listas de precios, crédito, cuentas por cobrar', routes: [], status: 'COMING_SOON' },
  VARIANTS:   { key: 'VARIANTS',   label: 'Variantes',      description: 'Talla/color/modelo/SKU por producto',  routes: [], status: 'COMING_SOON' },
  BATCHES:    { key: 'BATCHES',    label: 'Lotes y vencimiento', description: 'Lotes, fechas de vencimiento, presentaciones', routes: [], status: 'COMING_SOON' },
}

export const MODULE_KEYS = Object.keys(MODULE_REGISTRY) as ModuleKey[]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/lib/modules/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/registry.ts src/lib/modules/registry.test.ts
git commit -m "feat(verticals): extend module registry with 4 vertical modules + status"
```

---

## Task 2: `verticals.ts` — presets por vertical (TDD)

**Files:**
- Create: `src/lib/modules/verticals.ts`
- Test: `src/lib/modules/verticals.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/modules/verticals.test.ts
import { describe, it, expect } from 'vitest'
import { VERTICAL_PRESETS, presetModules, VERTICALS } from './verticals'
import { MODULE_KEYS } from './registry'

describe('presetModules', () => {
  it('returns the preset for each vertical', () => {
    expect(presetModules('RESTAURANT')).toEqual(['RESTAURANT'])
    expect(presetModules('FASTFOOD')).toEqual(['RESTAURANT', 'BATCHES'])
    expect(presetModules('WHOLESALE')).toEqual(['WHOLESALE'])
    expect(presetModules('HARDWARE')).toEqual(['VARIANTS'])
    expect(presetModules('PHARMACY')).toEqual(['BATCHES', 'VARIANTS'])
    expect(presetModules('RETAIL')).toEqual([])
  })
})

describe('preset integrity', () => {
  it('lists all 6 verticals', () => {
    expect(VERTICALS).toEqual(['RESTAURANT', 'FASTFOOD', 'WHOLESALE', 'HARDWARE', 'PHARMACY', 'RETAIL'])
  })
  it('every preset module key exists in the registry', () => {
    for (const v of VERTICALS) {
      for (const k of VERTICAL_PRESETS[v]) {
        expect(MODULE_KEYS).toContain(k)
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/lib/modules/verticals.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implement `src/lib/modules/verticals.ts`**

```ts
import type { ModuleKey } from './registry'

export type BusinessVertical = 'RESTAURANT' | 'FASTFOOD' | 'WHOLESALE' | 'HARDWARE' | 'PHARMACY' | 'RETAIL'

export const VERTICALS: BusinessVertical[] = ['RESTAURANT', 'FASTFOOD', 'WHOLESALE', 'HARDWARE', 'PHARMACY', 'RETAIL']

export const VERTICAL_PRESETS: Record<BusinessVertical, ModuleKey[]> = {
  RESTAURANT: ['RESTAURANT'],
  FASTFOOD:   ['RESTAURANT', 'BATCHES'],
  WHOLESALE:  ['WHOLESALE'],
  HARDWARE:   ['VARIANTS'],
  PHARMACY:   ['BATCHES', 'VARIANTS'],
  RETAIL:     [],
}

export function presetModules(vertical: BusinessVertical): ModuleKey[] {
  return VERTICAL_PRESETS[vertical]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/lib/modules/verticals.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/verticals.ts src/lib/modules/verticals.test.ts
git commit -m "feat(verticals): VERTICAL_PRESETS + presetModules (pure)"
```

---

## Task 3: Schema — `Business.vertical` + `Module.status` + seed

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add enums + fields to schema**

En `prisma/schema.prisma`, agregar los dos enums (al lado de los otros enums, p.ej. junto a `enum Plan`):

```prisma
enum BusinessVertical {
  RESTAURANT
  FASTFOOD
  WHOLESALE
  HARDWARE
  PHARMACY
  RETAIL
}

enum ModuleStatus {
  LIVE
  COMING_SOON
}
```

En el modelo `Business` (después de `plan Plan @default(STARTER)`), agregar:
```prisma
  vertical BusinessVertical @default(RETAIL)
```

En el modelo `Module` (después de `active Boolean @default(true)`), agregar:
```prisma
  status ModuleStatus @default(LIVE)
```

- [ ] **Step 2: Push schema to DB + regenerate client**

Run: `bun run db:push`
Expected: `Your database is now in sync with your Prisma schema.` (agrega columnas con default; no destructivo).

- [ ] **Step 3: Update `prisma/seed.ts` moduleSeed**

Localizar `const moduleSeed = [` (~línea 741). Reemplazar el array y el upsert por:

```ts
  const moduleSeed = [
    { key: 'FINANCE', name: 'Finanzas', description: 'Contabilidad, gastos, flujo de caja', status: 'LIVE' },
    { key: 'BI', name: 'BI / Analytics', description: 'Dashboards y reportes avanzados', status: 'LIVE' },
    { key: 'CRM', name: 'CRM', description: 'Clientes, seguimiento, campañas', status: 'LIVE' },
    { key: 'RESTAURANT', name: 'Restaurante', description: 'Mesas, recetas, cocina, reposición', status: 'LIVE' },
    { key: 'WHOLESALE', name: 'Mayorista', description: 'Listas de precios, crédito', status: 'COMING_SOON' },
    { key: 'VARIANTS', name: 'Variantes', description: 'Talla/color/modelo/SKU', status: 'COMING_SOON' },
    { key: 'BATCHES', name: 'Lotes y vencimiento', description: 'Lotes y vencimientos', status: 'COMING_SOON' },
  ]
  for (const m of moduleSeed) {
    await prisma.module.upsert({
      where: { key: m.key },
      update: { name: m.name, description: m.description, status: m.status as any },
      create: { key: m.key, name: m.name, description: m.description, addOnPrice: 0, includedInPlans: [], active: true, status: m.status as any },
    })
  }
```

(Ajustar el `update`/`create` para que coincidan con las líneas reales ~747-750; conservar cualquier otro campo que ya tuvieran.)

- [ ] **Step 4: Run seed to load the new modules**

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts`
Expected: corre sin error; los 4 módulos nuevos quedan en la tabla `modules`.

- [ ] **Step 5: Verify build typechecks**

Run: `bun run build`
Expected: build OK (el cliente Prisma regenerado reconoce `vertical` y `status`).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat(verticals): Business.vertical + Module.status schema + seed 4 modules"
```

---

## Task 4: `applyVerticalPreset` — materializa el preset como TenantModule

**Files:**
- Create: `src/lib/modules/applyVerticalPreset.ts`
- Test: `src/lib/modules/applyVerticalPreset.test.ts`

- [ ] **Step 1: Write the failing test** (usa un tx stub que captura los upserts, sin DB real)

```ts
// src/lib/modules/applyVerticalPreset.test.ts
import { describe, it, expect } from 'vitest'
import { applyVerticalPreset } from './applyVerticalPreset'

function makeTx() {
  const calls: any[] = []
  return {
    calls,
    tenantModule: { upsert: async (args: any) => { calls.push(args); return args } },
  }
}

describe('applyVerticalPreset', () => {
  it('upserts one TenantModule per preset module (HARDWARE → VARIANTS)', async () => {
    const tx = makeTx()
    const keys = await applyVerticalPreset(tx as any, 'biz1', 'HARDWARE')
    expect(keys).toEqual(['VARIANTS'])
    expect(tx.calls).toHaveLength(1)
    expect(tx.calls[0].where).toEqual({ businessId_moduleKey: { businessId: 'biz1', moduleKey: 'VARIANTS' } })
    expect(tx.calls[0].create).toMatchObject({ businessId: 'biz1', moduleKey: 'VARIANTS', enabled: true, source: 'PLAN' })
    expect(tx.calls[0].update).toEqual({ enabled: true })
  })
  it('RETAIL creates no TenantModule', async () => {
    const tx = makeTx()
    const keys = await applyVerticalPreset(tx as any, 'biz2', 'RETAIL')
    expect(keys).toEqual([])
    expect(tx.calls).toHaveLength(0)
  })
  it('FASTFOOD upserts RESTAURANT and BATCHES', async () => {
    const tx = makeTx()
    await applyVerticalPreset(tx as any, 'biz3', 'FASTFOOD')
    expect(tx.calls.map(c => c.create.moduleKey)).toEqual(['RESTAURANT', 'BATCHES'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/lib/modules/applyVerticalPreset.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implement `src/lib/modules/applyVerticalPreset.ts`**

```ts
import { presetModules, type BusinessVertical } from './verticals'

type TxLike = {
  tenantModule: {
    upsert: (args: {
      where: { businessId_moduleKey: { businessId: string; moduleKey: string } }
      update: { enabled: boolean }
      create: { businessId: string; moduleKey: string; enabled: boolean; source: 'PLAN'; priceAtActivation: number }
    }) => Promise<unknown>
  }
}

// Activa (crea o enciende) los TenantModule del preset del vertical. Aditivo e idempotente.
export async function applyVerticalPreset(tx: TxLike, businessId: string, vertical: BusinessVertical): Promise<string[]> {
  const keys = presetModules(vertical)
  for (const moduleKey of keys) {
    await tx.tenantModule.upsert({
      where: { businessId_moduleKey: { businessId, moduleKey } },
      update: { enabled: true },
      create: { businessId, moduleKey, enabled: true, source: 'PLAN', priceAtActivation: 0 },
    })
  }
  return keys
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/lib/modules/applyVerticalPreset.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/applyVerticalPreset.ts src/lib/modules/applyVerticalPreset.test.ts
git commit -m "feat(verticals): applyVerticalPreset materializes preset as TenantModule"
```

---

## Task 5: `decideVertical` — decisión pura para la migración (TDD)

**Files:**
- Create: `src/lib/modules/decideVertical.ts`
- Test: `src/lib/modules/decideVertical.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/modules/decideVertical.test.ts
import { describe, it, expect } from 'vitest'
import { decideVertical } from './decideVertical'

describe('decideVertical', () => {
  it('RESTAURANT when any location is a restaurant', () => {
    expect(decideVertical([{ type: 'WAREHOUSE' }, { type: 'RESTAURANT' }])).toBe('RESTAURANT')
  })
  it('RETAIL when no restaurant location', () => {
    expect(decideVertical([{ type: 'WAREHOUSE' }])).toBe('RETAIL')
    expect(decideVertical([])).toBe('RETAIL')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/lib/modules/decideVertical.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/modules/decideVertical.ts`**

```ts
import type { BusinessVertical } from './verticals'

export function decideVertical(locations: { type: string }[]): BusinessVertical {
  return locations.some(l => l.type === 'RESTAURANT') ? 'RESTAURANT' : 'RETAIL'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/lib/modules/decideVertical.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/modules/decideVertical.ts src/lib/modules/decideVertical.test.ts
git commit -m "feat(verticals): decideVertical pure helper for migration"
```

---

## Task 6: Migración one-off de negocios existentes

**Files:**
- Create: `scripts/migrate-verticals.ts`

- [ ] **Step 1: Write the migration script**

```ts
// scripts/migrate-verticals.ts
import { PrismaClient } from '@prisma/client'
import { decideVertical } from '../src/lib/modules/decideVertical'
import { applyVerticalPreset } from '../src/lib/modules/applyVerticalPreset'

const prisma = new PrismaClient()

async function main() {
  const businesses = await prisma.business.findMany({ select: { id: true, name: true, locations: { select: { type: true } } } })
  for (const b of businesses) {
    const vertical = decideVertical(b.locations)
    await prisma.business.update({ where: { id: b.id }, data: { vertical } })
    await applyVerticalPreset(prisma as any, b.id, vertical)
    console.log(`[verticals] ${b.name} → ${vertical}`)
  }
  console.log(`[verticals] done: ${businesses.length} businesses`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Run the migration against the commercial DB**

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-verticals.ts`
Expected: imprime cada negocio con su vertical; el demo (con location RESTAURANT) → `RESTAURANT` y obtiene su `TenantModule` RESTAURANT.

- [ ] **Step 3: Verify the demo business**

Run: `npx ts-node --compiler-options '{"module":"CommonJS"}' -e "import('@prisma/client').then(async({PrismaClient})=>{const p=new PrismaClient();const b=await p.business.findFirst({select:{name:true,vertical:true,tenantModules:{select:{moduleKey:true}}}});console.log(b);await p.\$disconnect()})"`
Expected: el negocio demo con `vertical: 'RESTAURANT'` y `tenantModules` incluye `RESTAURANT`.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-verticals.ts
git commit -m "feat(verticals): one-off migration assigns vertical + restaurant module to existing businesses"
```

---

## Task 7: Fijar el vertical en la creación de cliente (super-admin)

**Files:**
- Modify: `src/app/api/admin/clients/route.ts`

- [ ] **Step 1: Read the file to place edits precisely**

Run: `sed -n '1,140p' src/app/api/admin/clients/route.ts`

- [ ] **Step 2: Add `vertical` to the create schema + import helper**

En `src/app/api/admin/clients/route.ts`, agregar el import (junto a los otros imports):
```ts
import { applyVerticalPreset } from '@/lib/modules/applyVerticalPreset';
import { VERTICALS } from '@/lib/modules/verticals';
```
En `createClientSchema`, agregar el campo (después de `plan`):
```ts
  vertical: z.enum(VERTICALS as [string, ...string[]]).default('RETAIL'),
```

- [ ] **Step 3: Set vertical on business.create + apply preset**

En el `tx.business.create({ data: { ... } })` (dentro del bloque `else` de negocio nuevo, ~línea 117), agregar `vertical` al `data`:
```ts
        business = await tx.business.create({
          data: {
            name: data.businessName!,
            slug: data.slug!,
            plan: data.plan ?? 'STARTER',
            vertical: (data.vertical ?? 'RETAIL') as any,
            maxRestaurants: data.maxRestaurants ?? 5,
            maxUsers: data.maxUsers ?? 10,
            active: true,
          },
        });
```
Justo después de crear la `location` (al final de la transacción, antes del `return` del `$transaction`), aplicar el preset:
```ts
      await applyVerticalPreset(tx as any, business.id, (data.vertical ?? 'RETAIL') as any);
```

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/clients/route.ts
git commit -m "feat(verticals): super-admin client creation sets vertical + applies preset"
```

---

## Task 8: Gatear sidebar de restaurante + item de reposiciones

**Files:**
- Modify: `src/components/layout/RestaurantSidebar.tsx`
- Modify: `src/components/layout/WarehouseSidebar.tsx`

- [ ] **Step 1: Read both sidebars**

Run: `cat src/components/layout/RestaurantSidebar.tsx; echo ---; sed -n '20,70p' src/components/layout/WarehouseSidebar.tsx`

- [ ] **Step 2: RestaurantSidebar — importar useModules y filtrar**

Si `RestaurantSidebar.tsx` aún no usa el patrón de módulos, replicar el de `WarehouseSidebar`:
```tsx
import { useModules } from "@/components/modules/ModulesProvider";
```
Dentro del componente:
```tsx
  const { has, loading: modLoading } = useModules();
```
Y al construir los items visibles, marcar TODO el sidebar como restaurante (envolver el render): dado que la ruta entera es de restaurante, agregar al inicio del render:
```tsx
  if (!modLoading && !has('RESTAURANT')) return null;
```
(el layout ya muestra el gate; el sidebar oculto evita parpadeo).

- [ ] **Step 3: WarehouseSidebar — gatear el item de reposiciones**

En el array `navItems` de `WarehouseSidebar.tsx`, localizar el item/subitem cuyo `href` sea la reposición de almacén (contiene `replenishment` o "Reposicion"/"Solicitudes") y agregarle `module: 'RESTAURANT'`. Ej.:
```tsx
  { key: 'replenishment', label: 'Reposiciones', href: '/warehouse/replenishment', icon: <Icono>, module: 'RESTAURANT' },
```
El filtro existente (`visibleItems = navItems.filter(i => !i.module || modLoading || has(i.module))`) lo ocultará para no-restaurantes. Aplicar también al subitem dentro de `children` si la reposición está anidada (los subitems tienen `module?` en la interfaz `SubItem`).

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/RestaurantSidebar.tsx src/components/layout/WarehouseSidebar.tsx
git commit -m "feat(verticals): gate restaurant sidebar + replenishment item behind RESTAURANT module"
```

---

## Task 9: Gatear layouts de restaurante y waiter con ModuleGate

**Files:**
- Modify: `src/app/restaurant/layout.tsx`
- Modify: `src/app/(waiter)/layout.tsx`

- [ ] **Step 1: restaurant/layout.tsx — envolver children con ModuleGate**

Agregar el import:
```tsx
import { ModuleGate } from "@/components/modules/ModuleGate";
```
En el `<main>`, envolver el contenido de children con el gate (dentro del branch `businessReady`):
```tsx
          <main className="flex-1 overflow-y-auto">
            {businessReady ? (
              <ModuleGate module="RESTAURANT">{children}</ModuleGate>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                  <p className="text-sm text-zinc-400">Cargando...</p>
                </div>
              </div>
            )}
          </main>
```

- [ ] **Step 2: (waiter)/layout.tsx — envolver children**

Run primero: `cat "src/app/(waiter)/layout.tsx"`. Agregar el import de `ModuleGate` y envolver el `{children}` que renderiza con `<ModuleGate module="RESTAURANT">{children}</ModuleGate>`. Si el layout es un server component sin `"use client"`, NO se puede usar `ModuleGate` (hook cliente): en ese caso, dejar el waiter sin gate de UI (la API ya se gatea en Task 10) y anotarlo como concern.

> Nota: las rutas públicas `(public)/cocina/[token]` y `(public)/mesa/[token]` NO se gatean con ModuleGate — no tienen sesión/tenant (se acceden por QR token). Su acceso ya está limitado por el token que solo un restaurante genera.

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/app/restaurant/layout.tsx "src/app/(waiter)/layout.tsx"
git commit -m "feat(verticals): gate restaurant + waiter layouts behind RESTAURANT module"
```

---

## Task 10: Gatear APIs de restaurante con requireModule

**Files:**
- Modify: `src/app/api/recipes/route.ts`
- Modify: `src/app/api/tables/route.ts`
- Modify: `src/app/api/replenishment/route.ts`

- [ ] **Step 1: Read the three routes to find the businessId resolution pattern**

Run: `sed -n '1,40p' src/app/api/recipes/route.ts; echo ---; sed -n '1,40p' src/app/api/tables/route.ts; echo ---; sed -n '1,40p' src/app/api/replenishment/route.ts`

- [ ] **Step 2: Add the guard to each route (GET y POST/PUT si existen)**

En cada archivo, agregar imports:
```ts
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard';
import { prisma } from '@/lib/prisma';
```
Y al inicio de cada handler exportado (después de resolver `businessId` como ya lo hace la ruta, típicamente `const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value`), agregar:
```ts
  if (businessId) {
    try {
      await requireModule(prisma, businessId, 'RESTAURANT');
    } catch (e) {
      if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 });
      throw e;
    }
  }
```
Aplicar el mismo bloque en cada handler (GET, POST, PUT, DELETE) de los 3 archivos y de sus subrutas `[id]/route.ts` si contienen lógica de negocio. Usar la variable `businessId` que ya exista en la ruta; si la ruta no la resuelve aún, resolverla con la línea de arriba.

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/recipes/route.ts src/app/api/tables/route.ts src/app/api/replenishment/route.ts
git commit -m "feat(verticals): guard recipes/tables/replenishment APIs with requireModule(RESTAURANT)"
```

---

## Task 11: Relabeleo del shell por vertical (i18n)

**Files:**
- Modify: `locales/es.json`, `locales/pt.json`, `locales/en.json`
- Modify: `src/app/api/auth/business/route.ts`
- Modify: `src/components/layout/WarehouseHeader.tsx`

- [ ] **Step 1: Add i18n keys to the three locales**

Agregar el namespace `vertical` a `locales/es.json`:
```json
  "vertical": {
    "shellTitle": {
      "RESTAURANT": "Restaurante",
      "FASTFOOD": "Local",
      "WHOLESALE": "Depósito",
      "HARDWARE": "Comercio",
      "PHARMACY": "Farmacia",
      "RETAIL": "Comercio"
    }
  }
```
`locales/pt.json` (mismos keys):
```json
  "vertical": {
    "shellTitle": {
      "RESTAURANT": "Restaurante",
      "FASTFOOD": "Local",
      "WHOLESALE": "Depósito",
      "HARDWARE": "Comércio",
      "PHARMACY": "Farmácia",
      "RETAIL": "Comércio"
    }
  }
```
`locales/en.json`:
```json
  "vertical": {
    "shellTitle": {
      "RESTAURANT": "Restaurant",
      "FASTFOOD": "Store",
      "WHOLESALE": "Warehouse",
      "HARDWARE": "Store",
      "PHARMACY": "Pharmacy",
      "RETAIL": "Store"
    }
  }
```

- [ ] **Step 2: Add `vertical` to /api/auth/business response**

En `src/app/api/auth/business/route.ts`, en el `select`/`include` del `business.findMany`/`findUnique` que arma la respuesta, agregar `vertical: true` al `select` de business, y asegurar que cada business del array devuelto incluya `vertical`. (Leer el archivo con `cat src/app/api/auth/business/route.ts` y añadir el campo al select existente.)

- [ ] **Step 3: Use the vertical title in WarehouseHeader**

En `src/components/layout/WarehouseHeader.tsx`, obtener el vertical del negocio (el header ya hace fetch a `/api/auth/business` para resolver el warehouseLocationId — reusar esa llamada para leer `businesses[0].vertical`), guardarlo en estado `vertical`, y renderizar el título del shell con:
```tsx
import { useI18n } from "@/lib/i18n";
// ...
const { t } = useI18n();
// donde se muestra el título/nombre del área:
<span>{t(`vertical.shellTitle.${vertical ?? 'RETAIL'}`)}</span>
```
(Si el header no tiene un título de área hoy, agregar uno pequeño junto al logo/nombre. Mantenerlo mínimo — un solo `<span>`.)

- [ ] **Step 4: Verify parity + build**

Run: `bun run test -- src/lib/i18n/parity.test.ts && bun run build`
Expected: parity PASS (los 3 locales tienen las mismas claves nuevas), build OK.

- [ ] **Step 5: Commit**

```bash
git add locales/es.json locales/pt.json locales/en.json src/app/api/auth/business/route.ts src/components/layout/WarehouseHeader.tsx
git commit -m "feat(verticals): relabel commerce shell title by vertical via i18n"
```

---

## Task 12: Badge de estado LIVE/COMING_SOON en catálogo de módulos (super-admin)

**Files:**
- Modify: `src/app/super-admin/modules/page.tsx`
- Modify: `src/app/api/admin/modules/route.ts` (si no devuelve `status`)

- [ ] **Step 1: Ensure the modules API returns `status`**

Run: `cat src/app/api/admin/modules/route.ts`. En el `select` del `module.findMany`, agregar `status: true` si no está.

- [ ] **Step 2: Show the status badge in the modules page**

En `src/app/super-admin/modules/page.tsx`, junto al nombre de cada módulo, renderizar un badge:
```tsx
{m.status === 'COMING_SOON' && (
  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{t('modules.comingSoon')}</span>
)}
```
Agregar la clave `modules.comingSoon` a los 3 locales: es "Próximamente", pt "Em breve", en "Coming soon".

- [ ] **Step 3: Verify parity + build**

Run: `bun run test -- src/lib/i18n/parity.test.ts && bun run build`
Expected: parity PASS, build OK.

- [ ] **Step 4: Commit**

```bash
git add src/app/super-admin/modules/page.tsx src/app/api/admin/modules/route.ts locales/es.json locales/pt.json locales/en.json
git commit -m "feat(verticals): coming_soon status badge in super-admin module catalog"
```

---

## Task 13: Suite completa + build gate

**Files:** none (verificación)

- [ ] **Step 1: Run full test suite**

Run: `bun run test`
Expected: todos verdes (nuevos de verticales + los 69 previos intactos).

- [ ] **Step 2: Production build**

Run: `bun run build`
Expected: build OK, sin type errors.

- [ ] **Step 3: Commit (si hubo ajustes)**

```bash
git add -p   # revisar y agregar solo archivos del bloque verticales, NUNCA los 13 pendientes
git commit -m "chore(verticals): finalize block — full suite green, build OK"
```

---

## Self-Review (contra el spec)

- **§3 Verticales + presets** → Task 2 (`VERTICAL_PRESETS`, los 6, RETAIL vacío). ✅
- **§4.1 Business.vertical** → Task 3. ✅
- **§4.2 Module.status LIVE/COMING_SOON** → Task 1 (registry) + Task 3 (schema+seed). ✅
- **§4.3 Registry con 4 módulos** → Task 1. ✅
- **§4.4 VERTICAL_PRESETS + presetModules** → Task 2. ✅
- **§5 Gating restaurante (rutas/sidebar/APIs)** → Task 8 (sidebars), Task 9 (layouts), Task 10 (APIs). ✅
- **§6.2 Super-admin fija vertical + preset** → Task 7. ✅
- **§6.3 Cambio de vertical aditivo** → `applyVerticalPreset` es aditivo (upsert enabled:true, no desactiva). El endpoint de edición de cliente reusa el mismo helper — cubierto por el diseño aditivo de Task 4; el editar-cliente (PUT en `clients/[id]`) aplica el mismo `applyVerticalPreset` al cambiar vertical (agregar la llamada análoga a Task 7 en el handler PUT si existe). **Ver nota abajo.**
- **§7 Relabeleo por vertical (i18n)** → Task 11. ✅
- **§8 Migración** → Tasks 5 (decideVertical) + 6 (script). ✅
- **§9 Testing** → Tasks 1,2,4,5 (unit) + gating (patrón guard reusado). ✅
- **§10 coming_soon sin features / status visible** → Task 12 (badge). ✅

**Gap corregido:** §6.3 (cambio de vertical posterior) requiere aplicar el preset también en el PUT de edición de cliente. **Añadir a Task 7 un Step extra:** si `src/app/api/admin/clients/[id]/route.ts` tiene un handler PUT que edita el negocio, incluir `vertical` en su schema y llamar `applyVerticalPreset(prisma, id, vertical)` cuando el vertical cambie (aditivo). Verificar la existencia de ese handler al implementar Task 7 (`cat "src/app/api/admin/clients/[id]/route.ts"`); si no existe edición de vertical por UI aún, dejar el cambio de vertical solo vía creación y anotar como pendiente menor.

**Type consistency:** `BusinessVertical` (uppercase) consistente en verticals.ts, applyVerticalPreset, decideVertical, schema enum. `ModuleKey` extendido en Task 1 usado por todo lo demás. `ModuleStatus` = 'LIVE'|'COMING_SOON' consistente registry/schema/seed. `source: 'PLAN'` coincide con enum `ModuleSource`. ✅

**Placeholder scan:** sin TBD/TODO. Los `sed`/`cat` de "leer primero" son pasos de inspección legítimos (las rutas exactas varían), no placeholders de código. ✅
