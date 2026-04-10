"use client";

import { useState, useCallback, useEffect } from "react";
import { useBusiness } from "./useBusiness";

// Tipos para los proveedores
interface Supplier {
  id: string;
  name: string;
  nif: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateSupplierInput {
  name: string;
  nif: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;
  notes?: string;
}

interface UpdateSupplierInput extends Partial<CreateSupplierInput> {
  id: string;
}

// ============================================
// Hook Return Type
// ============================================

interface UseSuppliersReturn {
  // State
  suppliers: Supplier[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSuppliers: () => Promise<void>;
  createSupplier: (data: CreateSupplierInput) => Promise<{ success: boolean; data?: Supplier; error?: string }>;
  updateSupplier: (data: UpdateSupplierInput) => Promise<{ success: boolean; data?: Supplier; error?: string }>;
  deleteSupplier: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;

  // Utility
  getSupplierById: (id: string) => Supplier | undefined;
  refreshSuppliers: () => Promise<void>;
}

// ============================================
// Hook
// ============================================

export function useSuppliers(): UseSuppliersReturn {
  const { selectedBusiness } = useBusiness();

  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Fetch Suppliers
  // ============================================

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/suppliers", {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `businessId=${selectedBusiness?.id}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar proveedores");
      }

      setSuppliers(data.suppliers || []);
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      setError(err instanceof Error ? err.message : "Error al cargar proveedores");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness?.id]);

  // ============================================
  // Create Supplier
  // ============================================

  const createSupplier = useCallback(
    async (input: CreateSupplierInput) => {
      setIsLoading(true);

      try {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
          body: JSON.stringify(input),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al crear proveedor");
        }

        // Add new supplier to state
        if (data.supplier) {
          setSuppliers((prev) => [...prev, data.supplier]);
        }

        return { success: true, data: data.supplier };
      } catch (err) {
        console.error("Error creating supplier:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al crear proveedor";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // ============================================
  // Update Supplier
  // ============================================

  const updateSupplier = useCallback(
    async (input: UpdateSupplierInput) => {
      setIsLoading(true);

      try {
        const res = await fetch(`/api/suppliers/${input.id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
          body: JSON.stringify(input),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al actualizar proveedor");
        }

        // Update supplier in state
        if (data.supplier) {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === data.supplier.id ? data.supplier : s))
          );
        }

        return { success: true, data: data.supplier };
      } catch (err) {
        console.error("Error updating supplier:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al actualizar proveedor";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // ============================================
  // Delete Supplier
  // ============================================

  const deleteSupplier = useCallback(
    async (id: string) => {
      setIsLoading(true);

      try {
        const res = await fetch(`/api/suppliers/${id}`, {
          method: "DELETE",
          headers: {
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al eliminar proveedor");
        }

        // Remove supplier from state
        setSuppliers((prev) => prev.filter((s) => s.id !== id));

        return { success: true };
      } catch (err) {
        console.error("Error deleting supplier:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al eliminar proveedor";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // ============================================
  // Utility Methods
  // ============================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getSupplierById = useCallback(
    (id: string) => {
      return suppliers.find((s) => s.id === id);
    },
    [suppliers]
  );

  const refreshSuppliers = useCallback(async () => {
    await fetchSuppliers();
  }, [fetchSuppliers]);

  // ============================================
  // Effects
  // ============================================

  // Fetch suppliers on mount
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ============================================
  // Return Value
  // ============================================

  return {
    // State
    suppliers,
    isLoading,
    error,

    // Actions
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    clearError,

    // Utility
    getSupplierById,
    refreshSuppliers,
  };
}

export default useSuppliers;