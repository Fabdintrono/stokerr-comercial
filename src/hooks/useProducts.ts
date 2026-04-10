"use client";

import { useState, useCallback, useEffect } from "react";
import { useBusiness } from "./useBusiness";

// Tipos para los productos
interface Product {
  id: string;
  sku: string;
  name: string;
  namePt?: string;
  nameEs?: string;
  description?: string;
  unit: string;
  minStock?: number;
  maxStock?: number;
  barcode?: string;
  categoryId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  };
}

interface CreateProductInput {
  sku: string;
  name: string;
  namePt?: string;
  nameEs?: string;
  description?: string;
  unit: string;
  minStock?: number;
  maxStock?: number;
  barcode?: string;
  categoryId?: string;
}

interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

// ============================================
// Hook Return Type
// ============================================

interface UseProductsReturn {
  // State
  products: Product[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProducts: (search?: string) => Promise<void>;
  createProduct: (data: CreateProductInput) => Promise<{ success: boolean; data?: Product; error?: string }>;
  updateProduct: (data: UpdateProductInput) => Promise<{ success: boolean; data?: Product; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;

  // Utility
  getProductById: (id: string) => Product | undefined;
  refreshProducts: () => Promise<void>;
}

// ============================================
// Hook
// ============================================

export function useProducts(): UseProductsReturn {
  const { selectedBusiness } = useBusiness();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Fetch Products
  // ============================================

  const fetchProducts = useCallback(async (search?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = search ? `/api/products?search=${encodeURIComponent(search)}` : "/api/products";
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `businessId=${selectedBusiness?.id}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar productos");
      }

      setProducts(data.products || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Error al cargar productos");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness?.id]);

  // ============================================
  // Create Product
  // ============================================

  const createProduct = useCallback(
    async (input: CreateProductInput) => {
      setIsLoading(true);

      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
          body: JSON.stringify(input),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al crear producto");
        }

        // Add new product to state
        if (data.product) {
          setProducts((prev) => [...prev, data.product]);
        }

        return { success: true, data: data.product };
      } catch (err) {
        console.error("Error creating product:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al crear producto";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // ============================================
  // Update Product
  // ============================================

  const updateProduct = useCallback(
    async (input: UpdateProductInput) => {
      setIsLoading(true);

      try {
        const res = await fetch(`/api/products/${input.id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
          body: JSON.stringify(input),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al actualizar producto");
        }

        // Update product in state
        if (data.product) {
          setProducts((prev) =>
            prev.map((p) => (p.id === data.product.id ? data.product : p))
          );
        }

        return { success: true, data: data.product };
      } catch (err) {
        console.error("Error updating product:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al actualizar producto";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // ============================================
  // Delete Product
  // ============================================

  const deleteProduct = useCallback(
    async (id: string) => {
      setIsLoading(true);

      try {
        const res = await fetch(`/api/products/${id}`, {
          method: "DELETE",
          headers: {
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al eliminar producto");
        }

        // Remove product from state
        setProducts((prev) => prev.filter((p) => p.id !== id));

        return { success: true };
      } catch (err) {
        console.error("Error deleting product:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al eliminar producto";
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

  const getProductById = useCallback(
    (id: string) => {
      return products.find((p) => p.id === id);
    },
    [products]
  );

  const refreshProducts = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  // ============================================
  // Effects
  // ============================================

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ============================================
  // Return Value
  // ============================================

  return {
    // State
    products,
    isLoading,
    error,

    // Actions
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    clearError,

    // Utility
    getProductById,
    refreshProducts,
  };
}

export default useProducts;