"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: {
    id?: string;
    name: string;
    sku: string;
    categoryId: string;
    unit: string;
    currentStock: number;
    minStock: number;
    active: boolean;
  }) => void;
  initialData?: {
    id: string;
    name: string;
    sku: string;
    categoryId: string;
    unit: string;
    currentStock: number;
    minStock: number;
    active: boolean;
  };
  categories?: { id: string; name: string }[];
}

export function ProductModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories = [],
}: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    sku: initialData?.sku || "",
    categoryId: initialData?.categoryId || (categories[0]?.id || "1"),
    unit: initialData?.unit || "kg",
    currentStock: initialData?.currentStock ?? 0,
    minStock: initialData?.minStock ?? 10,
    active: initialData?.active ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simular llamada API
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    onSave({
      id: initialData?.id,
      ...formData,
    });
    
    setIsSubmitting(false);
    onClose();
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
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
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">
              Nombre *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku" className="text-zinc-300">
              SKU *
            </Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white font-mono"
              placeholder="HAR-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId" className="text-zinc-300">
              Categoría *
            </Label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => handleChange("categoryId", e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit" className="text-zinc-300">
                Unidad *
              </Label>
              <select
                id="unit"
                value={formData.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="un">unidades</option>
                <option value="g">g</option>
                <option value="ml">ml</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock" className="text-zinc-300">
                Stock Mínimo *
              </Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => handleChange("minStock", parseInt(e.target.value) || 0)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentStock" className="text-zinc-300">
                Stock Actual *
              </Label>
              <Input
                id="currentStock"
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => handleChange("currentStock", parseInt(e.target.value) || 0)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Estado</Label>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleChange("active", true)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    formData.active
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                      : "bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  Activo
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("active", false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    !formData.active
                      ? "bg-zinc-700/50 text-zinc-400 border border-zinc-600"
                      : "bg-zinc-800/50 text-zinc-500 border border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  <div className="h-2 w-2 rounded-full bg-zinc-400" />
                  Inactivo
                </button>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-4">
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
