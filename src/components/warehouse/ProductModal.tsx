"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Loader2, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: {
    id?: string;
    name: string;
    sku: string;
    categoryId: string;
    brandId?: string;
    unit: string;
    currentStock: number;
    minStock: number;
    costPrice: number;
    salePrice: number;
    vatRate: number;
    active: boolean;
    showInPos: boolean;
  }) => void;
  initialData?: {
    id: string;
    name: string;
    sku: string;
    categoryId: string;
    brandId?: string;
    unit: string;
    currentStock: number;
    minStock: number;
    costPrice: number;
    salePrice: number;
    vatRate: number;
    active: boolean;
    showInPos: boolean;
  };
  categories?: { id: string; name: string; parentId?: string | null; children?: { id: string; name: string }[] }[];
  brands?: { id: string; name: string }[];
}

export function ProductModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
  brands = [],
}: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    sku: initialData?.sku || "",
    categoryId: initialData?.categoryId || categories[0]?.id || "",
    brandId: initialData?.brandId || "",
    unit: initialData?.unit || "UNIT",
    currentStock: initialData?.currentStock ?? 0,
    minStock: initialData?.minStock ?? 0,
    costPrice: initialData?.costPrice ?? 0,
    salePrice: initialData?.salePrice ?? 0,
    vatRate: initialData?.vatRate ?? 23,
    active: initialData?.active ?? true,
    showInPos: initialData?.showInPos ?? false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!formData.categoryId && categories[0]?.id) {
      setFormData((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories]);

  // Auto-calculate margin display
  const margin = formData.costPrice > 0
    ? (((formData.salePrice - formData.costPrice) / formData.costPrice) * 100).toFixed(1)
    : "0.0";

  const handleMarginChange = (val: string) => {
    const m = parseFloat(val) || 0;
    if (formData.costPrice > 0) {
      const newSalePrice = formData.costPrice * (1 + m / 100);
      setFormData((prev) => ({ ...prev, salePrice: Math.round(newSalePrice * 100) / 100 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSave({ id: initialData?.id, ...formData });
    setIsSubmitting(false);
    onClose();
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Flatten categories: top-level first, then children indented
  const categoryOptions: { id: string; label: string }[] = [];
  categories.forEach((cat) => {
    if (!cat.parentId) {
      categoryOptions.push({ id: cat.id, label: cat.name });
      (cat.children || []).forEach((child) => {
        categoryOptions.push({ id: child.id, label: `  └ ${child.name}` });
      });
    }
  });
  // Add any category not already included (edge case: parentId category without parent loaded)
  categories.forEach((cat) => {
    if (cat.parentId && !categoryOptions.find((o) => o.id === cat.id)) {
      categoryOptions.push({ id: cat.id, label: cat.name });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl w-full">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Package className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg">
              {initialData ? "Editar Producto" : "Nuevo Producto"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Name + SKU */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-zinc-300 text-xs">Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">SKU *</Label>
              <Input
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white font-mono h-9"
                placeholder="HAR-001"
                required
              />
            </div>
          </div>

          {/* Row 2: Category + Brand + Unit */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Categoría *</Label>
              <select
                value={formData.categoryId}
                onChange={(e) => handleChange("categoryId", e.target.value)}
                required
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-9"
              >
                {!formData.categoryId && <option value="">Seleccionar...</option>}
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Marca</Label>
              <select
                value={formData.brandId}
                onChange={(e) => handleChange("brandId", e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-9"
              >
                <option value="">Sin marca</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Unidad *</Label>
              <select
                value={formData.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-9"
              >
                <option value="UNIT">Unidades</option>
                <option value="KG">kg</option>
                <option value="G">g</option>
                <option value="L">L</option>
                <option value="ML">ml</option>
                <option value="BOX">Caja</option>
                <option value="CASE">Case</option>
                <option value="GARRAFA">Garrafa</option>
              </select>
            </div>
          </div>

          {/* Row 3: Pricing */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-800/20 p-3 space-y-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Precios</p>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Precio Costo (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => handleChange("costPrice", parseFloat(e.target.value) || 0)}
                  className="bg-zinc-800/50 border-zinc-700 text-white h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Precio Venta (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => handleChange("salePrice", parseFloat(e.target.value) || 0)}
                  className="bg-zinc-800/50 border-zinc-700 text-white h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">Margen (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={margin}
                  onChange={(e) => handleMarginChange(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-amber-400 h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-xs">IVA (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.vatRate}
                  onChange={(e) => handleChange("vatRate", parseFloat(e.target.value) || 0)}
                  className="bg-zinc-800/50 border-zinc-700 text-white h-9"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Stock + Status + showInPos */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Stock Mínimo</Label>
              <Input
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => handleChange("minStock", parseInt(e.target.value) || 0)}
                className="bg-zinc-800/50 border-zinc-700 text-white h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Stock Actual</Label>
              <Input
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => handleChange("currentStock", parseInt(e.target.value) || 0)}
                className="bg-zinc-800/50 border-zinc-700 text-white h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Estado</Label>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleChange("active", true)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    formData.active
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                      : "bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Activo
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("active", false)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    !formData.active
                      ? "bg-zinc-700/50 text-zinc-400 border border-zinc-600"
                      : "bg-zinc-800/50 text-zinc-500 border border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Inactivo
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs">Mostrar en POS</Label>
              <button
                type="button"
                onClick={() => handleChange("showInPos", !formData.showInPos)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border mt-1",
                  formData.showInPos
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                    : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                {formData.showInPos ? "Visible" : "Oculto"}
              </button>
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {initialData ? "Guardar Cambios" : "Crear Producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
