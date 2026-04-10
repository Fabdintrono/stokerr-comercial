"use client";

import { useState, useCallback, useEffect } from "react";
import { useBusiness } from "./useBusiness";

// Tipos para los items de una factura
interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  unitPrice: number;
  vatRate: "SIX" | "THIRTEEN" | "TWENTY_THREE";
  vatAmount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

// Tipos para las facturas de compra
interface PurchaseInvoice {
  id: string;
  number: string;
  supplierId: string;
  supplier?: {
    id: string;
    name: string;
    nif: string;
  };
  locationId?: string;
  location?: {
    id: string;
    name: string;
  };
  date: string;
  dueDate?: string;
  notes?: string;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  status?: string;
  lineItems: InvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
}

interface CreateInvoiceLineItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  vatRate: "SIX" | "THIRTEEN" | "TWENTY_THREE";
}

interface CreateInvoiceInput {
  number: string;
  supplierId: string;
  date: string;
  dueDate?: string;
  notes?: string;
  lineItems: CreateInvoiceLineItemInput[];
}

interface UpdateInvoiceInput extends Partial<CreateInvoiceInput> {
  id: string;
}

// ============================================
// Hook Return Type
// ============================================

interface UseInvoicesReturn {
  // State
  invoices: PurchaseInvoice[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchInvoices: () => Promise<void>;
  createInvoice: (data: CreateInvoiceInput) => Promise<{ success: boolean; data?: PurchaseInvoice; error?: string }>;
  updateInvoice: (data: UpdateInvoiceInput) => Promise<{ success: boolean; data?: PurchaseInvoice; error?: string }>;
  deleteInvoice: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;

  // Utility
  getInvoiceById: (id: string) => PurchaseInvoice | undefined;
  refreshInvoices: () => Promise<void>;
}

// ============================================
// Hook
// ============================================

export function useInvoices(): UseInvoicesReturn {
  const { selectedBusiness } = useBusiness();

  // State
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Fetch Invoices
  // ============================================

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/purchase-invoices", {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `businessId=${selectedBusiness?.id}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar facturas");
      }

      setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(err instanceof Error ? err.message : "Error al cargar facturas");
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness?.id]);

  // ============================================
  // Create Invoice
  // ============================================

  const createInvoice = useCallback(
    async (input: CreateInvoiceInput) => {
      setIsLoading(true);

      try {
        const res = await fetch("/api/purchase-invoices", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
          body: JSON.stringify(input),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al crear factura");
        }

        // Add new invoice to state
        if (data.invoice) {
          setInvoices((prev) => [...prev, data.invoice]);
        }

        return { success: true, data: data.invoice };
      } catch (err) {
        console.error("Error creating invoice:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al crear factura";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // ============================================
  // Update Invoice
  // ============================================

  const updateInvoice = useCallback(
    async (input: UpdateInvoiceInput) => {
      setIsLoading(true);

      try {
        const res = await fetch(`/api/purchase-invoices/${input.id}`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
          body: JSON.stringify(input),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al actualizar factura");
        }

        // Update invoice in state
        if (data.invoice) {
          setInvoices((prev) =>
            prev.map((i) => (i.id === data.invoice.id ? data.invoice : i))
          );
        }

        return { success: true, data: data.invoice };
      } catch (err) {
        console.error("Error updating invoice:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al actualizar factura";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [selectedBusiness?.id]
  );

  // ============================================
  // Delete Invoice
  // ============================================

  const deleteInvoice = useCallback(
    async (id: string) => {
      setIsLoading(true);

      try {
        const res = await fetch(`/api/purchase-invoices/${id}`, {
          method: "DELETE",
          headers: {
            'Cookie': `businessId=${selectedBusiness?.id}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error al eliminar factura");
        }

        // Remove invoice from state
        setInvoices((prev) => prev.filter((i) => i.id !== id));

        return { success: true };
      } catch (err) {
        console.error("Error deleting invoice:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al eliminar factura";
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

  const getInvoiceById = useCallback(
    (id: string) => {
      return invoices.find((i) => i.id === id);
    },
    [invoices]
  );

  const refreshInvoices = useCallback(async () => {
    await fetchInvoices();
  }, [fetchInvoices]);

  // ============================================
  // Effects
  // ============================================

  // Fetch invoices on mount
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ============================================
  // Return Value
  // ============================================

  return {
    // State
    invoices,
    isLoading,
    error,

    // Actions
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    clearError,

    // Utility
    getInvoiceById,
    refreshInvoices,
  };
}

export default useInvoices;