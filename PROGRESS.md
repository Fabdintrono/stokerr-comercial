# Stocker - Progreso de Desarrollo

**Última actualización:** 2026-04-09

## ✅ Completado

### Fase 0: Setup & Autenticación
- [x] Proyecto Next.js 14 + Prisma + PostgreSQL
- [x] Conexión a Supabase (PostgreSQL)
- [x] Sistema de roles (Role enum en User)
- [x] Multi-tenant con subdominios (arquitectura lista)
- [x] Componentes de layout (Admin, Warehouse, Restaurant, POS)
- [x] Dark theme con emerald accents
- [x] Login funcional con NextAuth.js
- [x] Redirección por rol:
  - `SUPER_ADMIN` → `/clients` (panel global)
  - Otros roles → `/select-business`

### Schema Actualizado
- [x] Modelo `User` con campo `role` (enum Role)
- [x] Modelos `Business`, `UserBusiness`, `UserLocation`
- [x] Modelos `Location`, `Product`, `Category`, `Inventory`
- [x] Modelo `Supplier`, `Setting`
- [x] Enum `Role`: SUPER_ADMIN, ADMIN, WAREHOUSE_MANAGER, RESTAURANT_MANAGER, CASHIER, VIEWER, USER
- [x] Enum `BusinessRole`: OWNER, MANAGER, ACCOUNTANT
- [x] Enum `LocationRole`: WAREHOUSE_MANAGER, RESTAURANT_MANAGER, WAITER, CASHIER, KITCHEN, STAFF

### Seed de Prueba
- [x] 1 Negocio (Restaurante Demo Lda)
- [x] 3 Locations (Armazém Central, Restaurante Chiado, Restaurante Bairro Alto)
- [x] 5 Usuarios con roles correctos
- [x] 6 Categorías, 13 Productos
- [x] Inventario inicial
- [x] 18 Mesas
- [x] 2 Proveedores

## 🔑 Usuarios de Prueba

| Usuario | Email | Password | Rol | Redirige a |
|---------|-------|----------|-----|------------|
| Super Admin | `admin@stocker.pt` | `admin123` | `SUPER_ADMIN` | `/clients` |
| Warehouse Manager | `warehouse@stocker.pt` | `manager123` | `WAREHOUSE_MANAGER` | `/select-business` |
| Restaurant Manager 1 | `rest1@stocker.pt` | `manager123` | `RESTAURANT_MANAGER` | `/select-business` |
| Restaurant Manager 2 | `rest2@stocker.pt` | `manager123` | `RESTAURANT_MANAGER` | `/select-business` |
| Cashier | `cashier@stocker.pt` | `cashier123` | `CASHIER` | `/select-business` |

## 🔧 Fix Crítico (2026-04-09)
- **Problema:** DATABASE_URL usaba `postgres://` en lugar de `postgresql://`
- **Solución:** Actualizado en `.env` y `.env.local`
- **Problema:** User no tenía campo `role` 
- **Solución:** Agregado campo `role` al modelo User con enum Role
- **Problema:** Admin tenía rol `USER` (default)
- **Solución:** Actualizado a `SUPER_ADMIN` manualmente en DB

## 📁 Estructura de Rutas

```
src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (admin)/
│   ├── layout.tsx
│   └── page.tsx (dashboard negocio)
├── (super-admin)/
│   ├── layout.tsx
│   ├── clients/page.tsx
│   ├── subscriptions/page.tsx
│   ├── licenses/page.tsx
│   └── support/page.tsx
├── (warehouse)/
├── (restaurant)/
├── (pos)/
└── (business)/
    └── select-business/page.tsx
```

## 🌐 URLs de Desarrollo

- Local: http://localhost:3000
- Red: http://192.168.1.107:3000

## 📊 Base de Datos

- Host: db.sturshacljnhcbvtywrv.supabase.co
- Database: postgres
- Provider: Supabase (PostgreSQL)

---

## Próximos Pasos

Ver [PHASES.md](./PHASES.md) para el roadmap completo.