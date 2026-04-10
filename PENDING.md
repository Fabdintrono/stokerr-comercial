# Stocker - Fases Pendientes

**Actualizado:** 2026-04-09

## ❌ FASE 1: Depósito Principal (2 semanas)

### Objetivo
Gestión completa del depósito principal: proveedores, productos, facturas de compra.

### Tareas
- [ ] CRUD de proveedores
- [ ] CRUD de productos y categorías
- [ ] Carga de facturas de compra
- [ ] Desglose de IVA (6%, 13%, 23%)
- [ ] Dashboard del depósito

### Archivos a crear
```
src/app/(warehouse)/
├── suppliers/page.tsx
├── products/page.tsx
├── invoices/page.tsx
└── dashboard/page.tsx

src/app/api/
├── suppliers/
├── products/
└── invoices/
```

---

## ❌ FASE 2: Inventario y Transferencias (3 semanas)

### Objetivo
Sistema de inventario multi-sede con transferencias entre depósitos y restaurantes.

### Tareas
- [ ] Inventario por sede
- [ ] Solicitud de transferencias
- [ ] Aprobación de transferencias
- [ ] Envío y recepción
- [ ] Movimientos de inventario
- [ ] Alertas de stock bajo

### Archivos a crear
```
src/app/(warehouse)/
├── inventory/page.tsx
├── transfers/page.tsx
└── movements/page.tsx

src/app/(restaurant)/
├── inventory/page.tsx
└── requests/page.tsx
```

---

## ❌ FASE 3: POS Restaurantes (3 semanas)

### Objetivo
Sistema de punto de venta para restaurantes con gestión de mesas y empleados.

### Tareas
- [ ] Gestión de mesas
- [ ] Órdenes y pedidos
- [ ] Cierre de caja
- [ ] Descuento automático de inventario
- [ ] Vista de mesonero

### Archivos a crear
```
src/app/(pos)/
├── tables/page.tsx
├── order/[id]/page.tsx
├── kitchen/page.tsx
└── cash-register/page.tsx
```

---

## ❌ FASE 4: Recetas y Reportes (2 semanas)

### Objetivo
Sistema de recetas con cálculo de costos y dashboard de reportes.

### Tareas
- [ ] CRUD de recetas
- [ ] Ingredientes por receta
- [ ] Cálculo de costo por plato
- [ ] Margen de ganancia
- [ ] Reportes de ventas
- [ ] Reportes de inventario

### Archivos a crear
```
src/app/(admin)/
├── recipes/page.tsx
├── reports/
│   ├── sales/page.tsx
│   ├── inventory/page.tsx
│   └── executive/page.tsx
```

---

## ❌ FASE 5: PWA Offline + i18n (2 semanas)

### Objetivo
Aplicación funcional offline y traducción completa a portugués/español.

### Tareas
- [ ] Service Worker configurado
- [ ] IndexedDB para datos offline
- [ ] Sincronización cuando hay conexión
- [ ] Traducciones completas (pt-PT, es-ES)
- [ ] Instalable como PWA

### Archivos a crear
```
public/sw.js
public/manifest.json
src/lib/db/indexeddb.ts
src/locales/
├── pt-PT.json
└── es-ES.json
```

---

## ❌ FASE 6: Testing & Deploy (1 semana)

### Objetivo
Testing exhaustivo y deploy a producción.

### Tareas
- [ ] Tests unitarios críticos
- [ ] Tests de integración
- [ ] Deploy a staging
- [ ] Deploy a producción
- [ ] Documentación final

---

## 📊 Resumen de Tiempos

| Fase | Estado | Semanas |
|------|--------|---------|
| 0 - Setup | ✅ Completada | 1 |
| 1 - Depósito | 🔴 Pendiente | 2 |
| 2 - Inventario | 🔴 Pendiente | 3 |
| 3 - POS | 🔴 Pendiente | 3 |
| 4 - Recetas | 🔴 Pendiente | 2 |
| 5 - PWA + i18n | 🔴 Pendiente | 2 |
| 6 - Testing | 🔴 Pendiente | 1 |

**Total restante:** ~13 semanas (~3 meses)

---

## 🚀 Para Empezar Fase 1

1. Crear rama `feature/warehouse-module`
2. Implementar CRUD de proveedores
3. Implementar CRUD de productos
4. Crear dashboard del depósito
5. Conectar con APIs existentes

```bash
cd /home/fabriziodp/.openclaw/workspace/stocker
git checkout -b feature/warehouse-module
```

---

_Documento actualizado: 2026-04-09_