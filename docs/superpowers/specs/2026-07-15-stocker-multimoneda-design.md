# Spec — Stocker Multi-moneda (Bloque A del núcleo comercial)

**Fecha:** 2026-07-15
**Estado:** Diseño aprobado, pendiente plan de implementación
**Depende de:** —
**Desbloquea:** Facturación no fiscal + PDF (B), Suscripciones USDT (C), reportes multi-moneda
**Investigación base:** [`2026-07-15-stocker-comercial-investigacion-mercado.md`](./2026-07-15-stocker-comercial-investigacion-mercado.md)

---

## 1. Objetivo

Dar a Stocker soporte nativo de **múltiples monedas (VES / BRL / USD, extensible)** con
**tasa de cambio diaria**, de forma que cualquier cliente —en cualquier país— pueda fijar precios,
vender, cobrar y reportar en su moneda, viendo simultáneamente una moneda secundaria (ej. `$10 / Bs 400`).

Es el **cimiento económico** del producto comercial: facturación, POS, suscripciones y reportes se
apoyan en él. Se diseña como **capacidad gateable por tenant** (encaja con el bloque D de feature flags).

### Principio rector
> Toda cantidad de dinero que se persiste guarda `{ amount, currency, rateToBase }`.
> La tasa se **congela** en la transacción. Los reportes históricos nunca cambian aunque cambie la tasa de hoy.

### Posicionamiento (ya decidido)
Stocker es **gestión interna + comprobante NO fiscal**. No emite factura fiscal homologada SENIAT;
por eso no requiere homologación y es vendible en cualquier país desde el día uno. La conversión y
visualización multi-moneda son de gestión, no de emisión fiscal.

---

## 2. Alcance

**Incluye:**
- Moneda base por tenant + monedas habilitadas + moneda secundaria de visualización.
- Motor de tasas: auto (BCV para VES, forex para BRL) con override manual por tenant.
- Congelado de tasa en cada transacción.
- Helper único de conversión + formato/redondeo por moneda.
- Visualización dual configurable (POS, listas, dashboard, comprobante).
- Pasos de tour para las nuevas pantallas de moneda.
- Config de despliegue en Coolify (prerequisito de infra, hoy inexistente).

**NO incluye (specs propios):**
- PDF del comprobante de venta → Bloque B.
- Cobro de la suscripción en USDT → Bloque C.
- Arquitectura general de feature flags/módulos por cliente → Bloque D (este bloque solo se
  *expone* como flag).
- Auto-traducción i18n → Bloque E.
- Pago mixto en POS (parte en $, parte en Bs) → se implementa en B, pero el modelo de datos de
  este bloque ya lo soporta.

---

## 3. Design system (a respetar en toda UI nueva)

Tema oscuro existente de Stocker — **no** inventar estilos nuevos:

| Token | Valor | Uso |
|-------|-------|-----|
| `--background` | zinc-950 `#09090b` | Fondo app |
| `--card` | `#0e0e10` | Tarjetas/paneles |
| `--foreground` | `#fafafa` | Texto principal |
| `--primary` / `--ring` | emerald-500 `hsl(160 84% 45%)` | Acciones, foco, resaltado de marca |
| `--border` | zinc-800 | Bordes |
| `--destructive` | `#dc2626` | Errores/eliminar |

- **Componentes:** Radix UI + los `components/ui/*` existentes. Reutilizar, no duplicar.
- **Layout:** limpio, jerárquico y responsive. El monto en **moneda ancla** es el dato primario
  (mayor peso visual); la secundaria va como texto `muted-foreground` debajo o al lado. Nada de
  ruido: máximo dos monedas visibles a la vez salvo pantalla de detalle.
- **Mobile/POS:** respetar los fixes ya aprendidos (min-w-0, overflow-x-hidden) para no romper en
  pantallas chicas.

---

## 4. Modelo de datos (Prisma)

### 4.1 `Business` (tenant) — nuevos campos
```prisma
model Business {
  // ...
  baseCurrency       Currency   @default(USD)   // moneda ancla del tenant
  secondaryCurrency  Currency?                   // moneda para la vista dual (null = sin dual)
  enabledCurrencies  Currency[] @default([USD])  // monedas operables por este tenant
  multiCurrency      Boolean    @default(false)  // flag de capacidad (gate bloque D)
  rateSource         RateSource @default(MANUAL) // fuente por defecto de tasas
}

enum Currency { USD VES BRL }        // extensible
enum RateSource { AUTO_BCV AUTO_FOREX MANUAL }
```

### 4.2 Tasas de cambio
```prisma
model ExchangeRate {
  id         String     @id @default(cuid())
  businessId String
  business   Business   @relation(fields: [businessId], references: [id], onDelete: Cascade)
  currency   Currency                       // moneda cotizada respecto a baseCurrency
  rate       Decimal    @db.Decimal(18, 6)  // 1 unidad de `currency` = `rate` en baseCurrency
  date       DateTime   @db.Date
  source     RateSource
  createdAt  DateTime   @default(now())

  @@unique([businessId, currency, date])
  @@index([businessId, currency, date])
}
```
- Una fila por (tenant, moneda, día). `rate` interpreta: **cuántas unidades de la moneda base vale 1
  unidad de `currency`.** (Definición única y documentada para evitar inversiones de tasa.)
- Si un día no hay fila nueva → se arrastra la última vigente (nunca cero).

### 4.3 Congelado de tasa en transacciones
Los precios de catálogo (`Product.salePrice`, `Product.costPrice`) siguen en `Decimal` y **se
interpretan en `baseCurrency` del tenant** (no cambia el tipo, sí la semántica — documentar).

Las tablas transaccionales que persisten montos ganan tres campos (patrón repetido):
`Order`/`OrderItem`, `Payment`, comprobantes, `InventoryMovement` con valor, líneas de venta:
```prisma
  currency   Currency          // moneda en que se registró la transacción
  rateToBase Decimal @db.Decimal(18, 6)  // tasa congelada (currency -> baseCurrency) al momento
  // amount ya existe
```
> Con esto, `Payment` puede tener distinta `currency` que su `Order` → habilita pago mixto (bloque B)
> sin rediseño.

### 4.4 Migración
- Prisma migrate; backfill: tenants existentes → `baseCurrency = USD`, `enabledCurrencies = [USD]`,
  `multiCurrency = false`, transacciones históricas → `currency = USD`, `rateToBase = 1`.
- Migración reversible y probada en staging antes de prod (lección Coolify/Prisma: orden de
  migraciones y backfill antes de activar el flag).

---

## 5. Motor de tasas

- **Job diario** (cron) por tenant con `multiCurrency = true`:
  - VES → tasa oficial **BCV** (fuente `AUTO_BCV`).
  - BRL → API forex (fuente `AUTO_FOREX`).
  - Escribe/actualiza la fila `ExchangeRate` del día.
- **Override manual:** el admin del tenant edita la tasa del día en una pantalla dedicada; la fila
  pasa a `source = MANUAL` y el job no la pisa ese día.
- **Fallback:** sin tasa nueva → arrastrar la última; nunca operar con tasa 0/null.
- **Aislamiento:** el fetch externo se encapsula en un provider (`lib/rates/*`) con interfaz común
  `getRate(currency, date): Decimal`, para poder cambiar de fuente sin tocar el resto.
- **Resiliencia:** fallo de API externa no rompe la operación (se arrastra la última tasa + se
  notifica al admin del tenant).

---

## 6. Conversión, formato y redondeo

- **Un solo helper** `lib/currency/convert.ts`:
  - `convert(amount, from, to, rates): Decimal`
  - `format(amount, currency, locale): string`
  - Cálculos con `Decimal` (Prisma/decimal.js), **nunca** `number` de JS → elimina el riesgo actual
    de floating-point.
- **Redondeo/decimales por moneda** (configurable, defaults):
  - USD, BRL → 2 decimales.
  - VES → redondeo a entero por defecto (configurable por tenant).
- **Formato por locale** (ligado a i18n, bloque E): separadores y símbolo correctos por moneda.
- Prohibido hacer aritmética monetaria fuera del helper (regla de revisión de código).

---

## 7. Visualización (dual configurable)

- El tenant elige el **par** ancla + secundaria (ej. USD + VES).
- **Dónde aparece la vista dual:** POS, listas de productos, carrito/orden, dashboard y comprobante.
- **Jerarquía visual:** ancla prominente; secundaria en `muted-foreground`. La **tasa aplicada** se
  muestra de forma discreta en el pie del comprobante y en el detalle de la orden.
- Selector de moneda de trabajo accesible (header/POS) para tenants con varias monedas habilitadas.
- Tenant mono-moneda: se muestra una sola, sin selector ni dual (UI se auto-simplifica por el flag).

### Pantallas nuevas / tocadas
1. **Ajustes → Monedas** (nuevo): moneda base, secundaria, monedas habilitadas, fuente de tasa.
2. **Ajustes → Tasas del día** (nuevo): ver/editar la tasa diaria (override manual), historial.
3. POS, listas de productos, dashboard, comprobante: mostrar dual.

---

## 8. Tour del sistema (estilo Stocker)

Onboarding interactivo con el patrón **driver.js** (ya usado en Vynta CRM), estilizado con los tokens
de Stocker (fondo `--card`, resaltado `--primary` emerald, texto `--foreground`):

- **Alcance de este bloque:** pasos del tour que cubran las pantallas nuevas de moneda —
  (1) elegir moneda base, (2) habilitar monedas, (3) ver/editar la tasa del día, (4) leer la vista
  dual en POS/comprobante.
- **Infra del tour:** se crea un pequeño framework reutilizable (`components/tour/*`) que otros
  bloques (B/C/D/E) irán ampliando con sus propios pasos → un tour del sistema completo y coherente.
- Se dispara en el primer login del tenant y es reejecutable desde "Ayuda".
- Nota PWA: evitar diálogos nativos; usar overlay in-app (lección PWA ya registrada).

---

## 9. Despliegue (Coolify)

Hoy **no hay** Dockerfile ni config Coolify → prerequisito de este bloque:
- `Dockerfile` multi-stage para Next.js 16 (build standalone) + `.dockerignore`.
- Variables de entorno: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, credenciales de la(s)
  API(s) de tasas, y (a futuro) NOWPayments.
- Migraciones Prisma en el arranque del deploy, en orden, antes de exponer la app (lección Coolify).
- App en Coolify con su dominio; healthcheck en `/api/health` (crear si no existe).
- El cron de tasas: job en Coolify (scheduled) o endpoint protegido disparado por scheduler.

> Nota: la configuración de infra Coolify completa puede extraerse a su propio spec si crece; aquí se
> deja el mínimo para desplegar el bloque A.

---

## 10. Testing

- **Unit (TDD):** helper `convert`/`format` — conversión ida/vuelta, redondeo por moneda, arrastre de
  tasa, tasa faltante, congelado correcto. Casos borde: tasa 0, moneda no habilitada, base == secundaria.
- **Motor de tasas:** provider mockeado — auto vs override manual vs fallback.
- **Integración:** una venta registra `currency` + `rateToBase` congelados; reporte histórico no cambia
  al mutar la tasa de hoy.
- **Migración:** backfill de tenants y transacciones existentes verificado en staging.

---

## 11. Riesgos / decisiones abiertas

- **Fuente BCV:** confirmar API/fuente estable para la tasa BCV (o scraping + fallback). A validar en
  el plan.
- **Extensibilidad de `Currency`:** enum vs tabla. Se arranca con enum (USD/VES/BRL); si se necesitan
  muchas monedas, migrar a tabla `Currency` es un cambio acotado.
- **Precios de catálogo al cambiar `baseCurrency`:** cambiar la moneda base de un tenant con catálogo
  cargado requiere una conversión masiva explícita (asistente), no automática. Se documenta como
  operación deliberada.

---

## 12. Criterios de aceptación

1. Un tenant configura base=USD, secundaria=VES y ve `$ / Bs` en POS y comprobante con la tasa del día.
2. El admin puede sobrescribir la tasa del día; la venta usa la tasa vigente y la congela.
3. Cambiar la tasa mañana no altera el total de una venta de ayer (reporte histórico estable).
4. Un tenant mono-moneda no ve UI multi-moneda (flag off → UI simplificada).
5. Toda aritmética monetaria pasa por el helper `Decimal`; sin `number` en cálculos de dinero.
6. La app despliega en Coolify con migraciones aplicadas y healthcheck verde.
7. El tour guía por las 4 pantallas de moneda con el estilo de Stocker.
