# Spec — Stocker: Framework de Verticales + Modularizar Restaurante

**Fecha:** 2026-07-17
**Estado:** Diseño aprobado, pendiente plan de implementación
**Depende de:** D1 Módulos (`src/lib/modules/*`, `TenantModule`, `ModuleGate`, guard), i18n (bloque E).
**Desbloquea:** vender el core a cualquier vertical de comercio; base para los specs de Variantes, Lotes y Mayorista.

---

## 1. Objetivo

Convertir Stocker de app enfocada en restaurantes a **plataforma multi-vertical con un solo core**. El
negocio elige **un vertical primario** al crearse, que **pre-activa un preset de módulos**. Las features
específicas de restaurante quedan **detrás de un módulo `RESTAURANT`** (reusando el gating de D1), de modo
que un comercio no-restaurante ve solo el core. Los módulos de los otros verticales (Mayorista, Variantes,
Lotes) se **registran y pre-activan en estado `coming_soon`** (sin features aún; se encienden solos cuando
su spec se construya).

**NO incluye** (specs posteriores): el modelo de variantes de producto, lotes/vencimiento, ni listas de
precios mayoristas. Este spec no toca `Product`/`Inventory`/`Order`.

---

## 2. Alcance

**Incluye:**
- Enum `Business.vertical` (6 verticales) + migración de negocios existentes.
- Campo `status` en el catálogo de módulos (`live` | `coming_soon`) + 4 módulos nuevos en el registry
  (`RESTAURANT` live; `WHOLESALE`, `VARIANTS`, `BATCHES` coming_soon).
- Mapa `VERTICAL_PRESETS` (vertical → módulos) y su aplicación en el onboarding (crea `TenantModule`).
- Gating de las features de restaurante detrás del módulo `RESTAURANT` (rutas + sidebar + APIs), reusando
  `ModuleGate` / `requireModule` / el filtro de sidebar por módulo que ya existen.
- Paso de vertical en el onboarding self-serve (`/register`) y en la creación/edición de cliente del
  super-admin; cambio de vertical posterior (re-aplica preset de forma aditiva).
- Relabeleo mínimo por vertical del título del shell y 2–3 headers (vía i18n), para que un no-restaurante
  no vea "Almacén".
- Tests (paridad de presets, resolución de módulos, gating, migración).

**NO incluye:**
- Modelo de variantes (talla/color/SKU) — spec siguiente.
- Lotes + vencimiento — spec posterior.
- Listas de precios mayorista/minorista + crédito/cuentas por cobrar — spec posterior.
- Empaquetado de precios por vertical/plan (qué plan incluye qué módulo) — spec de pricing aparte. En este
  spec los módulos del preset se activan **gratis** (funcionales o `coming_soon`), sin cobro extra.
- Páginas placeholder de los módulos `coming_soon` (no se crean pantallas falsas; solo se pre-provisiona el
  `TenantModule` y el onboarding informa "próximamente").

---

## 3. Verticales y presets

Enum `Business.vertical` (valores en inglés, consistente con enums existentes tipo `plan`, `Currency`):

| Vertical | Para quién | Preset de módulos | Estado features |
|---|---|---|---|
| `RESTAURANT` | Restaurante / café / bar | `RESTAURANT` | live |
| `FASTFOOD` | Comida rápida / batidos | `RESTAURANT` + `BATCHES` | RESTAURANT live, BATCHES coming_soon |
| `WHOLESALE` | Depósito / distribuidora (mayorista) | `WHOLESALE` | coming_soon |
| `HARDWARE` | Ferretería / repuestos / ropa | `VARIANTS` | coming_soon |
| `PHARMACY` | Farmacia | `BATCHES` + `VARIANTS` | coming_soon |
| `RETAIL` | Comercio general / bodega / minimarket | (ninguno) | solo core |

- **Default** (negocio sin vertical elegido): `RETAIL`.
- Los módulos `FINANCE` / `CRM` / `BI` existentes **no** forman parte de ningún preset de vertical: siguen
  siendo add-ons transversales gestionados por plan/licencias como hoy.
- Activar un módulo `coming_soon` **crea el `TenantModule`** (queda pre-provisionado) pero **no renderiza
  features** hasta que su spec exista; el gate de un módulo `coming_soon` no muestra pantallas.

---

## 4. Modelo de datos

### 4.1 `Business.vertical`
En `prisma/schema.prisma`, modelo `Business` (~líneas 112–159): agregar
```prisma
  vertical  BusinessVertical @default(RETAIL)
```
y el enum:
```prisma
enum BusinessVertical {
  RESTAURANT
  FASTFOOD
  WHOLESALE
  HARDWARE
  PHARMACY
  RETAIL
}
```
Aplicar con `prisma db push` a la DB comercial (no hay migraciones versionadas; el proyecto usa db push).

### 4.2 Catálogo de módulos: campo `status`
El catálogo de módulos (tabla `Module`, ~líneas 176–207 del schema) gana un campo:
```prisma
  status  ModuleStatus @default(LIVE)
```
```prisma
enum ModuleStatus {
  LIVE
  COMING_SOON
}
```
Seed/actualización del catálogo: `RESTAURANT` = LIVE; `WHOLESALE`/`VARIANTS`/`BATCHES` = COMING_SOON;
`FINANCE`/`CRM`/`BI` = LIVE (existentes).

### 4.3 Registry en código
`src/lib/modules/registry.ts`: agregar las 4 keys nuevas al registry con `key`, `label`, `description`,
`routes[]` y `status` (`'LIVE' | 'COMING_SOON'`, mismo casing que el enum de DB). Ejemplo de forma
(no exhaustivo):
```ts
{ key: 'RESTAURANT', label: 'Restaurante', status: 'LIVE',
  routes: ['/restaurant', '/cocina', '/mesa', '/waiter'] }
{ key: 'WHOLESALE', label: 'Mayorista', status: 'COMING_SOON', routes: [] }
{ key: 'VARIANTS', label: 'Variantes', status: 'COMING_SOON', routes: [] }
{ key: 'BATCHES', label: 'Lotes y vencimiento', status: 'COMING_SOON', routes: [] }
```
`ModuleKey` (tipo TS) se amplía con las 4 keys nuevas.

### 4.4 `VERTICAL_PRESETS`
Nuevo módulo `src/lib/modules/verticals.ts`:
```ts
export type BusinessVertical = 'RESTAURANT'|'FASTFOOD'|'WHOLESALE'|'HARDWARE'|'PHARMACY'|'RETAIL'

export const VERTICAL_PRESETS: Record<BusinessVertical, ModuleKey[]> = {
  RESTAURANT: ['RESTAURANT'],
  FASTFOOD:   ['RESTAURANT', 'BATCHES'],
  WHOLESALE:  ['WHOLESALE'],
  HARDWARE:   ['VARIANTS'],
  PHARMACY:   ['BATCHES', 'VARIANTS'],
  RETAIL:     [],
}
```
Función pura `presetModules(vertical): ModuleKey[]` (retorna el array del mapa) — testeable en aislamiento.

---

## 5. Gating de restaurante (reusa D1)

Las features de restaurante pasan a estar **detrás del módulo `RESTAURANT`**, usando el mecanismo que ya
existe (`ModuleGate`, `requireModule`, filtro de sidebar por `module?: ModuleKey`). Un negocio sin el
módulo `RESTAURANT` no ve ni accede a nada de esto.

**Se gatea (features específicas de restaurante):**
- Rutas: `/restaurant/*`, `/(public)/cocina/[token]`, `/(public)/mesa/[token]`, `/(waiter)/*`.
- Flujo de **reposición local↔almacén**: rutas `/restaurant/inventory/replenishment`,
  `/warehouse/replenishment`, y APIs `/api/replenishment/*`.
- APIs específicas: recetas (`/api/recipes/*`), mesas (`/api/tables/*` o equivalente).
- Ítems de sidebar de restaurante (en `RestaurantSidebar.tsx`) y el ítem "Reposiciones" del
  `WarehouseSidebar.tsx` — marcados con `module: 'RESTAURANT'` para que el filtro existente los oculte.
- Features de POS basadas en mesa (`tableId` en Order) en el POS de restaurante.

**Queda como core (lo ven todos los verticales):**
- Shell de comercio genérico = el actual `/warehouse/*` (relabeleado, ver §7): productos, inventario,
  categorías/marcas, compras/facturas de proveedor, proveedores, clientes, transferencias entre
  sucursales, reportes, usuarios, ajustes.
- Venta genérica / comprobante no-fiscal: `/sales/new` + POS genérico (sin mesa).
- Multi-moneda, tasas, caja, billing, super-admin.

> **Nota de planificación:** el inventario exacto de rutas de `/restaurant/*` y del POS que se gatean se
> finaliza en el plan auditando `src/app/` (algunas rutas bajo `/restaurant` son versiones-restaurante de
> cosas core como productos/reportes; esas se gatean junto al shell de restaurante, ya que el core vive en
> `/warehouse`). El principio: **todo `/restaurant/*` + cocina/mesa/waiter + reposición = módulo
> RESTAURANT; `/warehouse/*` + `/sales` = core.**

**Guard servidor:** las APIs de restaurante usan `requireModule(prisma, businessId, 'RESTAURANT')`
(lanza `ModuleForbiddenError` → 403) igual que FINANCE/CRM/BI hoy.

---

## 6. Onboarding

### 6.1 Self-serve (`/register`)
Agregar un paso "¿Qué vendes?" con los 6 verticales (label + descripción + ícono). Al completar el
registro:
1. Se crea el `Business` con `vertical` elegido.
2. Se crean los `TenantModule` según `presetModules(vertical)` (source = `PLAN`/preset, `enabled: true`,
   `priceAtActivation: 0` — gratis en este spec).
3. Redirige al shell correspondiente (restaurante → `/restaurant`; resto → `/warehouse`).

### 6.2 Super-admin
En la creación/edición de cliente (páginas `super-admin/clients` / `super-admin/licenses` y sus APIs
`/api/admin/clients*`): agregar el campo `vertical` (select). Crear cliente aplica el preset igual que
6.1.

### 6.3 Cambio de vertical posterior
El super-admin puede cambiar `Business.vertical`. Al cambiarlo, se **re-aplica el preset de forma
aditiva**: activa (crea/enciende) los `TenantModule` del nuevo vertical; **no** desactiva módulos que ya
estaban (para no romper toggles manuales ni datos). Los módulos siguen siendo toggleables uno a uno en la
página de licencias D1 existente.

---

## 7. Relabeleo por vertical (mínimo)

Claves i18n bajo el namespace `vertical.*` (una por vertical) que resuelven el **título del shell** y
**2–3 headers**, para que un no-restaurante no vea "Almacén":
- Claves `vertical.shellTitle.RESTAURANT`, `.WHOLESALE`, `.HARDWARE`, `.PHARMACY`, `.RETAIL`,
  `.FASTFOOD` en los 3 locales (es/pt/en). Valores es: Restaurante / Depósito / Comercio / Farmacia /
  Comercio / Local respectivamente.
- Se resuelve combinando `Business.vertical` (dato del tenant) con `t()` de i18n: `t('vertical.shellTitle.'
  + business.vertical)`. Depende del vertical (dato) y del idioma (i18n) a la vez.
- **Scope estricto:** solo el título del shell y el header del dashboard. No se relabela cada string ni se
  duplican pantallas. Mantiene la paridad de claves i18n (test del bloque E).

---

## 8. Migración de datos existentes

Script/paso de migración (idempotente):
- Negocios existentes que tengan al menos una `Location` con `type = 'RESTAURANT'` → `vertical =
  RESTAURANT` + `TenantModule` `RESTAURANT` activo (para que sus features de restaurante sigan visibles).
- Cualquier otro negocio existente sin vertical → `vertical = RETAIL`.
- El seed comercial (demo) queda como `RESTAURANT` (tiene locations de restaurante + almacén + flujo de
  reposición).

---

## 9. Testing (TDD)

**Puras (unit):**
- `presetModules(vertical)` retorna el array correcto para los 6 verticales (incluye `RETAIL` → `[]`).
- Todos los `ModuleKey` referenciados en `VERTICAL_PRESETS` existen en el registry (test de integridad, evita
  typos que dejen presets rotos).
- `effectiveModules` incluye los módulos del preset cuando se pasan como `TenantModule` overrides
  (extiende los tests D1 existentes).
- Un módulo `COMING_SOON` se resuelve como "activo pero sin features" (helper de status), distinto de LIVE.

**Gating:**
- `requireModule('RESTAURANT')` lanza 403 para un negocio sin el módulo; pasa para uno con él (reusa el
  patrón de `guard.test.ts`).
- El filtro de sidebar oculta los ítems con `module:'RESTAURANT'` cuando el tenant no lo tiene.

**Onboarding / migración:**
- Registrar un negocio con `vertical = HARDWARE` crea exactamente un `TenantModule` `VARIANTS`.
- Registrar `RETAIL` no crea ningún `TenantModule` de vertical.
- La migración asigna `RESTAURANT` a un negocio con location de restaurante y `RETAIL` a uno sin ella.

---

## 10. Riesgos / decisiones

- **`coming_soon` sin features:** un vertical como HARDWARE hoy ve solo core + su módulo pre-provisionado
  inerte. El onboarding debe comunicar "Variantes: próximamente" para no prometer de más. Riesgo bajo:
  el core ya es vendible.
- **Rutas de restaurante que son "core duplicado":** `/restaurant` tiene versiones propias de
  productos/reportes. Se gatean junto al shell de restaurante (el core vive en `/warehouse`); no se
  intenta fusionar los dos shells en este spec.
- **Cambio de vertical aditivo:** no desactiva módulos previos a propósito (evita pérdida de acceso/datos).
  Si el usuario quiere quitar un módulo, lo hace explícito en la página de licencias.
- **Relabeleo por dato + idioma:** el label del shell depende de `Business.vertical` (dato) y del idioma
  (i18n). Se combinan; no reemplaza al i18n.

---

## 11. Criterios de aceptación

1. `Business.vertical` existe (enum, default RETAIL) y el catálogo de módulos tiene `status` LIVE/COMING_SOON.
2. El registry incluye `RESTAURANT` (live) + `WHOLESALE`/`VARIANTS`/`BATCHES` (coming_soon).
3. Registrar/crear un negocio con un vertical aplica su preset (`TenantModule` correctos), gratis.
4. Un negocio sin el módulo `RESTAURANT` NO ve ni accede a mesas, recetas, cocina, mesa/QR, mesonero ni
   reposición (rutas, sidebar y APIs bloqueadas); un restaurante sí.
5. Un negocio `RETAIL`/`HARDWARE`/`WHOLESALE` usa el shell de comercio (ex-`/warehouse`) relabeleado y
   vende/factura/controla stock/compra con el core, sin chrome de restaurante.
6. El super-admin puede fijar y cambiar el vertical; el cambio re-aplica el preset de forma aditiva.
7. La migración asigna `RESTAURANT` a los negocios de restaurante existentes y `RETAIL` al resto, sin
   ocultar features a los que ya usaban restaurante.
8. Todos los tests (§9) pasan; `bun run build` OK.
