"use client";

import { useState, useCallback, useEffect } from "react";
import {
  InventoryItem,
  InventoryMovement,
  CreateMovementInput,
  MovementFilters,
  ApiResponse,
} from "@/types/business";
import { useBusiness } from "./useBusiness";

// ============================================
// Hook Return Type
// ============================================

interface UseInventoryReturn {
  // State
  inventory: InventoryItem[];
  movements: InventoryMovement[];
  isLoading: boolean;
  isLoadingMovements: boolean;
  error: string | null;

  // Actions
  fetchInventory: (locationId?: string) => Promise<void>;
  getInventoryByLocation: (locationId: string) => Promise<InventoryItem[]>;
  fetchMovements: (filters: MovementFilters) => Promise<void>;
  createMovement: (data: CreateMovementInput) => Promise<{ success: boolean; data?: InventoryMovement; error?: string }>;
  adjustInventory: (productId: string, locationId: string, quantity: number, reason?: string) => Promise<{ success: boolean; error?: string }>;
  transferInventory: (productId: string, fromLocationId: string, toLocationId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;

  // Utility
  getInventoryByProduct: (productId: string) => InventoryItem | undefined;
  getTotalQuantity: (productId: string) => number;
  isLowStock: (item: InventoryItem) => boolean;
  getLowStockItems: () => InventoryItem[];
  refreshInventory: () => Promise<void>;
}

// ============================================
// Hook
// ============================================

export function useInventory(): UseInventoryReturn {
  const { selectedBusiness, selectedLocation } = useBusiness();

  // State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Fetch Inventory
  // ============================================

  const fetchInventory = useCallback(
    async (locationId?: string) => {
      if (!selectedBusiness) {
        setInventory([]);
        return;
      }

      const targetLocationId = locationId || selectedLocation?.id;
      if (!targetLocationId) {
        setInventory([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/businesses/${selectedBusiness.id}/inventory?locationId=${targetLocationId}`
        );
        const data: ApiResponse<InventoryItem[]> = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al cargar inventario");
        }

        setInventory(data.data || []);
      } catch (err) {
        console.error("Error fetching inventory:", err);
        setError(err instanceof Error ? err.message : "Error al cargar inventario");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness, selectedLocation]
  );

  // ============================================
  // Get Inventory By Location
  // ============================================

  const getInventoryByLocation = useCallback(
    async (locationId: string): Promise<InventoryItem[]> => {
      if (!selectedBusiness) {
        return [];
      }

      try {
        const res = await fetch(
          `/api/businesses/${selectedBusiness.id}/inventory?locationId=${locationId}`
        );
        const data: ApiResponse<InventoryItem[]> = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al cargar inventario");
        }

        return data.data || [];
      } catch (err) {
        console.error("Error fetching inventory by location:", err);
        return [];
      }
    },
    [selectedBusiness]
  );

  // ============================================
  // Fetch Movements
  // ============================================

  const fetchMovements = useCallback(
    async (filters: MovementFilters) => {
      if (!selectedBusiness) {
        setMovements([]);
        return;
      }

      setIsLoadingMovements(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        params.set("locationId", filters.locationId);
        if (filters.productId) params.set("productId", filters.productId);
        if (filters.type) params.set("type", filters.type);
        if (filters.startDate) params.set("startDate", filters.startDate.toISOString());
        if (filters.endDate) params.set("endDate", filters.endDate.toISOString());

        const res = await fetch(
          `/api/businesses/${selectedBusiness.id}/inventory/movements?${params.toString()}`
        );
        const data: ApiResponse<InventoryMovement[]> = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al cargar movimientos");
        }

        setMovements(data.data || []);
      } catch (err) {
        console.error("Error fetching movements:", err);
        setError(err instanceof Error ? err.message : "Error al cargar movimientos");
      } finally {
        setIsLoadingMovements(false);
      }
    },
    [selectedBusiness]
  );

  // ============================================
  // Create Movement
  // ============================================

  const createMovement = useCallback(
    async (input: CreateMovementInput) => {
      if (!selectedBusiness) {
        return { success: false, error: "No hay negocio seleccionado" };
      }

      setIsLoading(true);

      try {
        const res = await fetch(
          `/api/businesses/${selectedBusiness.id}/inventory/movements`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }
        );

        const data: ApiResponse<InventoryMovement> = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al crear movimiento");
        }

        // Refresh inventory after movement
        await fetchInventory();

        return { success: true, data: data.data };
      } catch (err) {
        console.error("Error creating movement:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al crear movimiento";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness, fetchInventory]
  );

  // ============================================
  // Adjust Inventory
  // ============================================

  const adjustInventory = useCallback(
    async (productId: string, locationId: string, quantity: number, reason?: string) => {
      const movement: CreateMovementInput = {
        productId,
        locationId,
        type: "ADJUST",
        quantity,
        reason: reason || "Ajuste manual",
      };

      return createMovement(movement);
    },
    [createMovement]
  );

  // ============================================
  // Transfer Inventory
  // ============================================

  const transferInventory = useCallback(
    async (productId: string, fromLocationId: string, toLocationId: string, quantity: number) => {
      if (!selectedBusiness) {
        return { success: false, error: "No hay negocio seleccionado" };
      }

      setIsLoading(true);

      try {
        const res = await fetch(
          `/api/businesses/${selectedBusiness.id}/inventory/transfer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId,
              fromLocationId,
              toLocationId,
              quantity,
            }),
          }
        );

        const data: ApiResponse<void> = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al transferir inventario");
        }

        // Refresh inventory after transfer
        await fetchInventory();

        return { success: true };
      } catch (err) {
        console.error("Error transferring inventory:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al transferir inventario";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness, fetchInventory]
  );

  // ============================================
  // Utility Methods
  // ============================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getInventoryByProduct = useCallback(
    (productId: string) => {
      return inventory.find((item) => item.productId === productId);
    },
    [inventory]
  );

  const getTotalQuantity = useCallback(
    (productId: string) => {
      const item = getInventoryByProduct(productId);
      return item?.quantity || 0;
    },
    [getInventoryByProduct]
  );

  const isLowStock = useCallback((item: InventoryItem): boolean => {
    return item.quantity <= item.minLevel;
  }, []);

  const getLowStockItems = useCallback(() => {
    return inventory.filter(isLowStock);
  }, [inventory, isLowStock]);

  const refreshInventory = useCallback(async () => {
    await fetchInventory();
  }, [fetchInventory]);

  // ============================================
  // Effects
  // ============================================

  // Fetch inventory when location changes
  useEffect(() => {
    if (selectedBusiness && selectedLocation) {
      fetchInventory();
    } else {
      setInventory([]);
    }
  }, [selectedBusiness, selectedLocation, fetchInventory]);

  // ============================================
  // Return Value
  // ============================================

  return {
    // State
    inventory,
    movements,
    isLoading,
    isLoadingMovements,
    error,

    // Actions
    fetchInventory,
    getInventoryByLocation,
    fetchMovements,
    createMovement,
    adjustInventory,
    transferInventory,
    clearError,

    // Utility
    getInventoryByProduct,
    getTotalQuantity,
    isLowStock,
    getLowStockItems,
    refreshInventory,
  };
}

export default useInventory;