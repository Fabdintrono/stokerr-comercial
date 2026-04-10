"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: {
    id?: string;
    name: string;
    icon: string;
    color: string;
  }) => void;
  initialData?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

// Predefined color palette
const colors = [
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Ámbar" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#ef4444", label: "Rojo" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#6366f1", label: "Índigo" },
  { value: "#14b8a6", label: "Cian" },
];

export function CategoryModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: CategoryModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    icon: initialData?.icon || "📦",
    color: initialData?.color || "#10b981",
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
              <Tag className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg">
              {initialData ? "Editar Categoría" : "Nueva Categoría"}
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
            <Label className="text-zinc-300">Icono</Label>
            <div className="grid grid-cols-4 gap-2">
              {["📦", "🫒", "🥛", "🥩", "🍞", "🥚", "🥦", "🥕", "🍎", "🍇"].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleChange("icon", icon)}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-lg text-2xl transition-all",
                    formData.icon === icon
                      ? "bg-emerald-500/20 border border-emerald-500/50 ring-2 ring-emerald-500/30"
                      : "bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-700/50 hover:border-zinc-600"
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Color del tema</Label>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleChange("color", c.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                    formData.color === c.value
                      ? "bg-emerald-500/20 border-emerald-500/50 ring-2 ring-emerald-500/30"
                      : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: c.value }}
                  />
                  <span className="text-xs text-zinc-300">{c.label}</span>
                </button>
              ))}
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
            {initialData ? "Guardar Cambios" : "Crear Categoría"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
