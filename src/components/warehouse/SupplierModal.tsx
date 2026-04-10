"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: {
    id?: string;
    name: string;
    nif: string;
    email: string;
    phone: string;
    city: string;
    active: boolean;
  }) => void;
  initialData?: {
    id: string;
    name: string;
    nif: string;
    email: string;
    phone: string;
    city: string;
    active: boolean;
  };
}

export function SupplierModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: SupplierModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    nif: initialData?.nif || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    city: initialData?.city || "",
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
              <Building2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg">
              {initialData ? "Editar Proveedor" : "Nuevo Proveedor"}
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
            <Label htmlFor="nif" className="text-zinc-300">
              NIF / CIF *
            </Label>
            <Input
              id="nif"
              value={formData.nif}
              onChange={(e) => handleChange("nif", e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-white font-mono"
              placeholder="B-12345678"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="contacto@empresa.pt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-zinc-300">
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="+351 210 123 456"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-zinc-300">
                Ciudad
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="Lisboa"
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
            {initialData ? "Guardar Cambios" : "Crear Proveedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
