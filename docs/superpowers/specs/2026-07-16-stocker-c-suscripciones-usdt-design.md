# Spec — Stocker C: Suscripciones USDT

**Fecha:** 2026-07-16
**Estado:** Diseño aprobado, pendiente plan de implementación
**Depende de:** Bloque D1 (`Module.addOnPrice`, `TenantModule.priceAtActivation`), `Business.plan`. Multi-moneda (A) para formateo.
**Desbloquea:** monetización real del producto.

---

## 1. Objetivo

Cobrar la suscripción mensual de cada tenant **en USDT** vía **NOWPayments**, en **autoservicio**: el
cliente ve su suscripción, paga en su panel, y el pago (confirmado por IPN) **extiende el período**. Al
vencer sin pago hay **gracia y luego bloqueo**. El super-admin ve el estado y edita precios de plan.

Monto mensual = **precio del plan (DB) + Σ precios de add-ons activos** (de D1). Todo en USD, pagado en USDT.

---

## 2. Alcance

**Incluye:**
- Precios de plan en DB, editables por super-admin (hoy hardcodeados en el frontend).
- `Subscription` por tenant (estado + fin de período + gracia).
- Cálculo `computeMonthlyAmount` (testeado).
- Integración NOWPayments: checkout self-serve + webhook IPN (firma HMAC, idempotente).
- Historial de pagos (`BillingPayment`).
- Lifecycle por fechas (ACTIVE/GRACE/EXPIRED) + enforcement (guard: bloqueo en EXPIRED, banner en GRACE).
- **Pantalla "Mi suscripción" estilizada con el diseño de Stocker** (dark zinc-950 + emerald-500, profesional).
- Vista de estado por cliente en super-admin + extensión manual (soporte).

**NO incluye (futuro):**
- Recurrencia cripto automática (cripto no auto-debita; cada ciclo genera un checkout que el cliente paga).
- Planes anuales y prorrateo al cambiar plan/add-on (los cambios aplican al siguiente ciclo).
- Recordatorios por email/WhatsApp de vencimiento (marketing/futuro).
- Reembolsos automáticos.

---

## 3. Design system (panel de pago)
La pantalla "Mi suscripción" y el checkout DEBEN ir con el estilo de Stocker: fondo zinc-950
(`bg-background`), tarjetas `bg-card`, texto `text-foreground`/`text-muted-foreground`, acento
emerald-500 (`bg-primary`/`text-primary`), componentes `src/components/ui/*`. Layout limpio, jerárquico
y profesional: tarjeta de plan actual, desglose (plan + add-ons = total), estado con color (verde
ACTIVE / ámbar GRACE / rojo EXPIRED), botón "Pagar en USDT" prominente en emerald.

---

## 4. Modelo de datos (Prisma)

### 4.1 Precio de plan (DB, editable)
```prisma
model PlanPrice {
  id           String   @id @default(cuid())
  plan         Plan     @unique
  monthlyPrice Decimal  @default(0) @db.Decimal(18, 2)
  currency     Currency @default(USD)
  updatedAt    DateTime @updatedAt
  @@map("plan_prices")
}
```
Seed: STARTER/GROWTH/ENTERPRISE con los precios actuales (19.90 / 49.90 / 199.00) — editables luego.

### 4.2 Suscripción por tenant
```prisma
enum SubscriptionStatus { ACTIVE GRACE EXPIRED }

model Subscription {
  id               String             @id @default(cuid())
  businessId       String             @unique
  business         Business           @relation(fields: [businessId], references: [id], onDelete: Cascade)
  status           SubscriptionStatus @default(EXPIRED)
  currentPeriodEnd DateTime?
  graceDays        Int                @default(5)
  lastPaymentAt    DateTime?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt

  payments BillingPayment[]
  @@map("subscriptions")
}
```
Relación inversa en `Business`: `subscription Subscription?`.

### 4.3 Pagos de facturación
```prisma
model BillingPayment {
  id                String   @id @default(cuid())
  subscriptionId    String
  subscription      Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  amount            Decimal  @db.Decimal(18, 2)
  currency          String   @default("usd")      // moneda de precio
  payCurrency       String?                        // ej. "usdttrc20"
  provider          String   @default("nowpayments")
  providerPaymentId String   @unique               // idempotencia: 1 pago = 1 extensión
  status            String                         // waiting/confirming/finished/failed...
  paidAt            DateTime?
  createdAt         DateTime @default(now())
  @@map("billing_payments")
}
```

### 4.4 Aplicación a DB
`prisma db push` (aditivo). Seed de `PlanPrice` + una `Subscription` por business existente (status
EXPIRED, sin período) para que arranquen y paguen.

---

## 5. Cálculo del monto (núcleo, testeado)

`src/lib/billing/amount.ts`:
```ts
import Decimal from 'decimal.js'

/** Monto mensual = precio del plan + suma de precios de add-ons activos. */
export function computeMonthlyAmount(planPrice: Decimal | string | number, addonPrices: (Decimal | string | number)[]): Decimal
```
- Casos: solo plan (sin add-ons); plan + varios add-ons; add-on con precio 0; plan 0 (ENTERPRISE a
  medida podría ser 0 hasta pactar). Devuelve `Decimal`.
- Los `addonPrices` salen de `TenantModule.priceAtActivation` (o `Module.addOnPrice` como fallback) de
  los módulos add-on activos del tenant (source=ADDON, enabled=true).

---

## 6. Lifecycle (núcleo, testeado)

`src/lib/billing/status.ts`:
```ts
export type SubStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED'
/** Deriva el estado a partir de fechas. */
export function deriveStatus(currentPeriodEnd: Date | null, graceDays: number, now: Date): SubStatus
```
- `currentPeriodEnd == null` → EXPIRED.
- `now <= currentPeriodEnd` → ACTIVE.
- `currentPeriodEnd < now <= currentPeriodEnd + graceDays` → GRACE.
- `now > currentPeriodEnd + graceDays` → EXPIRED.
- Test (TDD): los 4 casos + límites exactos.

El estado se **recalcula de forma lazy** en cada request del guard (no requiere cron) y se persiste si
cambió. (Opcional futuro: cron diario para reportes; no necesario para el enforcement.)

---

## 7. NOWPayments

### 7.1 Config
Env propias de Stocker: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `APP_URL` (para callbacks).
Cliente aislado en `src/lib/billing/nowpayments.ts` (interfaz `createPayment`, `verifyIpnSignature`).

### 7.2 Checkout (self-serve)
`POST /api/billing/checkout`:
- Auth + resolución de tenant. Calcula el monto con `computeMonthlyAmount`.
- Llama NOWPayments crear invoice/payment: `price_amount = monto`, `price_currency = usd`,
  `pay_currency = usdttrc20` (o dejar que el usuario elija en NOWPayments), `ipn_callback_url =
  APP_URL/api/billing/webhook`, `order_id = businessId`, `success_url`/`cancel_url` al panel.
- Crea un `BillingPayment` (status inicial) con el `providerPaymentId` retornado.
- Devuelve la `invoice_url` para redirigir al checkout de NOWPayments.

### 7.3 Webhook IPN
`POST /api/billing/webhook`:
- **Verifica la firma HMAC-SHA512** del header `x-nowpayments-sig` contra el body ordenado, con
  `NOWPAYMENTS_IPN_SECRET`. Firma inválida → 401, no procesa.
- Busca el `BillingPayment` por `providerPaymentId`; actualiza su `status`.
- Si el estado es `finished`/`confirmed` **y no se había aplicado antes** (idempotencia por el propio
  registro): extiende la suscripción → `currentPeriodEnd = max(now, currentPeriodEnd) + 1 mes`,
  `status = ACTIVE`, `lastPaymentAt = now`, marca `paidAt`. Un IPN repetido del mismo pago no vuelve a
  extender (idempotente).
- Responde 200 rápido.

---

## 8. Enforcement (guard)

`src/lib/billing/guard.ts` + integración en el middleware/layout autenticado:
- En cada request de la app, cargar la `Subscription` del tenant, `deriveStatus`, persistir si cambió.
- **EXPIRED** → redirigir a `/billing` (pantalla de pago); todo lo demás bloqueado excepto:
  `/billing`, `/api/billing/*`, auth/logout, `/api/health`.
- **GRACE** → dejar pasar, pero exponer un flag para mostrar **banner** de aviso ("Tu suscripción venció,
  paga antes de {fecha} para no perder acceso").
- **SUPER_ADMIN exento** (nunca bloqueado).
- `GET /api/me/subscription` → estado + monto + próximo vencimiento + desglose (para el panel).

---

## 9. Pantallas / UI

1. **"Mi suscripción"** (`/billing`, estilizada con Stocker): tarjeta con plan actual, desglose
   plan + add-ons = **total mensual**, estado con color, `currentPeriodEnd`, y botón **"Pagar en USDT"**
   → llama `/api/billing/checkout` y redirige a `invoice_url`. Muestra historial de pagos.
2. **Banner de gracia** (componente): visible en el layout cuando el estado es GRACE.
3. **Super-admin → Suscripciones** (reemplaza el hardcoded): estado real por cliente, y edición de
   precios de plan (`GET/PUT /api/admin/plan-prices`). Botón "Extender 1 mes" manual (soporte).

---

## 10. Manejo de errores
- NOWPayments caído al crear checkout → error claro en el panel, no crea período.
- IPN con firma inválida → 401, se ignora (log).
- IPN de un `providerPaymentId` desconocido → 404 (no crashea).
- Doble IPN `finished` → segunda vez no extiende (idempotente).
- Falta de `Subscription` para un business → se crea perezosamente en EXPIRED.

---

## 11. Testing (TDD)
- **Unit:** `computeMonthlyAmount` (§5), `deriveStatus` (§6, 4 casos + límites), `verifyIpnSignature`
  (firma válida/ inválida con secret conocido), extensión de período (period math + idempotencia).
- **Integración:** un IPN `finished` extiende 1 mes y pone ACTIVE; repetirlo no suma otro mes; un tenant
  EXPIRED es redirigido por el guard; SUPER_ADMIN nunca bloqueado.

---

## 12. Riesgos / decisiones abiertas
- **Cuenta NOWPayments de Stocker:** requiere su propia API key + IPN secret (no reusar la de Eluvex).
  A cargar en env al desplegar. Referencia de integración: [[reference_nowpayments]].
- **`pay_currency`:** se fija `usdttrc20` por costo bajo; se puede permitir elección en NOWPayments.
- **Reloj/zona horaria:** todo en UTC; `deriveStatus` recibe `now` inyectable (testeable).
- **Add-on prices:** se usa `priceAtActivation` (congelado en D1) para que el monto sea estable; si es
  null, fallback a `Module.addOnPrice` actual.

---

## 13. Criterios de aceptación
1. El super-admin edita el precio de un plan y el monto del tenant lo refleja.
2. Un tenant ve su desglose (plan + add-ons) y monto mensual correcto en `/billing` con estilo Stocker.
3. "Pagar en USDT" abre el checkout de NOWPayments por el monto correcto.
4. Un IPN `finished` válido extiende el período 1 mes y pone ACTIVE; repetirlo NO suma otro mes.
5. Un IPN con firma inválida es rechazado (401).
6. Un tenant EXPIRED es redirigido a `/billing`; en GRACE ve banner pero puede operar; SUPER_ADMIN nunca se bloquea.
7. `computeMonthlyAmount` y `deriveStatus` pasan sus tests; schema aplicado a la DB comercial.
