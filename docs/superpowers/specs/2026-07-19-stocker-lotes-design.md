# Spec — Stocker: Lotes y Vencimiento (v1)

**Fecha:** 2026-07-19
**Estado:** Diseño aprobado, pendiente plan de implementación
**Depende de:** módulo `BATCHES` (framework de verticales), patrón overlay de Variantes (`adjustStock`,
`ModuleGate`/`requireModule`, tabla de stock separada).
**Desbloquea:** farmacia y perecederos (batidos/comida rápida, alimentos) con trazabilidad de lote +
vencimiento; base para la selección de lote en venta del distribuidor mayorista (spec futuro).

---

## 1. Objetivo

Permitir que un producto lleve **lotes con fecha de vencimiento**, con stock por lote y **FEFO
silencioso** (First-Expired-First-Out) en las salidas, para trazabilidad, alertas y reportes de
vencimiento. Overlay: los productos simples y los con variantes no cambian; solo los tenants con el
módulo `BATCHES` (preset de PHARMACY/FASTFOOD) manejan lotes. **El cajero NO elige lote en la venta** —
el descuento por lote es interno. La selección de lote en venta (para distribuidores, incluyendo
variantes) es un spec posterior.

**NO incluye:** selección de lote por el cajero en la venta; lotes por variante (v1 es a nivel producto);
presentaciones/precios por presentación (eso es Variantes).

---

## 2. Alcance

**Incluye:**
- `Product.hasBatches` (excluyente con `hasVariants`); tablas `ProductBatch` + `BatchInventory`.
- `batchId?` en `InventoryMovement`; `lotNumber?`+`expiryDate?` en `InvoiceLineItem` (captura en recepción).
- Config por negocio: `Business.expiryAlertDays` (umbral "por vencer", default 30) y
  `Business.allowExpiredSale` (permitir vender vencidos, default false).
- Helpers: `addBatchStock` (entrada), `deductBatchesFEFO` (salida FEFO, salta o incluye vencidos según
  config), `batchStatus`, resolución de stock por lotes.
- Flujos con lote: compra/recepción, venta (FEFO silencioso), transferencia (preserva lote), ajuste
  (por lote), entrada manual.
- Módulo `BATCHES` → LIVE; gating de la gestión de lotes.
- Reporte de vencimientos + alerta en dashboard.
- UI: editor de producto (toggle), captura lote+vencimiento en compra, inventario expandible por lote,
  reporte de vencimientos, ajustes del negocio (umbral + permitir vencidos), selector de lote en ajuste.
  Claves i18n `batches.*` con paridad es/pt/en.
- Tests TDD.

**NO incluye:** selección de lote en venta por el cajero; lotes por variante; múltiples vencimientos por
mismo lotNumber; extraer lotes a recetas/reposición (features de restaurante, siguen a nivel producto).

---

## 3. Modelo de datos

### 3.1 `Business` (config)
```prisma
  expiryAlertDays  Int     @default(30)
  allowExpiredSale Boolean @default(false)
```

### 3.2 `Product`
```prisma
  hasBatches Boolean @default(false)
  batches    ProductBatch[]
```
**Regla:** `hasBatches` y `hasVariants` son mutuamente excluyentes (un producto es simple, O con
variantes, O con lotes). Se valida al activar el toggle (API rechaza activar uno si el otro está activo).

### 3.3 `ProductBatch` (nueva)
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
```
El vencimiento es propiedad del lote (un `lotNumber` por producto = una fecha).

### 3.4 `BatchInventory` (nueva)
```prisma
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
El stock de productos con lote vive aquí; `Inventory` (simple) queda intacto. Requiere relación inversa
`batchInventory BatchInventory[]` en `Location`.

### 3.5 Campos en tablas de movimiento/compra
- `InventoryMovement`: `batchId String?` + `batch ProductBatch? @relation(...)`.
- `InvoiceLineItem`: `lotNumber String?` + `expiryDate DateTime? @db.Date` (input capturado en la línea;
  la recepción crea/actualiza el `ProductBatch` a partir de estos).

Se aplica con `prisma db push`.

---

## 4. Lógica de stock (helpers)

### 4.1 `batchStatus` (puro)
`batchStatus(expiryDate, today, expiryAlertDays): 'EXPIRED' | 'NEAR' | 'OK'`
- `EXPIRED` si `expiryDate < today`.
- `NEAR` si `expiryDate <= today + expiryAlertDays días` (y no vencido).
- `OK` en otro caso.

### 4.2 `addBatchStock` (entrada)
`addBatchStock(tx, { batchId, productId, locationId, delta, type, userId, reason? })` → upsert
`BatchInventory(batchId, locationId)` sumando `delta`; registra `InventoryMovement` con `productId` +
`batchId`. (Análogo a `adjustStock` pero por lote.)

### 4.3 `deductBatchesFEFO` (salida FEFO)
`deductBatchesFEFO(tx, { productId, locationId, quantity, userId, today, allowExpired, type })`:
- Carga las `BatchInventory` del producto en esa ubicación con `quantity > 0`, join a `ProductBatch`,
  ordenadas por `expiryDate` ascendente (vence primero).
- Si `allowExpired` es false, **excluye** los lotes vencidos (`expiryDate < today`).
- Descuenta `quantity` recorriendo los lotes en orden (abarca varios si hace falta); por cada lote tocado
  actualiza `BatchInventory` y registra un `InventoryMovement` (type OUT/TRANSFER) con su `batchId`.
- Si el stock disponible (según `allowExpired`) **no alcanza**, lanza `InsufficientBatchStockError` (la
  venta/salida falla — no se auto-vende vencido cuando `allowExpired` es false).
- La parte pura (elegir lotes + repartir la cantidad, dado el arreglo de lotes) se testea aislada; la
  escritura se testea con tx stub.

### 4.4 Resolución de stock del producto
`stockForProduct` se extiende: `hasBatches` → suma de `BatchInventory`; `hasVariants` → `VariantInventory`;
simple → `Inventory`.

---

## 5. Flujos con lote

- **Compra / recepción:** la UI de compra captura `lotNumber` + `expiryDate` por línea de producto con
  lotes. Al pasar la factura a `RECEIVED`: por cada línea con lote, `upsert ProductBatch(productId,
  lotNumber)` (fija/actualiza `expiryDate`) y `addBatchStock(+quantity)`.
- **Venta:** en la emisión del comprobante (mismo punto que Variantes, saltando productos con receta),
  para productos con `hasBatches` usar `deductBatchesFEFO` con `allowExpired = business.allowExpiredSale`
  y `today` del servidor. Silencioso (el cajero no ve lotes). Idempotente (una sola vez por comprobante).
- **Transferencia:** al confirmar, para productos con lotes: FEFO en origen selecciona lotes;
  `BatchInventory(batch, fromLocation) -= q` y `BatchInventory(batch, toLocation) += q` — **preserva la
  identidad del lote** entre ubicaciones (mismo `ProductBatch`, filas de inventario por ubicación). Usa
  `allowExpired = true` internamente (mover vencidos entre almacenes es válido; no es una venta).
- **Ajuste de inventario:** para productos con lotes, el ajuste es **por lote** (la UI exige elegir el
  `batchId`); setea `BatchInventory(batch, location)` a la cantidad absoluta + `InventoryMovement`
  (ADJUSTMENT, con `batchId`).
- **Entrada manual (movement IN):** producto con lotes requiere `lotNumber`+`expiryDate` (upsert batch +
  addBatchStock).

Simples/variantes: los mismos flujos siguen como hoy (regresión verde).

---

## 6. Módulo BATCHES + gating

- `BATCHES` pasa de `COMING_SOON` a **`LIVE`** (registry `status`, seed, DB). Tenants PHARMACY/FASTFOOD
  ya lo tienen en su preset → ven la feature al deployar.
- **Gating:** la **gestión de lotes** (toggle `hasBatches`, captura de lote+vencimiento, ajuste por lote)
  va detrás de `<ModuleGate module="BATCHES">` (UI) y `requireModule('BATCHES')` (APIs de gestión). El
  FEFO en venta/transferencia es **core** (opera sobre lotes existentes; no requiere el módulo para
  operar).
- Reusa el helper `liveModules` ya creado (BATCHES deja de ser COMING_SOON).

---

## 7. Reportes / alertas de vencimiento

- **Reporte de vencimientos** (página nueva, ej. `/warehouse/reports/expiry`): lista de lotes con
  `BatchInventory.quantity > 0`, mostrando producto, lote, ubicación, cantidad, vencimiento y **estado**
  (`batchStatus` → Vencido / Por vencer / Vigente), filtrable por producto/ubicación/estado. "Por vencer"
  usa `business.expiryAlertDays`.
- **Alerta en dashboard:** contador/widget de "lotes por vencer" y "vencidos con stock" (link al reporte).
- Endpoint que agrega estos datos por negocio.

---

## 8. UI

- **Editor de producto:** toggle "Maneja lotes y vencimiento" (gateado por BATCHES, **excluyente** con el
  toggle de variantes — si uno está activo, el otro se deshabilita/rechaza).
- **Compra:** por línea de producto con lotes, campos **lote** + **fecha de vencimiento**.
- **Inventario:** producto con lotes se expande a sus lotes (stock por lote + vencimiento, color por
  estado). Simples/variantes como hoy.
- **Reporte de vencimientos** + widget/alerta en dashboard.
- **Ajuste de inventario:** selector de lote para productos con lotes.
- **Ajustes del negocio:** campos **días de alerta de vencimiento** (`expiryAlertDays`) y **permitir
  venta de productos vencidos** (`allowExpiredSale`).
- i18n: claves `batches.*` en es/pt/en manteniendo la paridad.

---

## 9. Testing (TDD)

**Puras:**
- `batchStatus(expiry, today, N)` → EXPIRED / NEAR / OK (bordes: hoy, hoy+N).
- FEFO puro `pickBatchesFEFO(batches, quantity, { allowExpired, today })` → devuelve los lotes y las
  cantidades a descontar en orden de vencimiento; salta vencidos si `!allowExpired`; error si no alcanza;
  abarca varios lotes.
- Resolución de stock: `hasBatches` → suma `BatchInventory`.
- `addBatchStock` y `deductBatchesFEFO` con tx stub (upserts/movimientos correctos, un movimiento por lote).

**Guard:** `requireModule('BATCHES')` bloquea la gestión de lotes sin el módulo.

**Flujos:** recepción crea/actualiza lote y suma; venta FEFO descuenta el que vence primero y (según
config) salta o incluye vencidos; transferencia preserva el lote; ajuste por lote registra el movimiento
correcto; producto simple/variante sin cambios (regresión).

---

## 10. Riesgos / decisiones

- **Overlay con `BatchInventory` separado:** consistente con Variantes; `Inventory` simple intacto; sin
  nulos en índices únicos.
- **Excluyente producto simple/variantes/lotes:** evita el caso lote×variante (v1). Lotes-por-variante y
  selección-de-lote-en-venta = spec del distribuidor (WHOLESALE), futuro.
- **`allowExpiredSale` off por defecto:** vender solo con stock vencido falla — correcto para farmacia
  (no vender vencidos por accidente). El cliente lo activa si su caso lo permite.
- **`expiryAlertDays` por negocio:** el umbral "por vencer" lo define el cliente (30/60/90 días o meses).
- **FEFO silencioso:** el cajero no elige lote; el descuento interno mantiene saldos por lote exactos
  para KPIs. Spec grande → el plan se ejecuta por fases (modelo+FEFO → flujos → reportes → UI).

---

## 11. Criterios de aceptación

1. Un producto puede marcarse `hasBatches` (excluyente con variantes) y tener lotes con vencimiento.
2. El stock de lotes vive en `BatchInventory`; `Inventory` (simple) no cambia (regresión verde).
3. Recepción de compra captura lote+vencimiento y crea/actualiza el `ProductBatch` sumando stock.
4. La venta descuenta por FEFO silencioso (lote que vence primero), saltando vencidos salvo que
   `allowExpiredSale` esté activo; si el stock vendible no alcanza, la venta falla.
5. Transferencia mueve stock preservando la identidad del lote; ajuste por lote registra el movimiento.
6. El reporte de vencimientos clasifica lotes con stock en Vencido / Por vencer (≤ `expiryAlertDays`) /
   Vigente; el dashboard alerta.
7. `expiryAlertDays` y `allowExpiredSale` son editables en ajustes del negocio.
8. El módulo `BATCHES` está LIVE; la gestión de lotes se gatea; PHARMACY/FASTFOOD lo ven por preset.
9. Paridad i18n verde; todos los tests (§9) pasan; `bun run build` OK.
