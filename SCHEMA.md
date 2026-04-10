# SCHEMA.md — Stocker Data Schema

**Version:** 1.0
**Last Updated:** 2026-04-08
**Tech Lead:** Fabrizio D'Introno

---

## 1. Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         STOKER DATABASE SCHEMA                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            CORE ENTITIES                                │   │
│  │                                                                          │   │
│  │   User ──────► UserLocation ──────► Location                            │   │
│  │      │                                        │                          │   │
│  │      │                                        ├──► Product               │   │
│  │      │                                        │     │                    │   │
│  │      │                                        │     ├──► Category        │   │
│  │      │                                        │     │                    │   │
│  │      │                                        │     ├──► Inventory       │   │
│  │      │                                        │     └──► RecipeItem      │   │
│  │      │                                        │                          │   │
│  │      │                                        ├──► Supplier              │   │
│  │      │                                        │     │                    │   │
│  │      │                                        │     └──► PurchaseInvoice │   │
│  │      │                                        │           │              │   │
│  │      │                                        │           └──► InvoiceLine│   │
│  │      │                                        │                          │   │
│  │      │                                        └──► Employee              │   │
│  │      │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         OPERATIONAL ENTITIES                            │   │
│  │                                                                          │   │
│  │   Transfer ──────► TransferLine ──────► InventoryMovement              │   │
│  │      │                                     │                             │   │
│  │      │                                     └──► Inventory (ajuste)       │   │
│  │      │                                                                   │   │
│  │   Order ──────► OrderItem ────────────────► Inventory (deduct)          │   │
│  │      │                                     │                             │   │
│  │      ├──► Table ──────► CashRegister ────► CashRegisterMovement        │   │
│  │      │                                                                   │   │
│  │      └──► Recipe ──────► RecipeItem ──────► Inventory (auto-deduct)    │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            AUDIT & LOGGING                              │   │
│  │                                                                          │   │
│  │   AuditLog ──────────────────────────────────────────────────────────   │   │
│  │   UserSession ───────────────────────────────────────────────────────   │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Models Detail

### 2.1 User & Authentication

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  passwordHash  String
  name          String
  avatar        String?
  role          UserRole       @default(VIEWER)
  isActive      Boolean        @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  // Relations
  employee      Employee?
  userLocations UserLocation[]
  auditLogs     AuditLog[]
  sessions      UserSession[]

  @@index([email])
  @@index([role])
}

enum UserRole {
  ADMIN
  WAREHOUSE_MANAGER
  RESTAURANT_MANAGER
  CASHIER
  VIEWER
}

model UserLocation {
  id          String   @id @default(cuid())
  userId      String
  locationId  String
  isPrimary   Boolean  @default(false)
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  location    Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@unique([userId, locationId])
  @@index([locationId])
}

model UserSession {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  expiresAt    DateTime
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
}
```

### 2.2 Location (Warehouse & Restaurant)

```prisma
model Location {
  id          String           @id @default(cuid())
  name        String
  type        LocationType
  address     String
  city        String
  postalCode  String
  country     String           @default("PT")
  phone       String?
  email       String?
  nif         String?          // NIF português
  isActive    Boolean          @default(true)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  // Relations
  employees   Employee[]
  inventories Inventory[]
  transfersFrom Transfer[]    @relation("TransferFromLocation")
  transfersTo   Transfer[]    @relation("TransferToLocation")
  tables      Table[]
  cashRegisters CashRegister[]
  orders      Order[]
  auditLogs   AuditLog[]
  userLocations UserLocation[]

  @@index([type])
  @@index([isActive])
  @@index([name])
}

enum LocationType {
  WAREHOUSE   // Depósito Principal
  RESTAURANT  // Restaurante
}
```

### 2.3 Employee

```prisma
model Employee {
  id          String        @id @default(cuid())
  userId      String        @unique
  locationId  String?
  position    String
  pin         String?       // PIN de 4 dígitos para POS
  isActive    Boolean       @default(true)
  hiredAt     DateTime      @default(now())
  terminatedAt DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  location    Location?     @relation(fields: [locationId], references: [id])

  @@index([locationId])
  @@index([isActive])
}
```

### 2.4 Product & Category

```prisma
model Category {
  id          String     @id @default(cuid())
  name        String
  description String?
  parentId    String?
  sortOrder   Int        @default(0)
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  products    Product[]

  @@index([parentId])
  @@index([isActive])
  @@index([sortOrder])
}

model Product {
  id            String        @id @default(cuid())
  sku           String        @unique
  barcode       String?
  name          String
  description   String?
  unit          ProductUnit   @default(UNIT)  // UNIT, KG, LITER
  categoryId    String
  minStock      Int           @default(0)
  maxStock      Int           @default(0)
  reorderPoint  Int           @default(0)
  isActive      Boolean       @default(true)
  imageUrl      String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  category      Category      @relation(fields: [categoryId], references: [id])
  inventories   Inventory[]
  invoiceLines  InvoiceLineItem[]
  transferLines TransferLineItem[]
  orderItems    OrderItem[]
  recipeItems   RecipeItem[]

  @@index([sku])
  @@index([barcode])
  @@index([categoryId])
  @@index([isActive])
  @@index([name])
}

enum ProductUnit {
  UNIT      // Unidade (und)
  KG        // Quilograma
  LITER     // Litro
  GRAM      // Grama
  MILLILITER // Mililitro
}
```

### 2.5 Inventory

```prisma
model Inventory {
  id          String      @id @default(cuid())
  productId   String
  locationId  String
  quantity    Int         @default(0)
  avgCost     Decimal     @db.Decimal(10, 2) @default(0)
  minLevel    Int         @default(0)
  maxLevel    Int         @default(0)
  lastRestock DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  product     Product     @relation(fields: [productId], references: [id])
  location    Location    @relation(fields: [locationId], references: [id])
  movements   InventoryMovement[]

  @@unique([productId, locationId])
  @@index([quantity])
  @@index([locationId])
}

model InventoryMovement {
  id              String              @id @default(cuid())
  inventoryId     String
  type            InventoryMovementType
  quantity        Int
  unitCost        Decimal             @db.Decimal(10, 2)
  referenceType   String?             // TRANSFER, ORDER, PURCHASE, ADJUSTMENT
  referenceId     String?
  notes           String?
  createdAt       DateTime            @default(now())
  createdById     String?

  inventory       Inventory           @relation(fields: [inventoryId], references: [id])
  createdBy       User?               @relation(fields: [createdById], references: [id])

  @@index([inventoryId])
  @@index([type])
  @@index([referenceType, referenceId])
  @@index([createdAt])
}

enum InventoryMovementType {
  IN           // Entrada (compra, transferencia recibida)
  OUT          // Salida (venta, transferencia enviada)
  ADJUSTMENT   // Ajuste de inventario
  RETURN       // Devolución
  DAMAGED      // Dañado/perdido
}
```

---

## 3. Supplier & Purchase Invoice

### 3.1 Supplier

```prisma
model Supplier {
  id          String           @id @default(cuid())
  name        String
  nif         String           @unique // NIF português
  address     String
  city        String
  postalCode  String
  country     String           @default("PT")
  phone       String?
  email       String?
  contactName String?
  paymentTerms String?         // NET30, NET60, etc.
  notes       String?
  isActive    Boolean          @default(true)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  invoices    PurchaseInvoice[]

  @@index([nif])
  @@index([name])
  @@index([isActive])
}
```

### 3.2 Purchase Invoice (Factura de Compra)

```prisma
model PurchaseInvoice {
  id            String            @id @default(cuid())
  invoiceNumber String            @unique
  supplierId    String
  locationId    String            // Donde se recibe la mercancía
  date          DateTime          @default(now())
  dueDate       DateTime?
  
  // Totales
  subtotal      Decimal           @db.Decimal(12, 2)
  vat6          Decimal           @db.Decimal(12, 2) @default(0)
  vat13         Decimal           @db.Decimal(12, 2) @default(0)
  vat23         Decimal           @db.Decimal(12, 2) @default(0)
  total         Decimal           @db.Decimal(12, 2)
  
  status        InvoiceStatus     @default(DRAFT)
  notes         String?
  attachmentUrl String?           // PDF de la factura
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  supplier      Supplier          @relation(fields: [supplierId], references: [id])
  location      Location          @relation(fields: [locationId], references: [id])
  lines         InvoiceLineItem[]

  @@index([invoiceNumber])
  @@index([supplierId])
  @@index([locationId])
  @@index([date])
  @@index([status])
}

enum InvoiceStatus {
  DRAFT         // Borrador
  RECEIVED      // Recibida (mercancía recibida)
  PAID          // Pagada
  CANCELLED     // Cancelada
}

model InvoiceLineItem {
  id              String          @id @default(cuid())
  invoiceId       String
  productId       String
  quantity        Int
  unitPrice       Decimal         @db.Decimal(10, 2)
  vatRate         VatRate
  vatAmount       Decimal         @db.Decimal(10, 2)
  total           Decimal         @db.Decimal(10, 2)
  lineNumber      Int
  notes           String?
  
  invoice         PurchaseInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  product         Product         @relation(fields: [productId], references: [id])

  @@index([invoiceId])
  @@index([productId])
}

enum VatRate {
  VAT_6    @map("6")
  VAT_13   @map("13")
  VAT_23   @map("23")
  VAT_0    @map("0")  // Exento
}
```

---

## 4. Transfer System

### 4.1 Transfer Request

```prisma
model Transfer {
  id              String          @id @default(cuid())
  transferNumber  String          @unique
  fromLocationId  String
  toLocationId    String
  status          TransferStatus  @default(PENDING)
  
  // Fechas
  requestedAt     DateTime        @default(now())
  approvedAt      DateTime?
  shippedAt       DateTime?
  receivedAt      DateTime?
  
  // Totales
  totalItems      Int             @default(0)
  totalQuantity   Int             @default(0)
  
  notes           String?
  shippingNotes   String?
  receivedNotes   String?
  
  requestedById   String
  approvedById    String?
  shippedById     String?
  receivedById    String?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  fromLocation    Location        @relation("TransferFromLocation", fields: [fromLocationId], references: [id])
  toLocation      Location        @relation("TransferToLocation", fields: [toLocationId], references: [id])
  requestedBy     User            @relation(fields: [requestedById], references: [id])
  approvedBy      User?           @relation(fields: [approvedById], references: [id])
  shippedBy       User?           @relation(fields: [shippedById], references: [id])
  receivedBy      User?           @relation(fields: [receivedById], references: [id])
  lines           TransferLineItem[]
  movements       InventoryMovement[]

  @@index([transferNumber])
  @@index([fromLocationId])
  @@index([toLocationId])
  @@index([status])
  @@index([requestedAt])
}

enum TransferStatus {
  PENDING       // Pendiente de aprobación
  APPROVED      // Aprobada
  REJECTED      // Rechazada
  IN_TRANSIT    // En tránsito
  RECEIVED      // Recibida
  CANCELLED     // Cancelada
}

model TransferLineItem {
  id          String    @id @default(cuid())
  transferId  String
  productId   String
  quantity    Int       @requested quantity
  receivedQty Int?      @default(0)  // Quantity received (can differ)
  unitCost    Decimal   @db.Decimal(10, 2)
  total       Decimal   @db.Decimal(10, 2)
  status      TransferLineStatus @default(PENDING)
  
  transfer    Transfer  @relation(fields: [transferId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productId], references: [id])

  @@index([transferId])
  @@index([productId])
}

enum TransferLineStatus {
  PENDING
  SHIPPED
  PARTIALLY_RECEIVED
  RECEIVED
  REJECTED
}
```

---

## 5. POS (Point of Sale)

### 5.1 Table Management

```prisma
model Table {
  id          String        @id @default(cuid())
  locationId  String
  number      String        // "1", "2", "A1", "A2", etc.
  capacity    Int           @default(4)
  status      TableStatus   @default(AVAILABLE)
  positionX   Int?          // Para layout visual
  positionY   Int?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  location    Location      @relation(fields: [locationId], references: [id])
  orders      Order[]

  @@unique([locationId, number])
  @@index([locationId])
  @@index([status])
}

enum TableStatus {
  AVAILABLE   // Disponible
  OCCUPIED    // Ocupada
  RESERVED    // Reservada
  INACTIVE    // Inactiva
}
```

### 5.2 Cash Register

```prisma
model CashRegister {
  id          String                @id @default(cuid())
  locationId  String
  name        String                // "Caja Principal", "Caja 2"
  isActive    Boolean               @default(true)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  location    Location              @relation(fields: [locationId], references: [id])
  movements   CashRegisterMovement[]

  @@index([locationId])
}

model CashRegisterMovement {
  id              String              @id @default(cuid())
  cashRegisterId  String
  type            CashMovementType
  amount          Decimal             @db.Decimal(10, 2)
  paymentMethod   PaymentMethod       @default(CASH)
  referenceId     String?             // Order.id if payment
  notes           String?
  createdAt       DateTime            @default(now())
  createdById     String

  cashRegister    CashRegister        @relation(fields: [cashRegisterId], references: [id])
  createdBy       User                @relation(fields: [createdById], references: [id])

  @@index([cashRegisterId])
  @@index([type])
  @@index([createdAt])
}

enum CashMovementType {
  OPEN        // Apertura de caja
  CLOSE       // Cierre de caja
  SALE        // Venta (entrada)
  RETURN      // Devolución (salida)
  EXPENSE     // Gasto (salida)
  DEPOSIT     // Depósito (entrada)
  WITHDRAW    // Retiro (salida)
}

enum PaymentMethod {
  CASH
  CARD
  MB_WAY      // Método português
  TRANSFER    // Transferencia
}
```

### 5.3 Order (Pedido)

```prisma
model Order {
  id              String          @id @default(cuid())
  orderNumber     String          @unique
  locationId      String
  tableId         String?
  employeeId      String?         // Quien atiende
  customerName    String?
  
  status          OrderStatus     @default(OPEN)
  
  // Totales
  subtotal        Decimal         @db.Decimal(10, 2) @default(0)
  discount        Decimal         @db.Decimal(10, 2) @default(0)
  total           Decimal         @db.Decimal(10, 2) @default(0)
  
  // Pagos
  paidAmount      Decimal         @db.Decimal(10, 2) @default(0)
  paymentMethod   PaymentMethod?
  paidAt          DateTime?
  
  // Tiempos
  openedAt        DateTime        @default(now())
  closedAt        DateTime?
  
  notes           String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  location        Location        @relation(fields: [locationId], references: [id])
  table           Table?          @relation(fields: [tableId], references: [id])
  employee        Employee?       @relation(fields: [employeeId], references: [id])
  items           OrderItem[]

  @@index([orderNumber])
  @@index([locationId])
  @@index([tableId])
  @@index([status])
  @@index([openedAt])
}

enum OrderStatus {
  OPEN        // Abierta (tomando orden)
  IN_PROGRESS // En preparación
  READY       // Lista para servir
  SERVED      // Servida
  PAID        // Pagada
  CANCELLED   // Cancelada
}

model OrderItem {
  id          String      @id @default(cuid())
  orderId     String
  productId   String
  quantity    Int
  unitPrice   Decimal     @db.Decimal(10, 2)
  discount    Decimal     @db.Decimal(10, 2) @default(0)
  total       Decimal     @db.Decimal(10, 2)
  status      OrderItemStatus @default(PENDING)
  notes       String?
  
  order       Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product     Product     @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@index([productId])
}

enum OrderItemStatus {
  PENDING
  PREPARING
  READY
  SERVED
  CANCELLED
}
```

---

## 6. Recipe System

### 6.1 Recipe

```prisma
model Recipe {
  id          String        @id @default(cuid())
  productId   String        // Product that is the "dish"
  name        String
  description String?
  yield       Int           @default(1) // Porciones que rinde
  prepTime    Int?          // Minutos
  cookTime    Int?          // Minutos
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  product     Product       @relation(fields: [productId], references: [id])
  items       RecipeItem[]

  @@index([productId])
  @@index([isActive])
}

model RecipeItem {
  id              String      @id @default(cuid())
  recipeId        String
  ingredientId    String      // Product que es ingrediente
  quantity        Decimal     @db.Decimal(10, 3) // Cantidad necesaria
  unit            ProductUnit @default(UNIT)
  notes           String?
  
  recipe          Recipe      @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ingredient      Product     @relation(fields: [ingredientId], references: [id])

  @@index([recipeId])
  @@index([ingredientId])
}
```

---

## 7. Audit & Logging

```prisma
model AuditLog {
  id          String      @id @default(cuid())
  userId      String?
  action      AuditAction
  entityType  String
  entityId    String
  oldValue    Json?
  newValue    Json?
  locationId  String?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now())

  user        User?       @relation(fields: [userId], references: [id])
  location    Location?   @relation(fields: [locationId], references: [id])

  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([locationId])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  TRANSFER_CREATE
  TRANSFER_APPROVE
  TRANSFER_SHIP
  TRANSFER_RECEIVE
  ORDER_CREATE
  ORDER_CLOSE
  CASH_OPEN
  CASH_CLOSE
  INVENTORY_ADJUST
}
```

---

## 8. Report & Analytics Tables (Optional - para dashboards)

```prisma
model DailySalesSummary {
  id          String      @id @default(cuid())
  locationId  String
  date        DateTime    @db.Date
  
  totalSales  Decimal     @db.Decimal(12, 2) @default(0)
  totalOrders Int         @default(0)
  avgTicket   Decimal     @db.Decimal(10, 2) @default(0)
  
  byPaymentMethod Json?   // Aggregated by payment type
  topProducts    Json?    // Top 10 products
  
  createdAt   DateTime    @default(now())

  @@unique([locationId, date])
  @@index([locationId])
  @@index([date])
}

model InventoryAlert {
  id          String        @id @default(cuid())
  productId   String
  locationId  String
  type        AlertType     // LOW_STOCK, BELOW_MIN, OVER_MAX
  quantity    Int
  createdAt   DateTime      @default(now())
  acknowledgedAt DateTime?
  
  product     Product       @relation(fields: [productId], references: [id])
  location    Location      @relation(fields: [locationId], references: [id])

  @@index([productId, locationId])
  @@index([acknowledgedAt])
}

enum AlertType {
  LOW_STOCK       // Bajo punto de reposición
  BELOW_MIN       // Por debajo del mínimo
  OVER_MAX        // Por encima del máximo
  OUT_OF_STOCK    // Sin stock
}
```

---

## 9. Indexes Summary

```sql
-- Performance indexes
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_role ON "User"(role);
CREATE INDEX idx_user_location_user ON "UserLocation"("userId");
CREATE INDEX idx_user_location_location ON "UserLocation"("locationId");

CREATE INDEX idx_location_type ON "Location"(type);
CREATE INDEX idx_location_active ON "Location"("isActive");

CREATE INDEX idx_product_sku ON "Product"(sku);
CREATE INDEX idx_product_barcode ON "Product"(barcode);
CREATE INDEX idx_product_category ON "Product"("categoryId");
CREATE INDEX idx_product_active ON "Product"(isActive);

CREATE INDEX idx_inventory_location_product ON "Inventory"("locationId", "productId");
CREATE INDEX idx_inventory_quantity ON "Inventory"(quantity);

CREATE INDEX idx_transfer_status ON "Transfer"(status);
CREATE INDEX idx_transfer_from ON "Transfer"("fromLocationId");
CREATE INDEX idx_transfer_to ON "Transfer"("toLocationId");
CREATE INDEX idx_transfer_date ON "Transfer"("requestedAt");

CREATE INDEX idx_order_status ON "Order"(status);
CREATE INDEX idx_order_location ON "Order"("locationId");
CREATE INDEX idx_order_table ON "Order"("tableId");
CREATE INDEX idx_order_date ON "Order"("openedAt");

CREATE INDEX idx_invoice_number ON "PurchaseInvoice"("invoiceNumber");
CREATE INDEX idx_invoice_supplier ON "PurchaseInvoice"("supplierId");
CREATE INDEX idx_invoice_status ON "PurchaseInvoice"(status);

CREATE INDEX idx_audit_entity ON "AuditLog"("entityType", "entityId");
CREATE INDEX idx_audit_user ON "AuditLog"("userId");
CREATE INDEX idx_audit_date ON "AuditLog"("createdAt");
```

---

## 10. Soft Deletes

Todos los modelos principales implementan soft deletes donde aplica:

- `isActive: Boolean` — Para Product, Category, Supplier, Location, User
- `deletedAt: DateTime?` — Para Order (canceled), Transfer (cancelled)

---

**Documento preparado por:** Tech Lead
**Fecha:** 2026-04-08