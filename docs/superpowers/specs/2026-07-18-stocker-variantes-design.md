# Spec — Stocker: Variantes de Producto

**Fecha:** 2026-07-18
**Estado:** Diseño aprobado, pendiente plan de implementación
**Depende de:** Framework de Verticales (módulo `VARIANTS`, `ModuleGate`/`requireModule`, `Business.vertical`).
**Desbloquea:** ferretería / ropa / repuestos / retail con referencias; base para Lotes (patrón de overlay de stock).

---

## 1. Objetivo

Permitir que un producto tenga **variantes definidas por atributos** (ej. Talla + Color, o Medida/Modelo),
cada una con su propio **SKU, stock y precio**, sin tocar el modelo de stock simple que usan todos los
verticales. Es un **overlay**: los productos simples siguen exactamente igual; solo los tenants con el
módulo `VARIANTS` (preset de HARDWARE/PHARMACY) crean variantes. La variante es consciente en todo el loop
comercial: catálogo, inventario, POS/venta, compras/recepción y transferencias.

**NO incluye:** generador de matriz (Talla×Color automático) — las variantes se agregan una a una;
lotes/vencimiento (spec aparte, reusará este patrón); listas de precios mayoristas.

---

## 2. Alcance

**Incluye:**
- Tabla `ProductVariant` + flag `Product.hasVariants` + `Product.variantOptions` (definición de atributos).
- Tabla `VariantInventory` (stock por variante) — `Inventory` (stock simple) queda intacto.
- `variantId` opcional en `InventoryMovement`, `OrderItem`, `InvoiceLineItem`, `TransferLineItem`.
- Helper central `adjustStock` que rutea a `VariantInventory` o `Inventory`.
- Variante consciente en: POS/venta, compras/recepción (RECEIVED), transferencias, ajuste de inventario,
  stock bajo / valuación.
- Módulo `VARIANTS` pasa a `LIVE`; gating de la gestión de variantes (`ModuleGate` + `requireModule`).
- Helper `liveModules` (cierra el hallazgo del review de verticales: los módulos `COMING_SOON` no deben
  pasar el gate).
- UI: editor de producto (definir atributos + agregar variantes), inventario expandible por variante,
  selector de variante en POS/`/sales/new`/compras. Claves i18n con paridad es/pt/en.
- Tests TDD (puras + guard + flujos).

**NO incluye:** matriz de generación; lotes/vencimiento; mayorista; extraer variantes a recetas/reposición
(features de restaurante, siguen a nivel producto, fuera de los verticales con VARIANTS).

---

## 3. Modelo de datos

### 3.1 `Product` (modificar, `prisma/schema.prisma`)
Agregar:
```prisma
  hasVariants    Boolean @default(false)
  variantOptions Json?   // [{ "name": "Talla", "values": ["S","M","L"] }, { "name": "Color", "values": ["Rojo","Azul"] }]
  variants       ProductVariant[]
```
`variantOptions` describe los atributos y sus valores posibles (para el editor). Los productos simples
quedan `hasVariants=false`, `variantOptions=null` — sin cambios.

### 3.2 `ProductVariant` (nueva)
```prisma
model ProductVariant {
  id         String  @id @default(cuid())
  productId  String
  attributes Json    // { "Talla": "M", "Color": "Rojo" }
  sku        String?
  barcode    String?
  costPrice  Decimal? @db.Decimal(18, 2) // null → hereda Product.costPrice
  salePrice  Decimal? @db.Decimal(18, 2) // null → hereda Product.salePrice
  isActive   Boolean @default(true)
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
```
El nombre visible se arma de `attributes` (ver `variantDisplayName`, §5). El precio/costo efectivo es
`variant.salePrice ?? product.salePrice` (idem costo).

### 3.3 `VariantInventory` (nueva) — decisión clave del overlay
```prisma
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
El stock de variantes vive aquí; `Inventory` (stock simple) **no se toca** — así evitamos el problema de
`variantId` nulo en índices únicos y el riesgo a los otros verticales. Requiere agregar la relación inversa
`variantInventory VariantInventory[]` al modelo `Location`.

### 3.4 `variantId` opcional en tablas de movimiento (nullable, sin unique → sin conflictos)
- `InventoryMovement`: `variantId String?` + `variant ProductVariant? @relation(...)`.
- `OrderItem`: `variantId String?` + relación.
- `InvoiceLineItem`: `variantId String?` + relación.
- `TransferLineItem`: `variantId String?` + relación.

Se aplica con `prisma db push` (el proyecto no usa migraciones versionadas).

---

## 4. Lógica de stock y flujos

### 4.1 Helper central `adjustStock`
`src/lib/inventory/adjustStock.ts` — una sola pieza que rutea según haya variante:
```ts
// Firma conceptual
adjustStock(tx, { productId, variantId, locationId, delta, type, userId, reason }): Promise<void>
```
- Si `variantId` presente → upsert/actualiza `VariantInventory(variantId, locationId)` sumando `delta`;
  registra `InventoryMovement` con `productId` + `variantId`.
- Si no → upsert/actualiza `Inventory(productId, locationId)` (comportamiento actual); movement sin variantId.
- La parte pura (decidir la ruta y calcular el nuevo quantity) se testea aislada; la escritura se testea con
  un tx stub. Todos los flujos de abajo llaman a este helper (DRY).

### 4.2 Resolución de stock de un producto
`stockForProduct(product, inventory, variantInventory)`:
- Si `product.hasVariants` → stock total = suma de `VariantInventory` de sus variantes (y por-variante para
  el detalle).
- Si no → `Inventory` (como hoy).
- El low-stock compara contra `minStock` a nivel producto (suma) y opcionalmente marca variantes en 0.

### 4.3 Flujos que pasan a ser conscientes de variante
- **POS / Venta (`/sales/new`, POS):** un producto con `hasVariants` **obliga** a elegir variante antes de
  agregar la línea; `OrderItem.variantId` se guarda; precio de la línea = precio efectivo de la variante. Al
  cerrar/emitir la orden, descuenta vía `adjustStock` (variante).
- **Compras / recepción (`PurchaseInvoice`):** `InvoiceLineItem.variantId`; al pasar la factura a `RECEIVED`
  se incrementa el stock de la variante (o producto simple) vía `adjustStock`.
- **Transferencias (`Transfer`):** `TransferLineItem.variantId`; al confirmar, `adjustStock(-delta)` en
  origen y `adjustStock(+delta)` en destino, para la variante.
- **Ajuste de inventario:** ajuste por variante → `adjustStock` con el delta y `type=ADJUSTMENT`.
- **Reportes / valuación:** consideran stock por variante (costo efectivo por variante).

> Recetas y reposición local↔almacén (features de restaurante, módulo RESTAURANT) **no** se tocan: siguen a
> nivel producto. Un tenant con VARIANTS no las usa; un tenant RESTAURANT no crea variantes.

---

## 5. Módulo VARIANTS + gating

- El catálogo/registry de módulos: `VARIANTS` pasa de `COMING_SOON` a **`LIVE`** (registry `status`, seed, y
  update en DB). Los tenants HARDWARE/PHARMACY ya tienen `VARIANTS` en su preset (`TenantModule`) → al
  deployar ven la feature sin acción extra.
- **Gating:** la gestión de variantes (crear/editar variantes, definir atributos en el editor de producto) va
  detrás de `<ModuleGate module="VARIANTS">` (UI) y `requireModule('VARIANTS')` (APIs de variantes). Vender/
  comprar/transferir una variante que ya existe es core (no requiere el módulo para operar sobre variantes
  existentes) — solo la **creación/gestión** de variantes se gatea.
- **`liveModules` helper** (`src/lib/modules/liveModules.ts`): dado el catálogo, retorna solo los módulos con
  `status === 'LIVE'`. Se usa para que un `has(key)` de una feature real nunca dé true por un módulo
  `COMING_SOON` preset-activado. Cierra el hallazgo #4 del review de verticales. (No cambia `effectiveModules`;
  es un filtro adicional que la UI/guard de features "live" aplican.)

### 5.1 Funciones puras
- `variantDisplayName(attributes: Record<string,string>): string` → ej. `{Talla:"M",Color:"Rojo"}` →
  `"M / Rojo"`.
- `effectivePrice(variant, product)` y `effectiveCost(variant, product)` → `variant.x ?? product.x`.

---

## 6. UI

- **Editor de producto:** toggle "Este producto tiene variantes". Al activarlo: definir atributos
  (`variantOptions`: nombre + valores) y **agregar variantes una a una** eligiendo un valor por atributo, con
  SKU/barcode/precio/costo opcionales. **Sin** generador de matriz. Gateado por `VARIANTS`. Al desactivar el
  toggle con variantes existentes: confirmar (advertir que se ocultan/desactivan; no borrar stock silenciosamente).
- **Inventario:** un producto con variantes se muestra expandible → filas por variante con su stock; ajuste por
  variante. Productos simples igual que hoy.
- **POS / `/sales/new`:** al agregar un producto con variantes, selector de variante (por atributos); la línea
  muestra el nombre de variante y su precio efectivo.
- **Compras:** al agregar línea de un producto con variantes, selector de variante.
- **i18n:** claves nuevas (`variants.*`) en es/pt/en manteniendo la paridad (test del bloque E).

---

## 7. Testing (TDD)

**Puras:**
- `variantDisplayName` (orden estable de atributos, separador).
- `effectivePrice`/`effectiveCost` (override + fallback al producto).
- `adjustStock` ruteo: con variantId → toca VariantInventory; sin → Inventory; cálculo de nuevo quantity
  (con tx stub que captura upserts, sin DB real — mismo patrón que `applyVerticalPreset`).
- `stockForProduct`: hasVariants → suma de VariantInventory; simple → Inventory.
- `liveModules`: filtra COMING_SOON, deja LIVE.

**Guard:**
- `requireModule('VARIANTS')` bloquea la creación/gestión de variantes sin el módulo; permite con él.

**Flujos (integración de la lógica, con tx stub o datos de prueba):**
- Vender una variante descuenta la VariantInventory correcta y crea InventoryMovement con variantId.
- Recibir una compra (RECEIVED) con línea de variante incrementa esa variante.
- Transferir una variante descuenta origen e incrementa destino.
- Ajuste por variante registra el movement correcto.
- Producto simple: los mismos flujos siguen tocando `Inventory` (regresión — nada cambia).

---

## 8. Riesgos / decisiones

- **Overlay con tabla separada (`VariantInventory`):** elegido sobre `variantId` nullable en `Inventory` para
  no arrastrar el problema de nulos en índices únicos ni tocar el stock simple de otros verticales. Costo:
  dos rutas de stock, centralizadas en `adjustStock` para no dispersar la lógica.
- **Spec grande (6 superficies + UI):** el plan probablemente se ejecute por fases (modelo → helper/lógica →
  flujos → UI). Es una sola feature coherente, no se descompone en specs separados.
- **Precio efectivo:** variante hereda del producto si su precio es null — evita duplicar datos y permite
  variantes "iguales en precio, distintas en stock".
- **Desactivar variantes:** no se borra stock; se confirma y se desactivan variantes (`isActive=false`) para
  no perder histórico.
- **`liveModules`:** se agrega aquí porque VARIANTS deja de ser COMING_SOON y es el momento natural de
  endurecer el gating de módulos "live" vs "coming soon".

---

## 9. Criterios de aceptación

1. Un producto puede marcarse `hasVariants` con atributos y ≥1 variante (SKU/precio propios); productos
   simples quedan intactos.
2. El stock de variantes vive en `VariantInventory`; `Inventory` (simple) no cambia su esquema ni su
   comportamiento (regresión verde).
3. `adjustStock` rutea correctamente (variante vs simple) y todos los flujos lo usan.
4. Vender/comprar/transferir/ajustar una variante mueve el stock de la variante correcta y registra
   `InventoryMovement` con `variantId`.
5. POS/`/sales/new`/compras obligan a elegir variante para productos con variantes y usan el precio efectivo.
6. El módulo `VARIANTS` está `LIVE`; crear/gestionar variantes se gatea con `ModuleGate`/`requireModule`;
   los tenants HARDWARE/PHARMACY (preset) ya lo ven.
7. `liveModules` excluye los módulos `COMING_SOON`.
8. Paridad i18n verde; todos los tests (§7) pasan; `bun run build` OK.
