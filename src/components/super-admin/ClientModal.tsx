"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";

interface ExistingBusiness { id: string; name: string; }

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateClientData | EditClientData) => void;
  initialData?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    maxRestaurants: number;
    maxUsers: number;
    active: boolean;
  };
}

export interface CreateClientData {
  businessName?: string;
  slug?: string;
  plan?: string;
  maxRestaurants?: number;
  maxUsers?: number;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone: string;
  ownerRole: string;
  warehouseName: string;
  warehouseCity: string;
  existingBusinessId?: string;
}

export interface EditClientData {
  id: string;
  name: string;
  plan: string;
  maxRestaurants: number;
  maxUsers: number;
  active: boolean;
}

const planDefaults: Record<string, { maxRestaurants: number; maxUsers: number }> = {
  STARTER: { maxRestaurants: 2, maxUsers: 5 },
  GROWTH: { maxRestaurants: 5, maxUsers: 15 },
  ENTERPRISE: { maxRestaurants: 20, maxUsers: 50 },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ClientModal({ isOpen, onClose, onSave, initialData }: ClientModalProps) {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState({
    businessName: "",
    slug: "",
    plan: "STARTER",
    maxRestaurants: 2,
    maxUsers: 5,
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerPhone: "",
    ownerRole: "WAREHOUSE_MANAGER",
    warehouseName: "Armazem Central",
    warehouseCity: "",
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);
  const [existingBusinesses, setExistingBusinesses] = useState<ExistingBusiness[]>([]);
  const [existingBusinessId, setExistingBusinessId] = useState("");

  useEffect(() => {
    // Load existing businesses for restaurant linking
    fetch("/api/admin/clients").then(r => r.json()).then(d => {
      setExistingBusinesses((d.clients || []).map((c: any) => ({ id: c.id, name: c.name })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        businessName: initialData.name,
        slug: initialData.slug,
        plan: initialData.plan,
        maxRestaurants: initialData.maxRestaurants,
        maxUsers: initialData.maxUsers,
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
        ownerPhone: "",
        ownerRole: "WAREHOUSE_MANAGER",
        warehouseName: "",
        warehouseCity: "",
        active: initialData.active,
      });
      setAutoSlug(false);
    } else {
      setFormData({
        businessName: "",
        slug: "",
        plan: "STARTER",
        maxRestaurants: 2,
        maxUsers: 5,
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
        ownerPhone: "",
        ownerRole: "WAREHOUSE_MANAGER",
        warehouseName: "Armazem Central",
        warehouseCity: "",
        active: true,
      });
      setAutoSlug(true);
    }
  }, [initialData, isOpen]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "businessName" && autoSlug) {
        next.slug = slugify(value as string);
      }
      if (field === "plan" && !isEdit) {
        const defaults = planDefaults[value as string];
        if (defaults) {
          next.maxRestaurants = defaults.maxRestaurants;
          next.maxUsers = defaults.maxUsers;
        }
      }
      if (field === "ownerRole" && !isEdit) {
        next.warehouseName = value === "RESTAURANT_MANAGER" ? "Restaurante Central" : "Armazem Central";
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEdit) {
        onSave({
          id: initialData!.id,
          name: formData.businessName,
          plan: formData.plan,
          maxRestaurants: formData.maxRestaurants,
          maxUsers: formData.maxUsers,
          active: formData.active,
        });
      } else {
        const payload: CreateClientData = {
          ownerName: formData.ownerName,
          ownerEmail: formData.ownerEmail,
          ownerPassword: formData.ownerPassword,
          ownerPhone: formData.ownerPhone,
          ownerRole: formData.ownerRole,
          warehouseName: formData.warehouseName,
          warehouseCity: formData.warehouseCity,
        };
        if (existingBusinessId && formData.ownerRole === "RESTAURANT_MANAGER") {
          payload.existingBusinessId = existingBusinessId;
        } else {
          payload.businessName = formData.businessName;
          payload.slug = formData.slug;
          payload.plan = formData.plan;
          payload.maxRestaurants = formData.maxRestaurants;
          payload.maxUsers = formData.maxUsers;
        }
        onSave(payload);
      }
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Building2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg">
              {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Info — hidden when linking restaurant to existing business */}
          <div className={`space-y-3 ${!isEdit && formData.ownerRole === "RESTAURANT_MANAGER" && existingBusinessId ? "hidden" : ""}`}>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Negocio</p>
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-zinc-300">Nombre del Negocio *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleChange("businessName", e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="Restaurante Lisboa"
                required
              />
            </div>

            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-zinc-300">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    handleChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  className="bg-zinc-800/50 border-zinc-700 text-white font-mono"
                  placeholder="restaurante-lisboa"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Plan *</Label>
                <Select value={formData.plan} onValueChange={(v) => handleChange("plan", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTER">Starter</SelectItem>
                    <SelectItem value="GROWTH">Growth</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRestaurants" className="text-zinc-300">Max Locales</Label>
                <Input
                  id="maxRestaurants"
                  type="number"
                  min={1}
                  value={formData.maxRestaurants}
                  onChange={(e) => handleChange("maxRestaurants", parseInt(e.target.value) || 1)}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers" className="text-zinc-300">Max Usuarios</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min={1}
                  value={formData.maxUsers}
                  onChange={(e) => handleChange("maxUsers", parseInt(e.target.value) || 1)}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
            </div>

            {isEdit && (
              <div className="space-y-2">
                <Label className="text-zinc-300">Estado</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange("active", true)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.active
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                        : "bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    Activo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("active", false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !formData.active
                        ? "bg-zinc-700/50 text-zinc-400 border border-zinc-600"
                        : "bg-zinc-800/50 text-zinc-500 border border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full bg-zinc-400" />
                    Inactivo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Owner Info - only for create */}
          {!isEdit && (
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Usuario Propietario</p>
              <div className="space-y-2">
                <Label htmlFor="ownerName" className="text-zinc-300">Nombre *</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => handleChange("ownerName", e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  placeholder="Maria Silva"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Rol del propietario *</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange("ownerRole", "WAREHOUSE_MANAGER")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      formData.ownerRole === "WAREHOUSE_MANAGER"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                        : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    Gerente Depósito
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("ownerRole", "RESTAURANT_MANAGER")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      formData.ownerRole === "RESTAURANT_MANAGER"
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/50"
                        : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    Gerente Restaurante
                  </button>
                </div>
              </div>
              {/* Link to existing business (for restaurant managers) */}
              {formData.ownerRole === "RESTAURANT_MANAGER" && existingBusinesses.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-zinc-300">Vincular al negocio (depósito)</Label>
                  <select
                    value={existingBusinessId}
                    onChange={(e) => setExistingBusinessId(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Crear nuevo negocio independiente</option>
                    {existingBusinesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {existingBusinessId && (
                    <p className="text-xs text-amber-400">El restaurante se creará dentro del negocio seleccionado, compartiendo productos y proveedores.</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ownerEmail" className="text-zinc-300">Email *</Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => handleChange("ownerEmail", e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                    placeholder="maria@negocio.pt"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerPhone" className="text-zinc-300">Telefono</Label>
                  <Input
                    id="ownerPhone"
                    type="tel"
                    value={formData.ownerPhone}
                    onChange={(e) => handleChange("ownerPhone", e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                    placeholder="+351 912 345 678"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPassword" className="text-zinc-300">Contrasena *</Label>
                <Input
                  id="ownerPassword"
                  type="password"
                  value={formData.ownerPassword}
                  onChange={(e) => handleChange("ownerPassword", e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  placeholder="Minimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            </div>
          )}

          {/* Location Info - only for create */}
          {!isEdit && (
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                {formData.ownerRole === "RESTAURANT_MANAGER" ? "Restaurante Principal" : "Deposito Principal"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="warehouseName" className="text-zinc-300">Nombre</Label>
                  <Input
                    id="warehouseName"
                    value={formData.warehouseName}
                    onChange={(e) => handleChange("warehouseName", e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                    placeholder={formData.ownerRole === "RESTAURANT_MANAGER" ? "Restaurante Central" : "Armazem Central"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouseCity" className="text-zinc-300">Ciudad</Label>
                  <Input
                    id="warehouseCity"
                    value={formData.warehouseCity}
                    onChange={(e) => handleChange("warehouseCity", e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                    placeholder="Lisboa"
                  />
                </div>
              </div>
            </div>
          )}
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
            {isEdit ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
