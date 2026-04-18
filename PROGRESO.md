# PROGRESO Stocker - Sesion 2026-04-14

## Proyecto
**Stocker** - Sistema de gestion de inventario y POS para restaurantes en Portugal
**Ubicacion:** `/home/fabriziodp/.openclaw/workspace/stocker`
**Comando:** `stocker [start|stop|restart|build|dev|seed|log|status]` (puerto 3001)

---

## Completado Sesion 2026-04-14

### 1. Super Admin Panel (CRUD completo con API real)

#### APIs creadas
- **POST /api/admin/clients** - Crea Business + User (WAREHOUSE_MANAGER) + UserBusiness (OWNER) + Location (WAREHOUSE) + UserLocation + 6 categorias default (transaccion)
- **GET /api/admin/clients** - Lista negocios con owner, locations, counts
- **GET /api/admin/clients/[id]** - Detalle con users, locations, counts
- **PATCH /api/admin/clients/[id]** - Actualiza plan, limites, estado
- **DELETE /api/admin/clients/[id]** - Soft delete business + desactiva usuarios sin otros negocios activos

#### Paginas reescritas (mock -> datos reales)
- `/super-admin/clients` - CRUD completo: crear/editar/desactivar clientes con ClientModal
- `/super-admin/licenses` - Gestion de planes/limites con edicion inline
- `/super-admin/subscriptions` - Vista de suscripciones con ingresos mensuales estimados

#### Componentes
- `ClientModal` - 3 secciones: Negocio (nombre, slug auto, plan, limites), Owner (nombre, email, password, telefono), Deposito (nombre, ciudad)

### 2. Gestion de Locales (nueva funcionalidad)

#### APIs corregidas
- **POST /api/locations** - Corregido: campos opcionales, verificacion maxRestaurants del plan
- **GET /api/locations** - Corregido: businessId desde header, `isActive` en vez de `active`
- **PUT /api/locations/[id]** - Corregido: campos opcionales, `isActive`

#### Pagina nueva
- `/warehouse/locations` - CRUD completo: crear restaurantes/depositos, editar, desactivar
- Sidebar actualizado con item "Locales" (icono MapPin)

### 3. Fase 2 - Transferencias (CRUD completo con API real)

#### APIs creadas
- **GET /api/transfers** - Lista transferencias con locations y line items
- **POST /api/transfers** - Crea transferencia (PENDING) con line items
- **GET /api/transfers/[id]** - Detalle
- **PATCH /api/transfers/[id]** - Cambiar estado: COMPLETED (mueve stock en transaccion) o CANCELLED
- **DELETE /api/transfers/[id]** - Eliminar pendientes

#### Logica de stock en transferencias
- Al COMPLETAR: deduce del origen, agrega al destino (upsert), crea InventoryMovements
- Al CANCELAR: no modifica stock
- Solo transferencias PENDING pueden modificarse/eliminarse

#### Pagina reescrita (mock -> datos reales)
- `/warehouse/transfers` - CRUD completo: crear con seleccion de origen/destino/productos, completar, cancelar, eliminar

### 4. Fixes adicionales
- Schema: `TransferLineItem` ahora tiene relacion con `Product` (+ `transferItems` en Product)
- API `/api/inventory/movement` POST: eliminados campos inexistentes (`avgCost`, `minLevel`, `lastRestock`)
- API `/api/inventory/movement` GET: `active` -> `isActive`
- Comando `stocker` creado como alias en .bashrc

---

## Flujo Completo Verificado
1. Super Admin crea cliente "Tasca do Ze" (STARTER, max 2 restaurantes)
2. Ze Manuel hace login con ze@tasca.pt
3. Ve su negocio "Tasca do Ze" con deposito y 6 categorias
4. Crea restaurante "Tasca Principal" -> OK
5. Crea 2do restaurante -> OK
6. Intenta 3er restaurante -> "Limite de 2 locales alcanzado"
7. Transferencia deposito->restaurante: stock se mueve correctamente

---

## Estado de APIs

| API | GET | POST | PATCH/PUT | DELETE | Status |
|-----|-----|------|-----------|--------|--------|
| /api/admin/clients | OK | OK | OK | OK (soft) | - |
| /api/admin/clients/[id] | OK | - | OK | OK (soft) | - |
| /api/suppliers | OK | OK | OK | OK (soft) | - |
| /api/suppliers/[id] | OK | - | OK | OK | - |
| /api/products | OK | OK | - | - | - |
| /api/products/[id] | OK | - | OK | OK (soft) | - |
| /api/categories | OK | OK | - | - | - |
| /api/categories/[id] | OK | - | OK | OK | - |
| /api/locations | OK | OK | - | - | - |
| /api/locations/[id] | OK | - | OK (PUT) | OK (soft) | - |
| /api/purchase-invoices | OK | OK | - | - | - |
| /api/purchase-invoices/[id] | OK | - | OK | OK (hard) | - |
| /api/purchase-invoices/[id]/status | - | - | OK | - | - |
| /api/transfers | OK | OK | - | - | - |
| /api/transfers/[id] | OK | - | OK | OK (hard) | - |
| /api/inventory | OK | - | - | - | - |
| /api/inventory/movement | OK | OK | - | - | - |
| /api/dashboard/warehouse | OK | - | - | - | - |

---

## Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| SUPER_ADMIN | admin@stocker.pt | admin123 |
| WAREHOUSE_MANAGER | warehouse@stocker.pt | manager123 |
| RESTAURANT_MANAGER | rest1@stocker.pt | manager123 |
| RESTAURANT_MANAGER | rest2@stocker.pt | manager123 |
| CASHIER | cashier@stocker.pt | cashier123 |
| Owner Pizzeria Porto | joao@pizzeriaporto.pt | pizza123 |
| Owner Cafe Lisboa | ana@cafelisboa.pt | cafe1234 |
| Owner Tasca do Ze | ze@tasca.pt | tasca123 |

---

## Completado Sesion 2026-04-16

### 5. POS Completo - Cajero / Restaurante

#### APIs creadas (sesion anterior)
- **GET/POST /api/tables** - Mesas por location, con ordenes abiertas
- **GET/POST /api/orders** - Pedidos con numero autogenerado P-YYYYMMDD-NNN
- **GET/PATCH/DELETE /api/orders/[id]** - add_items, pay (multiple pagos), cancel
- **GET/POST/PATCH /api/cash-register** - Abrir/cerrar caja, calcular totales
- **GET /api/dashboard/restaurant** - KPIs del dia
- **GET /api/reports/restaurant** - Ventas por dia/hora/metodo/producto

#### StokerPOS - `/pos` (route group `(pos)`)
- Pantalla completa sin sidebar, sin scroll - optimizada para PC touch
- **Topbar**: logo StokerPOS, selector de mesa activo, badge estado caja, reloj en vivo, cajero + logout
- **Panel izquierdo (60%)**: filtro por categorias + buscador + grid 4 columnas de productos (touch-friendly)
- **Panel derecho (40%)**: pedido actual con +/- por item, subtotal, IVA 23%, descuento aplicado, total
- **Barra inferior (72px)**: MESAS | NUEVA COMANDA | DESCUENTO | IMPRIMIR | DIVIDIR | CANCELAR | COBRAR
- **Overlay Mesas**: grid de todas las mesas, estado libre/ocupada, total actual, seleccion directa
- **Overlay Cobrar**: 4 metodos de pago (Efectivo/Tarjeta/MB WAY/Multibanco), confirmacion con total
- **Overlay Dividir cuenta**:
  - Modo "Partes iguales": elige N partes (2-6 o libre), cobra cada parte individualmente con su metodo
  - Modo "Por item": asigna cada item a una persona (color coded), resumen por persona, procesa en un paso
- **Overlay Descuento**: presets 5/10/15/20% o valor libre, se refleja en totales en tiempo real
- Carga mesas existentes con sus pedidos abiertos al seleccionarlas
- Flujo: add productos → cobrar → crea orden en BD → registra pagos → cierra mesa

#### Otras paginas completadas (sesion anterior)
- `/restaurant/page.tsx` - Dashboard con KPIs reales
- `/restaurant/caja/page.tsx` - Apertura/cierre de caja con resumen
- `/restaurant/reports/page.tsx` - Reportes: ventas por dia, metodo, hora, top productos
- `/restaurant/tables/page.tsx` - Gestion de mesas
- `/warehouse/inventory/page.tsx` - Inventario mejorado con tabs Stock/Movimientos/Alertas
- `/super-admin/analytics/page.tsx` - Analytics reales de plataforma
- `/super-admin/support/page.tsx` - Actividad del sistema
- `/super-admin/settings/page.tsx` - Configuracion global (Setting model)

#### Mockup HTML
- `pos-mockup.html` en raiz del proyecto - prototipo interactivo del StokerPOS

---

## Completado Sesion 2026-04-17

### 6. POS - Pendientes resueltos

- **Imprimir recibo**: window.print() con HTML tipo ticket. Funciona desde POS y desde historial.
- **Nota en pedido**: campo `notes` en Order (schema + API). Botón 📄 en panel derecho. Badge visible.
- **Historial de pagados**: overlay con pedidos del día, total recaudado, detalle, reimprimir.

### 7. Rol WAITER (Mesonero)

- Nuevo rol `WAITER` en schema + DB
- App `/waiter` — pantalla táctil naranja, separación "ya enviado" / "nuevos items", envío a cocina
- `/restaurant/staff` — gestión de personal (crear mesoneros, cajeros, gerentes; activar/desactivar)
- Sidebar restaurante actualizado con ítem "Personal"
- APIs actualizadas para aceptar WAITER en todos los endpoints

### 8. Pantalla de Cocina + QR por Mesa

#### Schema
- `Location.kitchenToken` — UUID único, generado por PostgreSQL (`gen_random_uuid()`)
- `Table.qrToken` — UUID único por mesa, no adivinable

#### APIs públicas (sin auth)
- `GET /api/public/kitchen/[token]` — pedidos OPEN/PREPARING para la cocina
- `PATCH /api/public/kitchen/[token]/order/[id]` — marcar PREPARING o SERVED
- `GET /api/public/mesa/[token]` — cuenta activa de la mesa (read-only)
- `POST /api/locations/[id]/regenerate-token` — regenerar kitchenToken (requiere auth de manager)
- `POST /api/tables/[id]/regenerate-token` — regenerar qrToken (requiere auth de manager)

#### Páginas públicas (sin login)
- `/cocina/[token]` — pantalla de cocina: grid de pedidos, tiempo transcurrido, alerta >15min, botones "Preparando"/"Listo". Polling 12s.
- `/mesa/[token]` — vista del cliente: cuenta activa, items, totales, estado del pedido. Polling 20s.

#### Gestión desde /restaurant/tables
- Cada mesa tiene botón "QR" → modal con QR generado (fondo oscuro), URL, descarga PNG, regenerar token
- Banner con URL de cocina + botón copiar + abrir en nueva pestaña

#### Seguridad
- Tokens UUID aleatorios (no basados en nombre ni ID secuencial)
- APIs públicas no exponen IDs internos ni datos sensibles
- Tokens regenerables si se comprometen
- Middleware excluye `/cocina` y `/mesa` de la autenticación

---

## Pendientes

1. **ActivityFeed** - datos mock hardcodeados en dashboard del depósito
2. **Recetas** - sistema de recetas con ingredientes, costo por plato, margen
3. **Cocina → descuento de inventario** - al marcar "Listo", descontar ingredientes (requiere recetas)

---

*Ultima actualizacion: 2026-04-17*
