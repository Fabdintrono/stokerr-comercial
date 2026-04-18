"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Bookmark, Pencil, Trash2, X, Check } from "lucide-react";
import toast from "react-hot-toast";

interface Brand {
  id: string;
  name: string;
  description?: string;
  _count: { products: number };
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brands");
      const data = await res.json();
      setBrands(data.brands || []);
    } catch {
      toast.error("Error al cargar marcas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nombre requerido");
    try {
      if (editingId) {
        const res = await fetch(`/api/brands/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, description: form.description || undefined }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Marca actualizada");
      } else {
        const res = await fetch("/api/brands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, description: form.description || undefined }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Marca creada");
      }
      setForm({ name: "", description: "" });
      setShowForm(false);
      setEditingId(null);
      fetchBrands();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Desactivar esta marca?")) return;
    try {
      const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Marca desactivada");
      fetchBrands();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    }
  };

  const startEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setForm({ name: brand.name, description: brand.description || "" });
    setShowForm(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marcas</h1>
          <p className="text-sm text-zinc-400">Gestiona las marcas de tus productos</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ name: "", description: "" }); setShowForm(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <Plus className="h-4 w-4" /> Nueva Marca
        </Button>
      </div>

      {showForm && (
        <Card className="border-zinc-700 bg-zinc-900">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-white">{editingId ? "Editar Marca" : "Nueva Marca"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Nombre *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white h-9" placeholder="Ej: Nestlé" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Descripción</label>
                <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white h-9" placeholder="Opcional" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"><Check className="h-3.5 w-3.5" /> Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }} className="text-zinc-400 gap-1.5"><X className="h-3.5 w-3.5" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-800/50 rounded animate-pulse" />)}</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Marca</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Productos</th>
                  <th className="py-3 px-4 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {brands.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-12 text-zinc-500 text-sm">No hay marcas. Crea la primera.</td></tr>
                ) : brands.map((brand) => (
                  <tr key={brand.id} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                          <Bookmark className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm">{brand.name}</div>
                          {brand.description && <div className="text-xs text-zinc-500">{brand.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-sm">{brand._count.products} productos</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white" onClick={() => startEdit(brand)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400" onClick={() => handleDelete(brand.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
