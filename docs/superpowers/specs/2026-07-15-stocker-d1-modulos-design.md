# Spec — Stocker D1: Módulos por cliente (Bloque D, parte 1)

**Fecha:** 2026-07-15
**Estado:** Diseño aprobado, pendiente plan de implementación
**Depende de:** Bloque A (multi-moneda — reusa `Currency`/precios). Base multi-tenant existente (`Business`, `Plan`, super-admin).
**Desbloquea:** cobro real de módulos (Bloque C USDT), y sirve de base para D2 (custom de código por cliente).
**Hermano pendiente:** D2 — customización a nivel de código por cliente aislada (spec aparte; decisión de arquitectura: extension points vs deployment por cliente vs plugins).

---

## 1. Objetivo

Permitir que el **panel super-admin active/desactive módulos opcionales por cliente**, como
**planes + add-ons de pago**, sin que la config de un cliente afecte a otro. Cada módulo es un costo
adicional. D1 entrega la **maquinaria de gating + catálogo + gestión + metadata de cobro**; las
features de cada módulo (Finanzas, BI, CRM) se construyen después y nacen ya "gateables".

### Modelo de negocio (decidido)
- **STARTER y GROWTH:** funciones básicas (núcleo). NO incluyen módulos premium por defecto.
- **Add-ons (FINANCE / CRM / BI):** se activan aparte, por cliente, cada uno con su precio. Son
  puros add-ons (por defecto `includedInPlans = []`).
- **ENTERPRISE:** plan **a medida** — el cliente se pone en contacto y el admin le activa/adapta el
  sistema según necesidad (activación manual de los módulos que pacte, y enganche con **D2**
  customización de código por cliente). No auto-incluye módulos; se configura por cliente al contratar.
- **Módulos efectivos de un cliente** = (incluidos por su plan) ∪ (add-ons activados) − (overrides apagados).
  Con la política actual, "incluidos por plan" arranca vacío para los tres; todo se activa por cliente.

### Catálogo inicial
Núcleo base (inventario + ventas/POS + facturación no fiscal) siempre activo. Módulos opcionales
registrados en el arranque: **FINANCE** (Finanzas/Contabilidad), **BI** (Analytics avanzado),
**CRM**. Multi-moneda permanece como capacidad del núcleo (flag `multiCurrency`), NO como módulo de venta.

---

## 2. Alcance

**Incluye:**
- Registro de módulos en código (claves válidas + qué gatea cada una).
- Catálogo en DB editable por el admin (precio, inclusión por plan, activo).
- Activación/override por cliente (`TenantModule`).
- Cálculo de módulos efectivos (función pura testeada).
- Enforcement doble capa: guard de servidor (403) + gating de UI (sidebars + páginas).
- Pantallas admin: catálogo de módulos + toggles por cliente.
- Pantallas "próximamente" para FINANCE/BI/CRM (placeholders gateados).

**NO incluye (specs propios):**
- Construir las features Finanzas/BI/CRM reales.
- Cobro/facturación real de los módulos en USDT → Bloque C.
- Customización de código por cliente → D2.

---

## 3. Design system
Reusar el tema oscuro existente (zinc-950 + emerald-500), componentes `src/components/ui/*` y el
layout de super-admin (`SuperAdminSidebar`, páginas en `src/app/super-admin/*`). Ver el patrón de
`src/app/super-admin/licenses/page.tsx` (ya edita `{ plan, maxRestaurants, maxUsers }` por cliente).

---

## 4. Registro de módulos (código — fuente de las claves)

`src/lib/modules/registry.ts`:
```ts
export type ModuleKey = 'FINANCE' | 'BI' | 'CRM'

export interface ModuleDef {
  key: ModuleKey
  label: string
  description: string
  /** Rutas / secciones de nav que este módulo habilita (para el gating de UI). */
  routes: string[]
}

export const MODULE_REGISTRY: Record<ModuleKey, ModuleDef> = {
  FINANCE: { key: 'FINANCE', label: 'Finanzas', description: 'Contabilidad, gastos, flujo de caja', routes: ['/finance'] },
  BI:      { key: 'BI',      label: 'BI / Analytics', description: 'Dashboards y reportes avanzados', routes: ['/analytics-pro'] },
  CRM:     { key: 'CRM',     label: 'CRM', description: 'Clientes, seguimiento, campañas', routes: ['/crm'] },
}

export const MODULE_KEYS = Object.keys(MODULE_REGISTRY) as ModuleKey[]
```
- Una clave sin entrada en el registro es inválida (no se puede activar código inexistente).
- Agregar un módulo nuevo = agregar entrada aquí + su seed en DB. Cambio de dev, no de admin.

---

## 5. Modelo de datos (Prisma)

```prisma
model Module {
  id              String     @id @default(cuid())
  key             String     @unique          // debe existir en MODULE_REGISTRY
  name            String
  description     String?
  addOnPrice      Decimal    @default(0) @db.Decimal(18, 2)
  priceCurrency   Currency   @default(USD)    // reusa enum del Bloque A
  includedInPlans Plan[]     @default([])     // qué planes lo traen incluido
  active          Boolean    @default(true)   // disponible para venta
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  tenantModules   TenantModule[]
  @@map("modules")
}

model TenantModule {
  id                String   @id @default(cuid())
  businessId        String
  business          Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  moduleKey         String
  enabled           Boolean  @default(true)     // override explícito (add-on on, o plan-incluido off)
  source            ModuleSource @default(ADDON)
  priceAtActivation Decimal? @db.Decimal(18, 2) // precio congelado al activar (para Bloque C)
  activatedAt       DateTime @default(now())

  module Module @relation(fields: [moduleKey], references: [key], onDelete: Cascade)

  @@unique([businessId, moduleKey])
  @@index([businessId])
  @@map("tenant_modules")
}

enum ModuleSource {
  PLAN
  ADDON
}
```
Añadir a `Business` la relación inversa: `tenantModules TenantModule[]`.

### Aplicación a DB
`prisma db push` contra la Supabase comercial (ya conectada). Seed: crear las filas `Module` desde
`MODULE_REGISTRY` con precio 0 e `includedInPlans = []` (puros add-ons; el admin ajusta precio e
inclusión luego). Clientes ENTERPRISE: activación manual por cliente vía toggles al contratar.

---

## 6. Cálculo de módulos efectivos (núcleo, testeado)

`src/lib/modules/effectiveModules.ts`:
```ts
import { Plan } from '@prisma/client'
import { ModuleKey } from './registry'

export interface CatalogEntry { key: ModuleKey; active: boolean; includedInPlans: Plan[] }
export interface TenantOverride { moduleKey: ModuleKey; enabled: boolean }

/** Conjunto de módulos efectivamente activos para un tenant. */
export function effectiveModules(
  plan: Plan,
  catalog: CatalogEntry[],
  overrides: TenantOverride[],
): Set<ModuleKey> {
  const result = new Set<ModuleKey>()
  const overrideMap = new Map(overrides.map(o => [o.moduleKey, o.enabled]))
  for (const m of catalog) {
    if (!m.active) continue                    // módulo global inactivo → nunca
    const includedByPlan = m.includedInPlans.includes(plan)
    const override = overrideMap.get(m.key)
    const on = override !== undefined ? override : includedByPlan
    if (on) result.add(m.key)
  }
  return result
}
```
Casos de prueba (TDD): incluido por plan; add-on (override on de algo no incluido); override off de
algo incluido por plan; módulo global inactivo (nunca aparece); plan sin módulos.

---

## 7. Enforcement

### Servidor (fuente de verdad)
`src/lib/modules/guard.ts`:
- `getEnabledModules(prisma, businessId): Promise<Set<ModuleKey>>` — carga plan + catálogo + overrides y aplica `effectiveModules`.
- `requireModule(prisma, businessId, key): Promise<void>` — lanza/retorna 403 si el módulo no está activo.
- Las rutas API de cada módulo llaman `requireModule` al inicio. Un cliente sin el módulo recibe **403** aunque manipule el front.

### Cliente (UX)
- `src/components/modules/ModulesProvider.tsx` — carga una vez `GET /api/me/modules` (los módulos efectivos del tenant actual) y los expone por contexto/hook `useModules()`.
- Los sidebars (`WarehouseSidebar`, `RestaurantSidebar`, etc.) filtran los ítems cuyo módulo no esté activo.
- Entrar directo a una ruta de módulo apagado → componente `<ModuleGate module="FINANCE">` que muestra "Módulo no activo — contáctanos para activarlo".

### API de apoyo
- `GET /api/me/modules` — devuelve las claves efectivas del tenant del usuario autenticado (usa la resolución `X-Business-Id`/cookie existente).

---

## 8. Gestión desde el admin (super-admin)

1. **Super-admin → Módulos** (`/super-admin/modules`, nuevo):
   - Lista de `Module` con edición inline de `name`, `description`, `addOnPrice` + `priceCurrency`, `includedInPlans`, `active`.
   - API: `GET/PUT /api/admin/modules`.
2. **Super-admin → Cliente (extiende licenses):**
   - Sección "Módulos" por cliente: muestra los incluidos por su plan (solo lectura) + toggles de add-ons + posibilidad de override off de un incluido.
   - Al activar un add-on: crea `TenantModule` con `source=ADDON`, `enabled=true`, `priceAtActivation = Module.addOnPrice`.
   - Vista de "módulos efectivos" (resultado de `effectiveModules`).
   - API: `GET/PUT /api/admin/clients/[id]/modules`.

---

## 9. Testing

- **Unit (TDD):** `effectiveModules` (todos los casos del §6).
- **Guard:** `getEnabledModules`/`requireModule` con prisma mockeado — 403 cuando corresponde.
- **Integración:** activar un add-on a un cliente no cambia los módulos de otro cliente (aislamiento).
- **Registro:** toda `key` en DB debe existir en `MODULE_REGISTRY` (test de consistencia).

---

## 10. Riesgos / decisiones abiertas

- **Módulos efectivos en sesión vs fetch:** se opta por **fetch** (`/api/me/modules`) vía provider,
  no incrustar en el JWT — así activar un módulo no requiere re-login. Costo: 1 request por carga de layout (cacheable).
- **`key` como String vs enum Prisma:** se usa String validado contra `MODULE_REGISTRY` (evita
  migraciones al añadir módulos y permite catálogo editable). La integridad la garantiza el test de consistencia + FK a `Module.key`.
- **Precio en `priceAtActivation`:** se congela al activar para que el Bloque C cobre lo pactado aunque el precio de catálogo cambie después.

---

## 11. Criterios de aceptación

1. El admin ve el catálogo de módulos y edita precio / inclusión por plan / activo.
2. El admin activa el add-on "CRM" al cliente A; el cliente B no se ve afectado.
3. Un usuario del cliente A sin FINANCE que llame a una ruta `/api/finance/*` recibe **403**.
4. El sidebar del cliente A oculta las secciones de módulos no activos; entrar directo muestra "Módulo no activo".
5. `effectiveModules` resuelve correctamente plan-incluido, add-on y override-off (tests verdes).
6. Cambiar el plan de un cliente recalcula sus módulos efectivos sin tocar overrides de add-ons.
7. El schema aplica en la Supabase comercial vía `db push` y el seed crea FINANCE/BI/CRM.
