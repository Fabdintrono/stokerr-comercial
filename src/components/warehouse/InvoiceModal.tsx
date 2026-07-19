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
import { Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { variantDisplayName } from "@/lib/variants/displayName";
import { effectiveCost } from "@/lib/variants/pricing";

interface Variant {
  id: string;
  attributes: Record<string, string>;
  sku?: string | null;
  costPrice?: string | null;
  salePrice?: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  hasVariants?: boolean;
  hasBatches?: boolean;
  costPrice?: number;
}

interface Supplier {
  id: string;
  name: string;
  nif: string;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  variantId?: string;
  lotNumber?: string;
  expiryDate?: string;
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

  // Variant picker state: maps item index → { variants, loading, selectedId }
  const [variantState, setVariantState] = useState<Record<number, {
    variants: Variant[];
    loading: boolean;
    selectedId: string;
  }>>({});

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
    setVariantState({});
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
    setVariantState(vs => {
      const next: typeof vs = {};
      Object.entries(vs).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
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
        item.variantId = undefined;
        item.lotNumber = undefined;
        item.expiryDate = undefined;

        if (product?.hasVariants) {
          // Trigger variant fetch for this item index
          setVariantState(vs => ({
            ...vs,
            [index]: { variants: [], loading: true, selectedId: "" },
          }));
          fetch(`/api/variants?productId=${product.id}`)
            .then(r => r.json())
            .then(d => setVariantState(vs => ({
              ...vs,
              [index]: { variants: d.variants ?? [], loading: false, selectedId: "" },
            })))
            .catch(() => setVariantState(vs => ({
              ...vs,
              [index]: { variants: [], loading: false, selectedId: "" },
            })));
        } else {
          // Clear variant state for this index
          setVariantState(vs => { const next = { ...vs }; delete next[index]; return next; });
          // Use cost price as default unit price for purchase invoice
          if (product?.costPrice != null && product.costPrice > 0) {
            item.unitPrice = product.costPrice;
          }
        }
      } else if (field === "quantity" || field === "unitPrice") {
        item[field] = value as number;
      } else if (field === "vatRate") {
        item.vatRate = value as "SIX" | "THIRTEEN" | "TWENTY_THREE";
      } else if (field === "lotNumber") {
        item.lotNumber = value as string;
      } else if (field === "expiryDate") {
        item.expiryDate = value as string;
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

  const confirmVariantForItem = (index: number) => {
    const vs = variantState[index];
    if (!vs?.selectedId) return;
    const variant = vs.variants.find(v => v.id === vs.selectedId);
    if (!variant) return;
    const product = products.find(p => {
      const items = formData.items || [];
      return p.id === items[index]?.productId;
    });
    const costStr = effectiveCost(variant, { costPrice: String(product?.costPrice ?? 0) });
    const cost = Number(costStr);
    const label = variantDisplayName(variant.attributes) + (variant.sku ? ` (${variant.sku})` : "");

    setFormData((prev) => {
      const items = [...(prev.items || [])];
      const item = { ...items[index] };
      item.variantId = variant.id;
      item.productName = `${item.productName} — ${label}`;
      if (cost > 0) item.unitPrice = cost;
      const vatMultiplier = VAT_RATES.find(r => r.value === item.vatRate)?.multiplier || 0.13;
      const netAmount = item.quantity * item.unitPrice;
      item.vatAmount = netAmount * vatMultiplier;
      item.total = netAmount + item.vatAmount;
      items[index] = item;
      const totals = calculateTotals(items);
      return { ...prev, items, ...totals };
    });
    // Remove from pending variant state
    setVariantState(vs2 => { const next = { ...vs2 }; delete next[index]; return next; });
  };

  const handleSubmit = () => {
    const supplier = suppliers.find((s) => s.id === formData.supplierId);
    onSave({
      ...formData,
      items: (formData.items || []).map(item => ({
        ...item,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        ...(item.lotNumber ? { lotNumber: item.lotNumber } : {}),
        ...(item.expiryDate ? { expiryDate: item.expiryDate } : {}),
      })),
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
                              {product.name} ({product.sku}){product.hasVariants ? " ✦" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Variant picker for this item */}
                      {variantState[index] && (
                        <div className={cn(
                          "mt-2 p-3 rounded-lg border space-y-2",
                          item.variantId
                            ? "border-emerald-600/40 bg-emerald-950/20"
                            : "border-amber-600/40 bg-amber-950/20"
                        )}>
                          <Label className="text-xs text-zinc-400">Seleccionar variante</Label>
                          {variantState[index].loading ? (
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                              <Loader2 className="h-3 w-3 animate-spin" /> Cargando variantes…
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <Select
                                value={variantState[index].selectedId}
                                onValueChange={(val) =>
                                  setVariantState(vs => ({
                                    ...vs,
                                    [index]: { ...vs[index], selectedId: val },
                                  }))
                                }
                              >
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 flex-1">
                                  <SelectValue placeholder="Elige variante…" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                  {variantState[index].variants.map(v => {
                                    const product = products.find(p => p.id === item.productId);
                                    const cost = Number(effectiveCost(v, { costPrice: String(product?.costPrice ?? 0) }));
                                    const label = variantDisplayName(v.attributes) + (v.sku ? ` · ${v.sku}` : "") + (cost > 0 ? ` — ${cost.toFixed(2)}€` : "");
                                    return (
                                      <SelectItem key={v.id} value={v.id} className="text-white hover:bg-zinc-700">
                                        {label}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="sm"
                                disabled={!variantState[index]?.selectedId}
                                onClick={() => confirmVariantForItem(index)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
                              >
                                OK
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Batch inputs: lote + vencimiento */}
                      {products.find(p => p.id === item.productId)?.hasBatches && (
                        <div className="mt-2 p-3 rounded-lg border border-violet-600/40 bg-violet-950/20 space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-400">Lote</Label>
                            <Input
                              type="text"
                              placeholder="Nº de lote"
                              value={item.lotNumber || ""}
                              onChange={(e) =>
                                handleItemChange(index, "lotNumber", e.target.value)
                              }
                              className="bg-zinc-800 border-zinc-700 h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-zinc-400">Fecha de vencimiento</Label>
                            <Input
                              type="date"
                              value={item.expiryDate || ""}
                              onChange={(e) =>
                                handleItemChange(index, "expiryDate", e.target.value)
                              }
                              className="bg-zinc-800 border-zinc-700 h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
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