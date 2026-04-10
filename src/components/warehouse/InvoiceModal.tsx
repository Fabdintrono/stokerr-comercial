"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
  nif: string;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  vatRate: string;
  vatAmount: number;
  total: number;
}

interface Invoice {
  id?: string;
  number?: string;
  supplierId?: string;
  supplier?: string;
  date?: string;
  dueDate?: string;
  status?: string;
  totalNet?: number;
  totalVat?: number;
  totalGross?: number;
  items?: InvoiceItem[];
}

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  suppliers: Supplier[];
  products: Product[];
  onSave: (data: Partial<Invoice>) => void;
}

const VAT_RATES = [
  { value: "SIX", label: "6%", multiplier: 0.06 },
  { value: "THIRTEEN", label: "13%", multiplier: 0.13 },
  { value: "TWENTY_THREE", label: "23%", multiplier: 0.23 },
];

export function InvoiceModal({
  open,
  onOpenChange,
  invoice,
  suppliers,
  products,
  onSave,
}: InvoiceModalProps) {
  const [formData, setFormData] = useState<Partial<Invoice>>({
    supplierId: "",
    date: new Date().toISOString().split("T")[0],
    items: [],
  });

  useEffect(() => {
    if (invoice) {
      setFormData(invoice);
    } else {
      setFormData({
        supplierId: "",
        date: new Date().toISOString().split("T")[0],
        items: [],
      });
    }
  }, [invoice, open]);

  const calculateTotals = (items: InvoiceItem[]) => {
    const totalNet = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalVat = items.reduce((sum, item) => sum + item.vatAmount, 0);
    const totalGross = totalNet + totalVat;
    return { totalNet, totalVat, totalGross };
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      productId: "",
      productName: "",
      quantity: 1,
      unitPrice: 0,
      vatRate: "THIRTEEN",
      vatAmount: 0,
      total: 0,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setFormData((prev) => {
      const items = [...(prev.items || [])];
      const item = { ...items[index] };

      if (field === "productId") {
        const product = products.find((p) => p.id === value);
        item.productId = value as string;
        item.productName = product?.name || "";
      } else if (field === "quantity" || field === "unitPrice") {
        item[field] = value as number;
      } else if (field === "vatRate") {
        item.vatRate = value as "SIX" | "THIRTEEN" | "TWENTY_THREE";
      }

      // Calculate VAT and total
      const vatMultiplier =
        VAT_RATES.find((r) => r.value === item.vatRate)?.multiplier || 0.13;
      const netAmount = item.quantity * item.unitPrice;
      item.vatAmount = netAmount * vatMultiplier;
      item.total = netAmount + item.vatAmount;

      items[index] = item;
      const totals = calculateTotals(items);

      return {
        ...prev,
        items,
        ...totals,
      };
    });
  };

  const handleSubmit = () => {
    const supplier = suppliers.find((s) => s.id === formData.supplierId);
    onSave({
      ...formData,
      supplier: supplier?.name,
    });
  };

  const totals = calculateTotals(formData.items || []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>
            {invoice ? "Editar Factura" : "Nueva Factura"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Supplier and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Select
                value={formData.supplierId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, supplierId: value }))
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {suppliers.map((supplier) => (
                    <SelectItem
                      key={supplier.id}
                      value={supplier.id}
                      className="text-white hover:bg-zinc-700"
                    >
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Items de Factura</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="border-zinc-700 text-zinc-300 hover:text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Item
              </Button>
            </div>

            {(formData.items || []).length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                No hay items. Agrega productos a la factura.
              </div>
            ) : (
              <div className="space-y-4">
                {(formData.items || []).map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-end p-4 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="col-span-12 md:col-span-4 space-y-2">
                      <Label className="text-xs text-zinc-400">Producto</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) =>
                          handleItemChange(index, "productId", value)
                        }
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {products.map((product) => (
                            <SelectItem
                              key={product.id}
                              value={product.id}
                              className="text-white hover:bg-zinc-700"
                            >
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-4 md:col-span-2 space-y-2">
                      <Label className="text-xs text-zinc-400">Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)
                        }
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>

                    <div className="col-span-4 md:col-span-2 space-y-2">
                      <Label className="text-xs text-zinc-400">Precio</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>

                    <div className="col-span-4 md:col-span-2 space-y-2">
                      <Label className="text-xs text-zinc-400">IVA</Label>
                      <Select
                        value={item.vatRate}
                        onValueChange={(value) =>
                          handleItemChange(index, "vatRate", value)
                        }
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {VAT_RATES.map((rate) => (
                            <SelectItem
                              key={rate.value}
                              value={rate.value}
                              className="text-white hover:bg-zinc-700"
                            >
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-10 md:col-span-1 space-y-2">
                      <Label className="text-xs text-zinc-400">Total</Label>
                      <div className="text-white font-medium py-2">
                        {item.total.toFixed(2)}€
                      </div>
                    </div>

                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            {(formData.items || []).length > 0 && (
              <div className="flex justify-end gap-4 pt-4 border-t border-zinc-800">
                <div className="text-right space-y-1">
                  <div className="text-zinc-400 text-sm">
                    Neto: {totals.totalNet.toFixed(2)}€
                  </div>
                  <div className="text-zinc-400 text-sm">
                    IVA: {totals.totalVat.toFixed(2)}€
                  </div>
                  <div className="text-white text-lg font-bold">
                    Total: {totals.totalGross.toFixed(2)}€
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700 text-zinc-300 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {invoice ? "Guardar Cambios" : "Crear Factura"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}