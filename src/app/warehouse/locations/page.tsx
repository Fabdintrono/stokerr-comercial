"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MapPin, Building2, Warehouse, Users, Package, Pencil, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Location {
  id: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  _count: { users: number; inventory: number; tables: number };
}

interface LocationForm {
  name: string;
  type: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
}

const emptyForm: LocationForm = {
  name: "",
  type: "RESTAURANT",
  address: "",
  city: "",
  postalCode: "",
  phone: "",
  email: "",
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLocations(data.data);
    } catch {
      toast.error("Error al cargar locales");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      type: loc.type,
      address: loc.address || "",
      city: loc.city || "",
      postalCode: loc.postalCode || "",
      phone: loc.phone || "",
      email: loc.email || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        const { type, ...body } = form;
        const res = await fetch(`/api/locations/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        toast.success("Local actualizado");
      } else {
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        toast.success("Local creado");
      }
      setModalOpen(false);
      fetchLocations();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Desactivar "${name}"?`)) return;
    try {
      const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Local desactivado");
      fetchLocations();
    } catch {
      toast.error("Error al desactivar");
    }
  };

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.city || "").toLowerCase().includes(search.toLowerCase())
  );

  const warehouses = locations.filter((l) => l.type === "WAREHOUSE" && l.isActive).length;
  const restaurants = locations.filter((l) => l.type === "RESTAURANT" && l.isActive).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Locales</h1>
          <p className="text-sm text-zinc-400">Depositos y restaurantes del negocio</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Local
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Total</p>
                <p className="text-xl font-bold text-white">{locations.filter(l => l.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Depositos</p>
                <p className="text-xl font-bold text-white">{warehouses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Restaurantes</p>
                <p className="text-xl font-bold text-white">{restaurants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Buscar por nombre o ciudad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-emerald-500"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          {locations.length === 0 ? "No hay locales registrados" : "No se encontraron resultados"}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((loc) => (
            <Card key={loc.id} className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      {loc.type === "WAREHOUSE" ? (
                        <Warehouse className="h-5 w-5 text-amber-400" />
                      ) : (
                        <Building2 className="h-5 w-5 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white truncate">{loc.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          loc.type === "WAREHOUSE"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {loc.type === "WAREHOUSE" ? "Deposito" : "Restaurante"}
                        </span>
                        {!loc.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Inactivo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                        {loc.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{loc.city}</span>}
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{loc._count.users} usuarios</span>
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" />{loc._count.inventory} productos</span>
                        {loc.phone && <span className="hidden sm:inline">{loc.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => openEdit(loc)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {loc.isActive && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400" onClick={() => handleDeactivate(loc.id, loc.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <MapPin className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg">
                {editingId ? "Editar Local" : "Nuevo Local"}
              </DialogTitle>
            </div>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="Restaurante Chiado"
                required
              />
            </div>
            {!editingId && (
              <div className="space-y-2">
                <Label className="text-zinc-300">Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESTAURANT">Restaurante</SelectItem>
                    <SelectItem value="WAREHOUSE">Deposito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Ciudad</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  placeholder="Lisboa"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Codigo Postal</Label>
                <Input
                  value={form.postalCode}
                  onChange={(e) => setForm((p) => ({ ...p, postalCode: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  placeholder="1100-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Direccion</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="Rua Augusta 123"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Telefono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  placeholder="+351 210 123 456"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  placeholder="local@negocio.pt"
                />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Guardar" : "Crear Local"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
