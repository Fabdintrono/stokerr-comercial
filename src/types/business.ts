// ============================================
// Business Types
// ============================================

export type Plan = "STARTER" | "GROWTH" | "ENTERPRISE";

export type BusinessRole = "OWNER" | "MANAGER" | "ACCOUNTANT";

export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export interface Business {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  active: boolean;
  maxRestaurants: number;
  maxUsers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBusiness {
  id: string;
  userId: string;
  businessId: string;
  role: BusinessRole;
  createdAt: Date;
  business?: Business;
}

export interface BusinessWithRole extends Business {
  role: BusinessRole;
  userBusinessId: string;
}

// ============================================
// Location Types
// ============================================

export type LocationType = "WAREHOUSE" | "RESTAURANT";

export type LocationRole =
  | "WAREHOUSE_MANAGER"
  | "RESTAURANT_MANAGER"
  | "WAITER"
  | "CASHIER"
  | "KITCHEN"
  | "STAFF";

export interface Location {
  id: string;
  businessId: string | null;
  name: string;
  slug: string | null;
  type: LocationType;
  address: string;
  city: string;
  postalCode: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLocation {
  id: string;
  userId: string;
  locationId: string;
  role: LocationRole;
  isPrimary: boolean;
  createdAt: Date;
  location?: Location;
}

export interface LocationWithRole extends Location {
  role: LocationRole;
  userLocationId: string;
  isPrimary: boolean;
}

// ============================================
// Category Types
// ============================================

export interface Category {
  id: string;
  businessId: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Product Types
// ============================================

export interface Product {
  id: string;
  businessId: string | null;
  sku: string;
  name: string;
  namePt: string | null;
  nameEs: string | null;
  description: string | null;
  unit: string;
  minStock: number;
  maxStock: number | null;
  barcode: string | null;
  image: string | null;
  active: boolean;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
}

export interface ProductWithInventory extends Product {
  inventory?: InventoryItem;
}

// ============================================
// Inventory Types
// ============================================

export type MovementType = "IN" | "OUT" | "ADJUST" | "RETURN";

export interface InventoryItem {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  avgCost: number;
  minLevel: number;
  maxLevel: number | null;
  lastRestock: Date | null;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  locationId: string;
  type: MovementType;
  quantity: number;
  reason: string | null;
  reference: string | null;
  referenceType: string | null;
  userId: string | null;
  createdAt: Date;
  product?: Product;
}

export interface CreateMovementInput {
  productId: string;
  locationId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  referenceType?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Filter Types
// ============================================

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  active?: boolean;
  lowStock?: boolean;
}

export interface InventoryFilters {
  locationId: string;
  productId?: string;
  lowStock?: boolean;
}

export interface MovementFilters {
  locationId: string;
  productId?: string;
  type?: MovementType;
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// Form Input Types
// ============================================

export interface CreateProductInput {
  sku: string;
  name: string;
  namePt?: string;
  nameEs?: string;
  description?: string;
  unit: string;
  minStock?: number;
  maxStock?: number;
  barcode?: string;
  image?: string;
  categoryId?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}