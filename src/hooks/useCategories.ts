"use client";

import { useState, useCallback, useEffect } from "react";
import { useBusiness } from "./useBusiness";

// Tipos para las categorías
interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order?: number;
}

interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}

// ============================================
// Hook Return Type
// ============================================

interface UseCategoriesReturn {
  // State
  categories: Category[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCategories: () => Promise<void>;
  createCategory: (data: CreateCategoryInput) => Promise<{ success: boolean; data?: Category; error?: string }>;
  updateCategory: (data: UpdateCategoryInput) => Promise<{ success: boolean; data?: Category; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;

  // Utility
  getCategoryById: (id: string) => Category | undefined;
  refreshCategories: () => Promise<void>;
}

// ============================================
// Hook
// ============================================

export function useCategories(): UseCategoriesReturn {
  const { selectedBusiness } = useBusiness();

  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Fetch Categories
  // ============================================

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/categories", {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `businessId=${selectedBusiness?.id}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar categorías");
      }

      setCategories(data.categories || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(err instanceof Error ? err.message : "Error al cargar categorías");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness?.id]);

  // ============================================
  // Create Category
  // ============================================

  const createCategory = useCallback(
    async (input: CreateCategoryInput) => {
      setIsLoading(true);

      try {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
          body: JSON.stringify(input),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al crear categoría");
        }

        // Add new category to state
        if (data.category) {
          setCategories((prev) => [...prev, data.category]);
        }

        return { success: true, data: data.category };
      } catch (err) {
        console.error("Error creating category:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al crear categoría";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // ============================================
  // Update Category
  // ============================================

  const updateCategory = useCallback(
    async (input: UpdateCategoryInput) => {
      setIsLoading(true);

      try {
        const res = await fetch(`/api/categories/${input.id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
          body: JSON.stringify(input),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al actualizar categoría");
        }

        // Update category in state
        if (data.category) {
          setCategories((prev) =>
            prev.map((c) => (c.id === data.category.id ? data.category : c))
          );
        }

        return { success: true, data: data.category };
      } catch (err) {
        console.error("Error updating category:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al actualizar categoría";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // ============================================
  // Delete Category
  // ============================================

  const deleteCategory = useCallback(
    async (id: string) => {
      setIsLoading(true);

      try {
        const res = await fetch(`/api/categories/${id}`, {
          method: "DELETE",
          headers: {
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al eliminar categoría");
        }

        // Remove category from state
        setCategories((prev) => prev.filter((c) => c.id !== id));

        return { success: true };
      } catch (err) {
        console.error("Error deleting category:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al eliminar categoría";
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

  const getCategoryById = useCallback(
    (id: string) => {
      return categories.find((c) => c.id === id);
    },
    [categories]
  );

  const refreshCategories = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  // ============================================
  // Effects
  // ============================================

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ============================================
  // Return Value
  // ============================================

  return {
    // State
    categories,
    isLoading,
    error,

    // Actions
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    clearError,

    // Utility
    getCategoryById,
    refreshCategories,
  };
}

export default useCategories;