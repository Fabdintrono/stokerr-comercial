# Spec — Stocker B: Comprobante de venta no fiscal + PDF

**Fecha:** 2026-07-16
**Estado:** Diseño aprobado, pendiente plan de implementación
**Depende de:** Bloque A (multi-moneda — dual + tasa congelada en Order/Payment). Order/OrderItem/Payment existentes.
**Desbloquea:** envío del PDF por email/WhatsApp (Bloque C/marketing); base de clientes para CRM (módulo futuro).

---

## 1. Objetivo

Emitir un **comprobante de venta NO fiscal** en **PDF real** (servidor), generado tanto desde una
**venta POS** como desde una **factura manual con cliente**. Multi-moneda dual (Bloque A), branding por
tenant, numeración secuencial por tenant. No fiscal: sin homologación SENIAT, sin IGTF ni número de
control fiscal (decisión de posicionamiento ya tomada).

---

## 2. Alcance

**Incluye:**
- `Customer` reutilizable (lista de clientes por tenant) + CRUD.
- La venta se modela reutilizando **`Order`** (un solo flujo de stock); se le añaden `customerId`,
  `docNumber`, `issuedAt`.
- Pantalla **"Nueva factura"** (crea una Order sin mesa, con cliente e ítems).
- Numeración secuencial por tenant con prefijo configurable, asignada al emitir.
- **Motor PDF servidor** con `@react-pdf/renderer` + endpoint de stream.
- Branding por tenant (logo + datos del negocio) en `Business`.
- Impuesto opcional/informativo (no fiscal).
- Re-descarga del comprobante desde el historial de ventas.

**NO incluye (specs/bloques propios):**
- Facturación fiscal SENIAT (no aplica).
- Envío automático del PDF por email/WhatsApp → Bloque C / marketing.
- CRM avanzado (campañas, seguimiento) → módulo CRM futuro. Aquí solo el registro básico de cliente.
- Cobro de la venta en cripto (el POS ya registra pagos; USDT de suscripción es Bloque C).

---

## 3. Design system
Tema oscuro (zinc-950 + emerald-500), componentes `src/components/ui/*`, patrón de las pantallas
existentes de POS (`src/app/(pos)/pos/page.tsx`) y de listados. El PDF NO usa el tema oscuro: es un
documento imprimible en fondo claro, profesional.

---

## 4. Modelo de datos (Prisma)

### 4.1 `Customer` (nuevo)
```prisma
model Customer {
  id         String   @id @default(cuid())
  businessId String
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  name       String
  taxId      String?          // RIF / cédula / documento
  address    String?
  phone      String?
  email      String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  orders Order[]
  @@index([businessId])
  @@map("customers")
}
```
Añadir relación inversa `customers Customer[]` en `Business`.

### 4.2 Campos nuevos en `Order`
```prisma
  customerId String?
  customer   Customer? @relation(fields: [customerId], references: [id])
  docNumber  String?   // número de comprobante emitido (ej. "F-000123"); null hasta emitir
  issuedAt   DateTime? // fecha de emisión del comprobante
```
- El `Order` sigue siendo la venta (descuenta stock como hoy). Una **factura manual** es un `Order`
  creado fuera del POS: sin `tableId`, con `customerId` e ítems, sobre una `location` elegida (para stock).

### 4.3 Numeración por tenant (en `Business`)
```prisma
  docPrefix     String @default("F-")
  docNextNumber Int    @default(1)   // contador transaccional; se incrementa al emitir
```
- Al emitir un comprobante: en una **transacción**, leer+incrementar `docNextNumber` del tenant y
  formatear `docNumber = docPrefix + zeroPad(n, 6)` (ej. `F-000123`). Garantiza secuencia sin huecos
  ni colisiones por tenant.

### 4.4 Branding por tenant (en `Business`)
```prisma
  logoUrl String?
  address String?
  phone   String?
  taxId   String?   // dato del negocio (no fiscal)
```

### 4.5 Aplicación a DB
`prisma db push` contra la Supabase comercial (aditivo). Sin pérdida de datos.

---

## 5. Cálculo de totales (núcleo, testeado)

`src/lib/sales/totals.ts`:
```ts
import Decimal from 'decimal.js'

export interface SaleLineInput { quantity: number | string; unitPrice: number | string; vatRate?: number | string }
export interface SaleTotals { subtotal: Decimal; tax: Decimal; total: Decimal }

/** Suma líneas. Si taxEnabled=false, tax=0 y total=subtotal (no fiscal, impuesto informativo). */
export function computeTotals(lines: SaleLineInput[], taxEnabled: boolean): SaleTotals { /* ... */ }
```
Reglas:
- `subtotal` = Σ(quantity × unitPrice) con `Decimal`.
- `tax` = taxEnabled ? Σ(line_subtotal × vatRate/100) : 0.
- `total` = subtotal + tax.
Casos de prueba: sin impuesto (total=subtotal); con impuesto por línea; líneas mixtas; cantidades
decimales; redondeo por moneda (reusa `formatMoney`/decimales del Bloque A al presentar).

---

## 6. Emisión + numeración (servidor)

`src/lib/sales/issue.ts`:
```ts
/** Asigna docNumber e issuedAt a una Order de forma transaccional. Idempotente: si ya tiene docNumber, lo devuelve. */
export async function issueDocument(prisma, orderId): Promise<{ docNumber: string; issuedAt: Date }>
```
- Transacción: `SELECT` Order (+ businessId), si ya tiene `docNumber` → devolver (idempotente);
  si no, incrementar `Business.docNextNumber` y setear `docNumber`/`issuedAt` en la Order.
- Test (TDD): primera emisión asigna F-000001; segunda orden del mismo tenant F-000002; re-emitir la
  misma orden NO cambia el número (idempotente); dos tenants tienen secuencias independientes.

---

## 7. Motor PDF

- Librería: **`@react-pdf/renderer`** (server-side, Node runtime).
- `src/components/pdf/SaleDocumentPdf.tsx` — componente que recibe un DTO plano
  (`SaleDocumentData`: negocio {name, logoUrl, address, phone, taxId}, cliente?, líneas, totales,
  moneda ancla + secundaria + tasa, docNumber, issuedAt) y renderiza el layout:
  - Encabezado: logo + datos del negocio (izq), "COMPROBANTE DE VENTA" + número + fecha (der).
  - Datos del cliente (si hay).
  - Tabla de ítems: descripción, cantidad, precio unit, total (en moneda ancla).
  - Totales: subtotal, impuesto (si aplica), **total en moneda ancla + equivalente en secundaria + tasa**.
  - Pie: **"Documento no fiscal"** + datos de contacto.
- `src/lib/pdf/renderSaleDocument.ts` — `renderToBuffer(<SaleDocumentPdf data={...} />)`.
- Endpoint `GET /api/sales/[orderId]/pdf`:
  - `export const runtime = 'nodejs'` (react-pdf necesita Node).
  - Auth + resolución de `businessId` (patrón `X-Business-Id`/cookie existente); la Order debe
    pertenecer al tenant (403 si no).
  - Llama `issueDocument` (asigna número si falta) → arma el DTO → `renderSaleDocument` → responde
    `application/pdf` con `Content-Disposition: inline; filename="<docNumber>.pdf"`.

---

## 8. Pantallas / UI

1. **Clientes** (`/warehouse/customers` o el área correspondiente): listar/crear/editar `Customer`.
   API `GET/POST/PUT /api/customers`.
2. **Nueva factura** (`/sales/new`): elegir cliente (o crear rápido), agregar ítems (buscador de
   productos), elegir location, ver totales dual, y **Emitir** → crea la Order + abre el PDF.
3. **POS**: al cerrar/cobrar una orden, botón **"Comprobante"** → abre `GET /api/sales/[orderId]/pdf`.
4. **Historial de ventas**: en cada orden emitida, botón para **re-descargar** el PDF (mismo endpoint,
   idempotente).
5. **Ajustes → Negocio**: editar branding (`logoUrl`, `address`, `phone`, `taxId`) y `docPrefix`.

---

## 9. Manejo de errores
- Order inexistente / de otro tenant → 404/403 (no filtra datos entre tenants).
- Fallo de render PDF → 500 con mensaje claro; no deja la Order en estado inconsistente (la emisión de
  número es transaccional y previa, idempotente, así que reintentar es seguro).
- Sin logo → el PDF se renderiza sin logo (no rompe).

---

## 10. Testing (TDD)
- **Unit:** `computeTotals` (§5) y `issueDocument` (§6, con prisma mockeado/transacción simulada).
- **Integración:** emitir dos comprobantes del mismo tenant da números consecutivos; re-emitir es
  idempotente; una Order de tenant A no es accesible por tenant B (403).
- **PDF:** `renderSaleDocument` produce un Buffer no vacío con un DTO de ejemplo (smoke test).

---

## 11. Riesgos / decisiones abiertas
- **`@react-pdf/renderer` en Next 16 (Turbopack):** requiere runtime Node en el endpoint; validar en el
  plan que el build/standalone lo empaqueta bien (posible `serverExternalPackages`). Fallback: `pdfkit`.
- **Logo:** por ahora `logoUrl` (URL/base64). Subida de archivos queda fuera; se pega una URL. Mejora futura.
- **Order como venta universal:** se acepta la carga POS de `Order` (status/tableId opcional) a cambio
  de un solo flujo de stock. Si a futuro estorba, se extrae un modelo `Sale` — no ahora (YAGNI).

---

## 12. Criterios de aceptación
1. Un tenant crea un `Customer` y lo reutiliza en una factura manual.
2. "Nueva factura" crea una Order (sin mesa), descuenta stock y emite un PDF con número `F-000001`.
3. El PDF muestra branding del negocio, cliente, ítems, y **total dual (ancla + secundaria + tasa)**, con pie "Documento no fiscal".
4. La segunda emisión del tenant es `F-000002`; re-descargar la primera sigue siendo `F-000001` (idempotente).
5. Un usuario del tenant B no puede descargar el PDF de una Order del tenant A (403).
6. `computeTotals` e `issueDocument` pasan sus tests; el endpoint responde `application/pdf`.
7. Schema aplicado a la DB comercial vía `db push`.
