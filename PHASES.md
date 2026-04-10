# PHASES.md — Stocker Development Plan

**Versión:** 1.0
**Creado:** 2026-04-08
**Duración estimada:** 12-14 semanas

---

## Resumen Ejecutivo

Stocker se desarrollará en **6 fases** con entregables funcionales al final de cada fase. Cada fase incluye desarrollo, testing y documentación.

| Fase | Duración | Entregable Principal |
|------|----------|----------------------|
| 0 | 1 semana | Setup + Auth |
| 1 | 2 semanas | Depósito Principal |
| 2 | 3 semanas | Inventario + Transferencias |
| 3 | 3 semanas | POS Restaurantes |
| 4 | 2 semanas | Recetas + Reportes |
| 5 | 2 semanas | PWA Offline + i18n |
| 6 | 1 semana | Testing + Deploy |

---

## FASE 0: Setup & Autenticación (1 semana)

### Objetivo
Establecer la base del proyecto con autenticación funcional.

### Entregables
- [x] Proyecto Next.js 14 inicializado
- [x] Prisma schema creado
- [x] Base de datos PostgreSQL configurada
- [x] NextAuth.js configurado
- [x] Sistema de roles (RBAC)
- [x] Layout base con navegación
- [x] Multi-idioma base (pt-PT, es-ES)

### Tareas Técnicas

```
Día 1-2: Setup inicial
├── Crear proyecto Next.js 14
├── Configurar Tailwind + shadcn/ui
├── Configurar Prisma + PostgreSQL
├── Ejecutar primera migración
└── Configurar ESLint + Prettier

Día 3-4: Autenticación
├── Configurar NextAuth.js
├── Implementar login/logout
├── Crear middleware de autenticación
├── Sistema de roles y permisos
└── Protección de rutas

Día 5: Layout y UX base
├── Dashboard layout
├── Sidebar con navegación
├── Header con selector de idioma
└── Página de inicio
```

### Checkpoint
- Usuario puede crear cuenta, loguearse, y ver dashboard según su rol
- Selector de idioma funciona
- Layout responsive

---

## FASE 1: Depósito Principal (2 semanas)

### Objetivo
Gestión completa del depósito principal: proveedores, productos, facturas de compra.

### Entregables
- [ ] CRUD de proveedores
- [ ] CRUD de productos y categorías
- [ ] Carga de facturas de compra
- [ ] Desglose de IVA (6%, 13%, 23%)
- [ ] Dashboard del depósito

### Tareas Técnicas

```
Semana 1: Proveedores y Productos
├── Día 1-2: Proveedores
│   ├── Lista de proveedores
│   ├── Formulario de creación/edición
│   ├── Validación de NIF portugués
│   └── Búsqueda y filtros
│
├── Día 3-4: Categorías y Productos
│   ├── CRUD de categorías
│   ├── CRUD de productos
│   ├── Generación de SKU automático
│   └── Importación CSV de productos
│
└── Día 5: Dashboard depósito
    ├── Resumen de productos
    ├── Stock bajo
    └── Últimas facturas

Semana 2: Facturas de Compra
├── Día 1-2: Modelo de factura
│   ├── Formulario de factura
│   ├── Líneas de factura
│   ├── Cálculo automático de IVA
│   └── Totales
│
├── Día 3-4: Gestión de facturas
│   ├── Lista de facturas
│   ├── Estados (draft, pending, paid)
│   ├── Adjuntar archivo PDF
│   └── Conciliación con inventario
│
└── Día 5: Stock inicial
    ├── Entrada de stock manual
    ├── Movimientos de inventario
    └── Historial
```

### Checkpoint
- Depósito puede cargar facturas de proveedores
- Productos actualizan stock automáticamente
- Dashboard muestra métricas básicas

---

## FASE 2: Inventario y Transferencias (3 semanas)

### Objetivo
Sistema de inventario multi-sede con transferencias entre depósitos y restaurantes.

### Entregables
- [ ] Inventario por sede
- [ ] Solicitud de transferencias
- [ ] Aprobación de transferencias
- [ ] Envío y recepción
- [ ] Movimientos de inventario
- [ ] Alertas de stock bajo

### Tareas Técnicas

```
Semana 1: Inventario Multi-sede
├── Día 1-2: Ubicaciones
│   ├── CRUD de locations (restaurantes)
│   ├── Asignación de usuarios a locations
│   └── Dashboard por location
│
├── Día 3-4: Stock por sede
│   ├── Ver inventario por location
│   ├── Ajustes de inventario
│   ├── Historial de movimientos
│   └── Búsqueda de productos
│
└── Día 5: Alertas
    ├── Stock bajo
    ├── Stock excedido
    └── Notificaciones

Semana 2: Transferencias (Parte 1)
├── Día 1-2: Crear solicitud
│   ├── Formulario de transferencia
│   ├── Selección de productos
│   ├── Validación de stock disponible
│   └── Guardado como PENDING
│
├── Día 3-4: Aprobación
│   ├── Lista de solicitudes pendientes
│   ├── Aprobar/Rechazar
│   ├── Flujo de estados
│   └── Notificaciones
│
└── Día 5: Preparación de envío
    ├── Reservar stock
    ├── Imprimir guía de envío
    └── Marcar como IN_TRANSIT

Semana 3: Transferencias (Parte 2)
├── Día 1-2: Recepción
│   ├── Verificar items recibidos
│   ├── Cantidad recibida vs enviada
│   ├── Reportar diferencias
│   └── Confirmar recepción
│
├── Día 3-4: Impacto en inventario
│   ├── Actualizar stock automáticamente
│   ├── Movimientos de inventario
│   ├── Auditoría de transferencias
│   └── Historial completo
│
└── Día 5: Dashboard de transferencias
    ├── Transferencias pendientes
    ├── En tránsito
    ├── Historial
    └── Reportes
```

### Checkpoint
- Restaurante puede solicitar productos al depósito
- Depósito puede aprobar y enviar
- Restaurante puede recibir y confirmar
- Stock se actualiza automáticamente

---

## FASE 3: POS Restaurantes (3 semanas)

### Objetivo
Sistema de punto de venta para restaurantes con gestión de mesas y empleados.

### Entregables
- [ ] Gestión de mesas
- [ ] Órdenes y pedidos
- [ ] Cierre de caja
- [ ] Descuento automático de inventario
- [ ] Vista de mesonero

### Tareas Técnicas

```
Semana 1: Mesas y Órdenes
├── Día 1-2: Gestión de mesas
│   ├── CRUD de mesas
│   ├── Mapa de mesas (visual)
│   ├── Estados de mesa
│   └── Asignación a mesonero
│
├── Día 3-4: Órdenes
│   ├── Crear orden
│   ├── Agregar items
│   ├── Modificar cantidad
│   ├── Comentarios en items
│   └── Cálculo de total
│
└── Día 5: Flujo de orden
    ├── Abrir orden
    ├── Modificar
    └── Cerrar orden

Semana 2: POS Interface
├── Día 1-2: Catálogo de productos
│   ├── Categorías en POS
│   ├── Búsqueda rápida
│   ├── Favoritos
│   └── Precios
│
├── Día 3-4: Carrito
│   ├── Lista de items
│   ├── Modificar cantidades
│   ├── Eliminar items
│   └── Notas por item
│
└── Día 5: Cálculos
    ├── Subtotal
    ├── IVA (solo para registro)
    └── Total

Semana 3: Cierre de Caja
├── Día 1-2: Pagos
│   ├── Métodos de pago (efectivo, tarjeta)
│   ├── Split payment
│   ├── Propina
│   └── Comprobante
│
├── Día 3-4: Cierre de caja
│   ├── Apertura de caja
│   ├── Cierre de turno
│   ├── Reporte de ventas
│   └── Diferencias
│
└── Día 5: Descuento de inventario
    ├── Al cerrar orden
    ├── Movimientos automáticos
    └── Alertas si stock insuficiente
```

### Checkpoint
- Mesonero puede abrir mesa, tomar orden, cerrar
- Caja se cuadra automáticamente
- Inventario se descuenta al vender

---

## FASE 4: Recetas y Reportes (2 semanas)

### Objetivo
Sistema de recetas con cálculo de costos y dashboard de reportes.

### Entregables
- [ ] CRUD de recetas
- [ ] Ingredientes por receta
- [ ] Cálculo de costo por plato
- [ ] Margen de ganancia
- [ ] Reportes de ventas
- [ ] Reportes de inventario

### Tareas Técnicas

```
Semana 1: Recetas
├── Día 1-2: CRUD recetas
│   ├── Crear receta
│   ├── Agregar ingredientes
│   ├── Cantidades por porción
│   └── Unidades de medida
│
├── Día 3-4: Cálculos
│   ├── Costo de ingredientes
│   ├── Costo por porción
│   ├── Precio sugerido
│   └── Margen de ganancia
│
└── Día 5: Integración con POS
    ├── Vender receta
    ├── Descontar ingredientes
    └── Validar stock suficiente

Semana 2: Reportes
├── Día 1-2: Reportes de ventas
│   ├── Ventas por día
│   ├── Productos más vendidos
│   ├── Ventas por mesonero
│   └── Ventas por mesa
│
├── Día 3-4: Reportes de inventario
│   ├── Stock actual
│   ├── Valor del inventario
│   ├── Productos con bajo stock
│   └── Rotación de productos
│
└── Día 5: Dashboard ejecutivo
    ├── Resumen general
    ├── Gráficos
    ├── Filtros por fecha
    └── Exportar a PDF/Excel
```

### Checkpoint
- Recetas calculan costo automáticamente
- Dashboard muestra métricas clave
- Reportes exportables

---

## FASE 5: PWA Offline + i18n (2 semanas)

### Objetivo
Aplicación funcional offline y traducción completa a portugués/español.

### Entregables
- [ ] Service Worker configurado
- [ ] IndexedDB para datos offline
- [ ] Sincronización cuando hay conexión
- [ ] Traducciones completas (pt-PT, es-ES)
- [ ] Instalable como PWA

### Tareas Técnicas

```
Semana 1: PWA Offline
├── Día 1-2: Service Worker
│   ├── Configurar next-pwa
│   ├── Cache de assets estáticos
│   ├── Cache de API responses
│   └── Offline fallback pages
│
├── Día 3-4: IndexedDB
│   ├── Schema de IndexedDB
│   ├── Sincronizar productos
│   ├── Cola de órdenes offline
│   └── Sincronización automática
│
└── Día 5: Testing offline
    ├── Simular desconexión
    ├── Crear orden offline
    ├── Sincronizar al reconectar
    └── Conflictos y resolución

Semana 2: Internacionalización
├── Día 1-2: Traducciones
│   ├── Extraer strings hardcoded
│   ├── Archivos de traducción pt-PT
│   ├── Archivos de traducción es-ES
│   └── Validar cobertura
│
├── Día 3-4: UI i18n
│   ├── Formatos de fecha
│   ├── Formatos de número
│   ├── Formatos de moneda (EUR)
│   └── RTL support (preparación)
│
└── Día 5: Finalización PWA
    ├── Manifest.json
    ├── Iconos PWA
    ├── Instalación
    └── Push notifications (setup)
```

### Checkpoint
- POS funciona offline
- Sincroniza al reconectar
- Toda la UI en portugués y español

---

## FASE 6: Testing & Deploy (1 semana)

### Objetivo
Testing exhaustivo y deploy a producción.

### Entregables
- [ ] Tests unitarios críticos
- [ ] Tests de integración
- [ ] Deploy a staging
- [ ] Deploy a producción
- [ ] Documentación final

### Tareas Técnicas

```
Día 1-2: Testing
├── Tests unitarios de servicios
├── Tests de integración de API
├── Tests de UI críticos
└── Corregir bugs encontrados

Día 3-4: Staging
├── Deploy a staging
├── Testing en staging
├── Validación con stakeholder
└── Correcciones finales

Día 5: Producción
├── Deploy a producción
├── Monitoreo inicial
├── Backup de base de datos
└── Documentación de deploy
```

### Checkpoint
- Sistema en producción
- Documentación completa
- Stakeholder validado

---

## Resumen de Tiempos

| Fase | Semanas | Acumulado |
|------|---------|-----------|
| 0 - Setup | 1 | 1 |
| 1 - Depósito | 2 | 3 |
| 2 - Inventario | 3 | 6 |
| 3 - POS | 3 | 9 |
| 4 - Recetas | 2 | 11 |
| 5 - PWA + i18n | 2 | 13 |
| 6 - Testing | 1 | 14 |

**Total: 14 semanas (~3.5 meses)**

---

## Dependencies & Risks

### Dependencies
- PostgreSQL database hosting
- Vercel o VPS para deployment
- Dominio para PWA

### Risks
| Riesgo | Mitigación |
|--------|-----------|
| Cambios de requisitos | Scrum sprints con demos |
| Performance con muchos datos | Indexación desde inicio |
| Offline sync conflicts | Conflict resolution strategy |
| Traducciones incompletas | Validación con stakeholder |

---

**Documento preparado por:** Tech Lead
**Fecha:** 2026-04-08