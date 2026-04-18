# Stocker — Changelog de Mejoras

**Sistema:** Gestión de inventario y POS para restaurantes en Portugal  
**Stack:** Next.js 14 · TypeScript · Prisma · PostgreSQL (Supabase) · Tailwind CSS  
**Puerto:** 3001 · **Comando:** `stocker [start|stop|restart|dev|build|log|status]`

---

## Sesión 2026-04-14

### 1. Super Admin — Panel completo con datos reales

**APIs creadas:**

| Endpoint | Métodos | Descripción |
|----------|---------|-------------|
| `/api/admin/clients` | GET, POST | Lista negocios / crea Business + Owner + Depósito + 6 categorías |
| `/api/admin/clients/[id]` | GET, PATCH, DELETE | Detalle, actualizar plan/límites, soft delete |

**Páginas migradas (mock → real):**
- `/super-admin/clients` — CRUD completo con `ClientModal` (negocio + owner + depósito en una transacción)
- `/super-admin/licenses` — gestión de planes y límites con edición inline
- `/super-admin/subscriptions` — vista de suscripciones con ingresos mensuales estimados

---

### 2. Gestión de Locales

**APIs corregidas:** `/api/locations` (GET/POST) y `/api/locations/[id]` (PUT/DELETE)  
- Verificación del límite `maxRestaurants` por plan  
- Campo `isActive` alineado con schema

**Página nueva:** `/warehouse/locations` — crear restaurantes y depósitos, editar, activar/desactivar

---

### 3. Transferencias entre sedes — Fase 2

**APIs creadas:**

| Endpoint | Métodos | Descripción |
|----------|---------|-------------|
| `/api/transfers` | GET, POST | Lista / crea transferencia PENDING con line items |
| `/api/transfers/[id]` | GET, PATCH, DELETE | Detalle / completar (mueve stock) o cancelar / eliminar |

**Lógica de stock:** al completar, deduce del origen y suma en destino (upsert) + crea `InventoryMovements`.

**Página migrada:** `/warehouse/transfers` — flujo completo: seleccionar origen/destino/productos, completar, cancelar.

---

### 4. Fixes de schema y APIs

- `TransferLineItem` relacionado con `Product`
- `/api/inventory/movement` POST: eliminados campos inexistentes
- `/api/inventory/movement` GET: `active` → `isActive`
- Alias `stocker` creado en `.bashrc`

---

## Sesión 2026-04-16

### 5. StokerPOS — Sistema de caja completo

**APIs creadas:**

| Endpoint | Métodos | Descripción |
|----------|---------|-------------|
| `/api/tables` | GET, POST | Mesas por location con pedidos abiertos |
| `/api/tables/[id]` | PUT | Editar mesa |
| `/api/orders` | GET, POST | Crear pedido (número auto P-YYYYMMDD-NNN), listar con filtros |
| `/api/orders/[id]` | GET, PATCH, DELETE | Detalle / add_items, pay (multi-pago), cancelar |
| `/api/cash-register` | GET, POST, PATCH | Abrir/cerrar caja, calcular totales del turno |
| `/api/dashboard/restaurant` | GET | KPIs del día (ventas, pedidos, mesas, caja) |
| `/api/reports/restaurant` | GET | Ventas por día/hora/método/producto |

**Interfaz StokerPOS (`/pos`):**
- Pantalla completa sin sidebar, optimizada para touch
- Panel izquierdo (60%): categorías + buscador + grid 4 columnas de productos
- Panel derecho (40%): carrito con +/−, subtotal, IVA 23%, descuento, total
- Barra inferior: MESAS · NUEVA COMANDA · DESCUENTO · IMPRIMIR · DIVIDIR · CANCELAR · COBRAR
- Overlay de mesas: estado libre/ocupada, carga pedido existente al seleccionar
- Overlay de cobro: 4 métodos (Efectivo / Tarjeta / MB WAY / Multibanco)
- Overlay dividir cuenta: modo partes iguales (N personas, cada una paga su método) o por ítem (asignación con color coding)
- Overlay descuento: presets 5/10/15/20% o valor libre

**Otras páginas completadas:**
- `/restaurant` — Dashboard KPIs reales
- `/restaurant/caja` — Apertura y cierre de caja
- `/restaurant/reports` — Reportes: ventas por período, método, hora pico, top productos
- `/restaurant/tables` — Gestión de mesas
- `/warehouse/inventory` — Tabs: Stock / Movimientos / Alertas de stock bajo
- `/super-admin/analytics` — Analytics reales de plataforma
- `/super-admin/support` — Actividad del sistema
- `/super-admin/settings` — Configuración global

---

## Sesión 2026-04-17

### 6. POS — Tres funcionalidades pendientes implementadas

#### Imprimir recibo
- `window.open()` + `window.print()` con HTML de ticket (fuente monoespaciada, 300px)
- Incluye: local, mesa, cajero, items, descuento, IVA, total, métodos de pago, nota
- Disponible desde el botón IMPRIMIR del POS y desde el historial (reimprimir)

#### Nota en pedido
- Campo `notes String?` añadido al modelo `Order` en schema + DB
- API: `POST /api/orders` acepta `notes`; `PATCH /api/orders/[id]` con `action: "update_note"`
- UI: botón 📄 en el header del panel derecho (se pone ámbar cuando hay nota activa)
- Badge con el texto de la nota visible en el panel del pedido
- Nota incluida en el recibo impreso y en la vista de cocina

#### Historial de pedidos pagados
- Overlay "HISTORIAL" en barra inferior del POS
- Lista todos los pedidos PAID del día con hora, mesa, cajero y total
- Clic en pedido → detalle con items y métodos de pago
- Botón "Reimprimir" desde el detalle

---

### 7. Rol WAITER — App de Mesonero

#### Schema y DB
- Nuevo valor `WAITER` en el enum `Role` de Prisma
- Todos los endpoints de usuarios actualizados para aceptar el rol

#### App del Mesonero (`/waiter`)
- Pantalla completa táctil (idéntica estructura al POS, colores naranja)
- Panel de pedido con dos secciones:
  - **"Ya enviado"** — items que ya están en BD (gris, no editables)
  - **"Nuevos items"** — items pendientes de enviar (naranja, con +/−/eliminar)
- Botón 📄 para agregar nota al pedido
- Barra inferior: MESAS · NUEVA COMANDA · LIMPIAR · **ENVIAR A COCINA**
- Si la mesa tiene pedido abierto → añade items al existente; si está libre → crea pedido nuevo
- El mesonero **no puede cobrar** (solo tomar y enviar pedidos)

#### Gestión de Personal (`/restaurant/staff`)
- Accesible desde el sidebar del Restaurant Manager (ítem "Personal")
- Stats: conteo de mesoneros / cajeros / gerentes activos
- Tabla con nombre, rol, locales asignados y estado (activo/inactivo)
- Modal de creación: selección visual de rol, email, contraseña, teléfono, asignación a locales
- Botón activar/desactivar por usuario

#### Flujo completo
1. Gerente entra a `/restaurant/staff` → crea mesonero con email y contraseña
2. Mesonero hace login → redirigido automáticamente a `/waiter`
3. Selecciona mesa → añade productos → "ENVIAR A COCINA"
4. Cajero en el POS ve el pedido en la mesa y procesa el cobro

---

### 8. Pantalla de Cocina + QR por Mesa

#### Cambios de schema
| Campo | Modelo | Tipo | Descripción |
|-------|--------|------|-------------|
| `kitchenToken` | `Location` | `String @unique` | Token UUID para la pantalla de cocina |
| `qrToken` | `Table` | `String @unique` | Token UUID para el QR de cada mesa |

Ambos generados por PostgreSQL con `gen_random_uuid()` — no secuenciales, no predecibles.

#### APIs públicas (sin autenticación)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/public/kitchen/[token]` | GET | Pedidos OPEN/PREPARING con items (para cocina) |
| `/api/public/kitchen/[token]/order/[id]` | PATCH | Marcar pedido como PREPARING o SERVED |
| `/api/public/mesa/[token]` | GET | Cuenta activa de la mesa (read-only para cliente) |

#### APIs autenticadas para gestión de tokens

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/locations/[id]/regenerate-token` | POST | Regenera `kitchenToken` (invalida URL anterior) |
| `/api/tables/[id]/regenerate-token` | POST | Regenera `qrToken` de mesa (invalida QR anterior) |

#### Pantalla de Cocina (`/cocina/[token]`)
- **Pública** — sin login, para TV o PC fija en cocina
- Grid de tarjetas de pedido, ordenadas por antigüedad
- Cada tarjeta muestra: mesa, número de pedido, items en letra grande (cantidad prominente), nota si existe
- Tiempo transcurrido desde la creación del pedido
- **Alerta roja** si el pedido supera 15 minutos sin ser servido
- Estados visuales: **Nuevo** (ámbar) → **Preparando** (azul pulsante) → **Listo** (desaparece)
- Botones de acción por tarjeta: "Preparando" y "Listo"
- **Polling automático cada 12 segundos** — no requiere recargar

#### Vista del Cliente (`/mesa/[token]`)
- **Pública** — el cliente escanea el QR con su móvil
- Muestra la cuenta activa de la mesa: items, cantidades, precios por unidad y total por línea
- Totales: subtotal + IVA 23% + total final
- Estado del pedido en tiempo real (recibido / en preparación / servido)
- Nota del pedido visible si existe
- Mensaje: "Para pagar, solicita la cuenta a tu mesonero" — sin acciones
- **Polling automático cada 20 segundos**

#### Gestión de QRs desde `/restaurant/tables`
- Cada mesa muestra botón **"QR"** → modal con:
  - Código QR generado en canvas (fondo oscuro para impresión)
  - URL completa del QR
  - Botón **Descargar PNG**
  - Botón **Regenerar token** (con advertencia de que invalida el QR anterior)
- Banner superior con URL de la pantalla de cocina:
  - Botón **Copiar URL**
  - Botón **Abrir en nueva pestaña**

#### Seguridad de páginas públicas
- Tokens UUID v4 generados por PostgreSQL — no basados en nombres, IDs ni secuencias
- Las APIs públicas no exponen IDs internos de la BD ni datos sensibles
- Solo se devuelve lo estrictamente necesario (nombre de producto, cantidad, nota, estado)
- Tokens regenerables desde el panel del gerente en caso de compromiso
- Middleware de Next.js excluye `/cocina` y `/mesa` del flujo de autenticación de NextAuth
- La acción "marcar como SERVING/SERVED" valida que el pedido pertenece al `kitchenToken` usado

---

## Estado actual de APIs

| API | GET | POST | PATCH/PUT | DELETE |
|-----|:---:|:----:|:---------:|:------:|
| `/api/admin/clients` | ✅ | ✅ | ✅ | ✅ soft |
| `/api/admin/clients/[id]` | ✅ | — | ✅ | ✅ soft |
| `/api/suppliers` | ✅ | ✅ | ✅ | ✅ soft |
| `/api/products` | ✅ | ✅ | ✅ | ✅ soft |
| `/api/categories` | ✅ | ✅ | ✅ | ✅ hard |
| `/api/locations` | ✅ | ✅ | ✅ PUT | ✅ soft |
| `/api/locations/[id]/regenerate-token` | — | ✅ | — | — |
| `/api/purchase-invoices` | ✅ | ✅ | ✅ | ✅ hard |
| `/api/transfers` | ✅ | ✅ | ✅ | ✅ hard |
| `/api/inventory` | ✅ | — | — | — |
| `/api/inventory/movement` | ✅ | ✅ | — | — |
| `/api/tables` | ✅ | ✅ | ✅ | — |
| `/api/tables/[id]/regenerate-token` | — | ✅ | — | — |
| `/api/orders` | ✅ | ✅ | — | — |
| `/api/orders/[id]` | ✅ | — | ✅ | ✅ soft |
| `/api/cash-register` | ✅ | ✅ | ✅ | — |
| `/api/dashboard/warehouse` | ✅ | — | — | — |
| `/api/dashboard/restaurant` | ✅ | — | — | — |
| `/api/reports/restaurant` | ✅ | — | — | — |
| `/api/business/users` | ✅ | ✅ | — | — |
| `/api/users/[id]` | ✅ | — | ✅ PUT | ✅ soft |
| `/api/public/kitchen/[token]` | ✅ | — | — | — |
| `/api/public/kitchen/[token]/order/[id]` | — | — | ✅ | — |
| `/api/public/mesa/[token]` | ✅ | — | — | — |

---

## Roles del sistema

| Rol | Acceso | Home al login |
|-----|--------|---------------|
| `SUPER_ADMIN` | Panel completo de plataforma | `/super-admin/clients` |
| `WAREHOUSE_MANAGER` | Gestión de depósito e inventario | `/warehouse/dashboard` |
| `RESTAURANT_MANAGER` | Dashboard, POS, mesas, caja, reportes, personal | `/restaurant` |
| `CASHIER` | POS, mesas, caja | `/pos` |
| `WAITER` | App de mesonero (tomar pedidos) | `/waiter` |

---

## Credenciales de prueba (seed)

| Rol | Email | Password |
|-----|-------|----------|
| SUPER_ADMIN | admin@stocker.pt | admin123 |
| WAREHOUSE_MANAGER | warehouse@stocker.pt | manager123 |
| RESTAURANT_MANAGER | rest1@stocker.pt | manager123 |
| CASHIER | cashier@stocker.pt | cashier123 |
| Owner Pizzeria Porto | joao@pizzeriaporto.pt | pizza123 |
| Owner Cafe Lisboa | ana@cafelisboa.pt | cafe1234 |
| Owner Tasca do Ze | ze@tasca.pt | tasca123 |

---

## Pendiente

| Feature | Prioridad | Descripción |
|---------|-----------|-------------|
| ActivityFeed real | Media | El feed de actividad del dashboard del depósito usa datos mock hardcodeados |
| Sistema de Recetas | Alta | CRUD de recetas con ingredientes, costo por plato y margen de ganancia |
| Descuento de inventario | Alta | Al cobrar en POS / marcar pedido como Listo, descontar ingredientes (requiere recetas) |
| PWA offline | Baja | Service Worker + IndexedDB para funcionamiento sin conexión |

---

*Última actualización: 2026-04-17*
