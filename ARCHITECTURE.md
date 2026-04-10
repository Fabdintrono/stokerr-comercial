# ARCHITECTURE.md — Stocker System Architecture

**Version:** 1.0
**Last Updated:** 2026-04-08
**Tech Lead:** Fabrizio D'Introno

---

## 1. Overview

**Stocker** es un sistema de gestión de inventario y POS para una cadena de restaurantes en Portugal. El sistema maneja:
- **1 Depósito Principal** (warehouse central) — Compras a proveedores, facturas con IVA portugués, despachos a restaurantes
- **5 Restaurantes** — POS, inventario local, sistema de recetas, transferencias entre sedes

### Características Clave
- **No fiscal** — Sistema de gestión interno, no emite facturas fiscales
- **Multi-sede** — Datos sincronizados entre depósito y restaurantes
- **Offline-first** — PWA con sincronización cuando hay conexión
- **Multi-idioma** — Portugués (pt-PT) y Español (es-ES)
- **IVA portugués** — Soporte para tasas 6%, 13%, 23%

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STOKER SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        CLIENT LAYER (PWA)                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │   Warehouse  │  │ Restaurant   │  │    Admin Dashboard       │  │   │
│  │  │   Dashboard  │  │    POS       │  │    (Management)          │  │   │
│  │  │   (Depósito) │  │              │  │                          │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      APPLICATION LAYER                                │   │
│  │                                                                       │   │
│  │                    Next.js 14 (App Router)                           │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                     Server Components                          │  │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │   │
│  │  │  │   Pages     │  │   Layouts   │  │   Server Actions     │   │  │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                      API Routes                               │  │   │
│  │  │  /api/warehouses  /api/restaurants  /api/transfers            │  │   │
│  │  │  /api/products    /api/suppliers    /api/recipes              │  │   │
│  │  │  /api/pos         /api/inventory   /api/reports               │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SERVICE LAYER                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│  │  │   Auth      │  │  Inventory  │  │      Transfer Service       │ │   │
│  │  │  Service    │  │  Service    │  │      (Inter-location)       │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│  │  │    POS      │  │   Recipe    │  │      Report Service         │ │   │
│  │  │  Service    │  │  Service    │  │      (Analytics)             │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA LAYER                                    │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                      Prisma ORM                               │  │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │  │   │
│  │  │  │   Models    │  │  Migrations │  │   Query Builder      │   │  │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  │                                │                                     │   │
│  │                                ▼                                     │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                     PostgreSQL                                 │  │   │
│  │  │                  (Single Database)                             │  │   │
│  │  │                                                                │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │   │
│  │  │  │ products │ │ locations│ │inventory │ │   transactions   │ │  │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Architecture

### 3.1 Core Modules

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group route
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/              # Dashboard group route
│   │   ├── warehouse/            # Depósito views
│   │   ├── restaurant/           # Restaurant views
│   │   ├── admin/                # Admin views
│   │   └── layout.tsx
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── suppliers/
│   │   ├── invoices/
│   │   ├── transfers/
│   │   ├── pos/
│   │   ├── recipes/
│   │   └── reports/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/                   # React Components
│   ├── ui/                       # Base UI (shadcn/ui)
│   ├── forms/                    # Form components
│   ├── tables/                   # Data tables
│   ├── charts/                   # Charts & graphs
│   └── layouts/                  # Layout components
│
├── lib/                          # Core libraries
│   ├── prisma.ts                 # Prisma client
│   ├── auth.ts                   # NextAuth config
│   ├── i18n.ts                   # Internationalization
│   └── utils.ts                  # Utilities
│
├── services/                     # Business Logic Layer
│   ├── inventory.service.ts
│   ├── transfer.service.ts
│   ├── recipe.service.ts
│   ├── pos.service.ts
│   └── report.service.ts
│
├── types/                        # TypeScript types
│   └── index.ts
│
├── hooks/                        # React hooks
│   ├── use-inventory.ts
│   ├── use-pos.ts
│   └── use-offline.ts
│
├── store/                        # State management (Zustand)
│   ├── pos-store.ts
│   ├── inventory-store.ts
│   └── offline-store.ts
│
└── prisma/
    ├── schema.prisma
    └── migrations/
```

---

## 4. Domain Model

### 4.1 Core Entities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOMAIN MODEL                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐         ┌────────────────┐                            │
│  │    Location    │         │    Supplier    │                            │
│  │  (Sede/Local)  │         │  (Proveedor)   │                            │
│  ├────────────────┤         ├────────────────┤                            │
│  │ - id           │         │ - id           │                            │
│  │ - name         │         │ - name         │                            │
│  │ - type: WAREHOUSE│       │ - nif (tax ID) │                            │
│  │       RESTAURANT│       │ - email        │                            │
│  │ - address      │         │ - phone        │                            │
│  │ - phone        │         │ - address      │                            │
│  │ - active       │         │ - active       │                            │
│  └────────────────┘         └────────────────┘                            │
│         │                          │                                        │
│         │                          │                                        │
│         ▼                          ▼                                        │
│  ┌────────────────┐         ┌────────────────┐                            │
│  │    Product     │         │PurchaseInvoice │                            │
│  │   (Producto)   │◄────────│ (FacturaCompra)│                            │
│  ├────────────────┤         ├────────────────┤                            │
│  │ - id           │         │ - id           │                            │
│  │ - sku          │         │ - number       │                            │
│  │ - name         │         │ - supplierId   │                            │
│  │ - description  │         │ - date         │                            │
│  │ - unit         │         │ - totalNet     │                            │
│  │ - category     │         │ - totalVat     │                            │
│  │ - minStock     │         │ - totalGross   │                            │
│  │ - active       │         │ - status       │                            │
│  └────────────────┘         └────────────────┘                            │
│         │                          │                                        │
│         │                          │                                        │
│         ▼                          ▼                                        │
│  ┌────────────────┐         ┌────────────────┐                            │
│  │   Inventory    │         │InvoiceLineItem │                            │
│  │ (Inventario)  │         │ (LíneaFactura) │                            │
│  ├────────────────┤         ├────────────────┤                            │
│  │ - id           │         │ - id           │                            │
│  │ - productId    │         │ - invoiceId    │                            │
│  │ - locationId   │         │ - productId    │                            │
│  │ - quantity     │         │ - quantity     │                            │
│  │ - avgCost      │         │ - unitPrice    │                            │
│  │ - minLevel     │         │ - vatRate      │                            │
│  │ - maxLevel     │         │ - vatAmount    │                            │
│  └────────────────┘         │ - total        │                            │
│         │                  └────────────────┘                            │
│         │                                                                  │
│         ▼                                                                  │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │                    TRANSFER FLOW                                │        │
│  │                                                                 │        │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐│        │
│  │  │ Transfer    │    │TransferLine │    │  InventoryMovement  ││        │
│  │  │Request      │───▶│Item         │───▶│  (Movimiento)       ││        │
│  │  └─────────────┘    └─────────────┘    └─────────────────────┘│        │
│  │                                                                 │        │
│  │  Estados: PENDING → APPROVED → IN_TRANSIT → RECEIVED          │        │
│  │                                                                 │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │                      POS MODULE                                 │        │
│  │                                                                 │        │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐│        │
│  │  │   Table     │    │   Order      │    │  OrderItem          ││        │
│  │  │  (Mesa)     │───▶│  (Pedido)    │───▶│  (LíneaPedido)      ││        │
│  │  └─────────────┘    └─────────────┘    └─────────────────────┘│        │
│  │                                                                 │        │
│  │  ┌─────────────┐    ┌─────────────┐                             │        │
│  │  │ CashRegister│    │  Recipe     │                             │        │
│  │  │ (Caja)      │    │ (Receta)    │                             │        │
│  │  └─────────────┘    └─────────────┘                             │        │
│  │                                                                 │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow

### 5.1 Compra a Proveedor (Warehouse)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Supplier   │───▶│    Invoice   │───▶│ ReceiveStock │───▶│  Inventory   │
│  (Proveedor) │    │   (Factura)  │    │  (Recepción) │    │ (Inventario) │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │
                           │ IVA desglose:
                           │ - 6% (reduced)
                           │ - 13% (intermediate)
                           │ - 23% (standard)
                           ▼
                    ┌──────────────┐
                    │   AuditLog   │
                    └──────────────┘
```

### 5.2 Transferencia entre Sedes

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Create     │    │   Approve    │    │    Ship      │    │   Receive    │
│   Request    │───▶│   Request    │───▶│   (Envío)    │───▶│   (Recibe)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                    │
       │                   │                   │                    │
       ▼                   ▼                   ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Status:    │    │   Status:    │    │   Status:    │    │   Status:    │
│   PENDING    │    │   APPROVED   │    │   IN_TRANSIT │    │   RECEIVED   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                                       │                    │
       │                                       │                    │
       ▼                                       ▼                    ▼
┌──────────────┐                        ┌──────────────┐    ┌──────────────┐
│    Source    │                        │ - Stock OUT  │    │ - Stock IN   │
│   Location   │                        │ - Movement   │    │ - Movement   │
└──────────────┘                        └──────────────┘    └──────────────┘
```

### 5.3 POS - Venta en Restaurante

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Select     │    │   Create      │    │   Apply      │    │   Close      │
│    Table     │───▶│    Order      │───▶│   Recipe     │───▶│   Order      │
│   (Mesa)     │    │   (Pedido)    │    │   (Receta)   │    │   (Cierre)   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                    │                    │
                           │                    │                    │
                           ▼                    ▼                    ▼
                    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                    │ OrderItems   │    │ Deduct       │    │ CashRegister │
                    │ (Líneas)     │    │ Ingredients  │    │ (Caja)       │
                    └──────────────┘    └──────────────┘    └──────────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │  Inventory   │
                                        │  Movement   │
                                        └──────────────┘
```

---

## 6. Authentication & Authorization

### 6.1 Role-Based Access Control (RBAC)

```typescript
enum Role {
  ADMIN = 'ADMIN',           // Full access - todo el sistema
  WAREHOUSE_MANAGER = 'WAREHOUSE_MANAGER', // Gestión depósito
  RESTAURANT_MANAGER = 'RESTAURANT_MANAGER', // Gestión restaurante
  CASHIER = 'CASHIER',       // Solo POS
  VIEWER = 'VIEWER'          // Solo lectura
}

// Permissions matrix
const permissions = {
  ADMIN: {
    products: ['create', 'read', 'update', 'delete'],
    suppliers: ['create', 'read', 'update', 'delete'],
    invoices: ['create', 'read', 'update', 'delete'],
    transfers: ['approve', 'reject', 'read'],
    inventory: ['read', 'adjust'],
    pos: ['read'],
    reports: ['read'],
    users: ['create', 'read', 'update', 'delete']
  },
  WAREHOUSE_MANAGER: {
    products: ['create', 'read', 'update'],
    suppliers: ['create', 'read', 'update'],
    invoices: ['create', 'read', 'update'],
    transfers: ['create', 'read', 'ship'],
    inventory: ['read', 'adjust'],
    reports: ['read']
  },
  RESTAURANT_MANAGER: {
    transfers: ['create', 'read', 'receive'],
    inventory: ['read', 'adjust'],
    pos: ['read', 'manage'],
    recipes: ['create', 'read', 'update'],
    reports: ['read']
  },
  CASHIER: {
    pos: ['read', 'create_orders', 'close_cash'],
    inventory: ['read']
  },
  VIEWER: {
    products: ['read'],
    inventory: ['read'],
    reports: ['read']
  }
}
```

### 6.2 Location-Based Access

```typescript
// Users are assigned to specific locations
model User {
  id           String      @id @default(cuid())
  email        String      @unique
  name         String
  role         Role
  locations    UserLocation[]  // Can access multiple locations
}

model UserLocation {
  id         String   @id @default(cuid())
  userId     String
  locationId String
  isPrimary  Boolean  @default(false)  // Main location
  user       User     @relation(fields: [userId], references: [id])
  location   Location @relation(fields: [locationId], references: [id])
}
```

---

## 7. Offline Strategy (PWA)

### 7.1 Service Worker Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PWA ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐        ┌─────────────────────────────────┐│
│  │   Browser       │        │      Service Worker             ││
│  │                 │        │                                 ││
│  │  ┌───────────┐  │        │  ┌────────────────────────────┐ ││
│  │  │ React App │  │        │  │    Cache Manager          │ ││
│  │  └───────────┘  │        │  │  - Static assets           │ ││
│  │        │        │        │  │  - API responses          │ ││
│  │        ▼        │        │  │  - Offline pages          │ ││
│  │  ┌───────────┐  │───────▶│  └────────────────────────────┘ ││
│  │  │ IndexedDB│  │        │                                 ││
│  │  │ (Local)  │  │        │  ┌────────────────────────────┐ ││
│  │  └───────────┘  │        │  │    Sync Queue              │ ││
│  │        │        │        │  │  - Pending mutations       │ ││
│  │        ▼        │        │  │  - Retry logic              │ ││
│  │  ┌───────────┐  │        │  │  - Conflict resolution     │ ││
│  │  │  Zustand  │  │        │  └────────────────────────────┘ ││
│  │  │  Store    │  │        │                                 ││
│  │  └───────────┘  │        └─────────────────────────────────┘│
│  │                 │                        │                   │
│  └─────────────────┘                        │                   │
│                                             ▼                   │
│                                    ┌─────────────────────────┐  │
│                                    │      Backend API        │  │
│                                    │      (PostgreSQL)       │  │
│                                    └─────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Offline-First Data Strategy

```typescript
// IndexedDB Schema (client-side)
const offlineDB = {
  products: {
    key: 'id',
    indexes: ['sku', 'category', 'locationId']
  },
  inventory: {
    key: ['locationId', 'productId'],
    indexes: ['productId', 'quantity']
  },
  pendingOrders: {
    key: 'localId',
    indexes: ['status', 'createdAt']
  },
  pendingTransfers: {
    key: 'localId',
    indexes: ['status', 'fromLocationId']
  }
}

// Sync Strategy
enum SyncStrategy {
  LOCAL_FIRST = 'LOCAL_FIRST',     // Write local, sync later
  NETWORK_FIRST = 'NETWORK_FIRST', // Try network, fallback local
  CACHE_FIRST = 'CACHE_FIRST',     // Read cache, update in background
  NETWORK_ONLY = 'NETWORK_ONLY'    // Requires connection (reports)
}

// Data Categories
const dataSyncConfig = {
  products: SyncStrategy.CACHE_FIRST,
  inventory: SyncStrategy.CACHE_FIRST,
  pos: SyncStrategy.LOCAL_FIRST,
  transfers: SyncStrategy.LOCAL_FIRST,
  reports: SyncStrategy.NETWORK_ONLY
}
```

---

## 8. Internationalization (i18n)

### 8.1 Implementation

```typescript
// lib/i18n.ts
import { createi18n } from 'next-international'

export const { useI18n, I18nProvider, getLocale } = createi18n({
  pt: () => import('@/locales/pt.json'),
  es: () => import('@/locales/es.json')
})

// Locale files structure
// locales/pt.json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar"
  },
  "pos": {
    "table": "Mesa",
    "order": "Pedido",
    "total": "Total",
    "pay": "Pagar"
  },
  "inventory": {
    "stock": "Stock",
    "minLevel": "Nível Mínimo",
    "maxLevel": "Nível Máximo"
  },
  "invoice": {
    "vat6": "IVA 6%",
    "vat13": "IVA 13%",
    "vat23": "IVA 23%"
  }
}
```

---

## 9. Security Considerations

### 9.1 Authentication

- **NextAuth.js** con JWT sessions
- **Session duration:** 8 horas (configurable)
- **Password policy:** Mínimo 8 caracteres, 1 mayúscula, 1 número
- **Rate limiting:** 5 intentos de login por minuto por IP

### 9.2 Authorization

- **Middleware** verifica autenticación en cada request
- **API Routes** verifican permisos según rol
- **Location scoping** — Usuarios solo ven datos de sus locations asignados
- **Audit logging** — Todas las acciones críticas se registran

### 9.3 Data Protection

- **Input validation** — Zod schemas en todas las APIs
- **SQL injection** — Prisma ORM previene por defecto
- **XSS protection** — React escapa por defecto + CSP headers
- **CSRF protection** — NextAuth CSRF tokens

---

## 10. Deployment Architecture

### 10.1 Production Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                            │
│  │   Load Balancer │                                            │
│  │   (nginx/HAProxy)│                                            │
│  └─────────────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Vercel / VPS                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          ││
│  │  │  Next.js    │  │  Next.js    │  │  Next.js    │          ││
│  │  │  Instance 1 │  │  Instance 2 │  │  Instance 3 │          ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘          ││
│  │           │                │                │               ││
│  │           └────────────────┼────────────────┘               ││
│  │                            │                                ││
│  │                            ▼                                ││
│  │  ┌───────────────────────────────────────────────────────┐ ││
│  │  │                Connection Pooler                       │ ││
│  │  │                   (PgBouncer)                         │ ││
│  │  └───────────────────────────────────────────────────────┘ ││
│  │                            │                                ││
│  └────────────────────────────┼────────────────────────────────┘│
│                               │                                  │
│                               ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  PostgreSQL Database                        ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │   Primary   │──│   Replica   │──│   Replica   │         ││
│  │  │  (Write)    │  │   (Read)    │  │   (Read)    │         ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Backup Strategy

- **Daily backups** — Full database dump
- **Point-in-time recovery** — WAL archiving
- **Off-site storage** — Backups en cloud storage
- **Retention:** 30 días de backups

---

## 11. Performance Considerations

### 11.1 Database Indexes

```sql
-- Key indexes for common queries
CREATE INDEX idx_inventory_location_product ON inventory("locationId", "productId");
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_dates ON transfers("createdAt", "status");
CREATE INDEX idx_orders_location_status ON orders("locationId", "status");
CREATE INDEX idx_orders_dates ON orders("createdAt", "locationId");
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products("categoryId");
```

### 11.2 Caching Strategy

```typescript
// Redis caching for frequently accessed data
const cacheConfig = {
  products: {
    ttl: 3600, // 1 hour
    invalidateOn: ['product:update', 'product:create']
  },
  inventory: {
    ttl: 300, // 5 minutes (more volatile)
    invalidateOn: ['inventory:update', 'transfer:received']
  },
  reports: {
    ttl: 86400, // 24 hours (static reports)
    invalidateOn: ['report:regenerate']
  }
}
```

### 11.3 Query Optimization

```typescript
// Use Prisma's include wisely
const getProductsWithInventory = async (locationId: string) => {
  return prisma.product.findMany({
    include: {
      category: true,
      inventory: {
        where: { locationId },
        select: {
          quantity: true,
          avgCost: true,
          minLevel: true,
          maxLevel: true
        }
      }
    }
  })
}
```

---

## 12. Monitoring & Logging

### 12.1 Application Monitoring

- **Error tracking:** Sentry
- **Performance:** Vercel Analytics / custom metrics
- **Uptime:** Uptime Robot or similar

### 12.2 Audit Logging

```typescript
model AuditLog {
  id          String   @id @default(cuid())
  userId      String?
  action      String   // CREATE, UPDATE, DELETE, TRANSFER, RECEIVE
  entityType  String   // PRODUCT, INVENTORY, TRANSFER, ORDER
  entityId    String
  oldValue    Json?
  newValue    Json?
  locationId  String?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
  
  user        User?    @relation(fields: [userId], references: [id])
  location    Location? @relation(fields: [locationId], references: [id])
}
```

---

## 13. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 + React 18 | App framework, SSR, routing |
| Styling | Tailwind CSS + shadcn/ui | UI components, styling |
| State | Zustand | Client state, offline sync |
| Forms | React Hook Form + Zod | Form handling, validation |
| Backend | Next.js API Routes | REST API endpoints |
| ORM | Prisma | Database abstraction |
| Database | PostgreSQL | Primary data store |
| Auth | NextAuth.js | Authentication & sessions |
| i18n | next-international | Multi-language support |
| PWA | next-pwa + Workbox | Offline capabilities |
| Charts | Recharts | Dashboards, reports |
| PDF | jsPDF | Invoice generation |

---

**Documento preparado por:** Tech Lead
**Fecha:** 2026-04-08
**Estado:** Arquitectura inicial — pendiente revisión con stakeholder