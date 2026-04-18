"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Tag, ChevronDown, ChevronRight, Pencil, Trash2, X, Check, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  showInPos: boolean;
  children: Category[];
  _count: { products: number };
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", parentId: "" });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories((data.categories || []).filter((c: Category) => !c.parentId));
    } catch {
      toast.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const topLevel = categories.filter((c) => !c.parentId);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nombre requerido");
    try {
      if (editingId) {
        const res = await fetch(`/api/categories/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description || undefined,
            parentId: form.parentId || null,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Categoría actualizada");
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, description: form.description || undefined, parentId: form.parentId || undefined }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Categoría creada");
      }
      setForm({ name: "", description: "", parentId: "" });
      setShowForm(false);
      setEditingId(null);
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    }
  };

  const togglePosVisibility = async (cat: Category) => {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showInPos: !cat.showInPos }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Categoría eliminada");
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description || "", parentId: cat.parentId || "" });
    setShowForm(true);
  };

  const CategoryRow = ({ cat, depth = 0 }: { cat: Category; depth?: number }) => {
    const isOpen = expanded.has(cat.id);
    const hasChildren = (cat.children || []).length > 0;
    return (
      <>
        <tr className="border-zinc-800 hover:bg-zinc-900/50">
          <td className="py-3 px-4">
            <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
              {hasChildren ? (
                <button onClick={() => setExpanded(prev => { const s = new Set(prev); isOpen ? s.delete(cat.id) : s.add(cat.id); return s; })} className="text-zinc-500 hover:text-zinc-300">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="w-4" />
              )}
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", depth === 0 ? "bg-emerald-500/10" : "bg-zinc-800")}>
                <Tag className={cn("h-3.5 w-3.5", depth === 0 ? "text-emerald-400" : "text-zinc-500")} />
              </div>
              <div>
                <div className="font-medium text-white text-sm">{cat.name}</div>
                {cat.description && <div className="text-xs text-zinc-500">{cat.description}</div>}
              </div>
            </div>
          </td>
          <td className="py-3 px-4 text-zinc-400 text-sm">{cat._count?.products ?? 0} productos</td>
          <td className="py-3 px-4 text-zinc-500 text-sm">{(cat.children || []).length} subcategorías</td>
          <td className="py-3 px-4">
            <button
              onClick={() => togglePosVisibility(cat)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                cat.showInPos
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500"
              )}
            >
              <Monitor className="h-3 w-3" />
              {cat.showInPos ? "Visible" : "Oculto"}
            </button>
          </td>
          <td className="py-3 px-4">
            <div className="flex items-center gap-1 justify-end">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-white" onClick={() => startEdit(cat)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400" onClick={() => handleDelete(cat.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        </tr>
        {isOpen && (cat.children || []).map((child) => (
          <CategoryRow key={child.id} cat={child} depth={depth + 1} />
        ))}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorías</h1>
          <p className="text-sm text-zinc-400">Organiza tus productos por categorías y subcategorías</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ name: "", description: "", parentId: "" }); setShowForm(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <Plus className="h-4 w-4" /> Nueva Categoría
        </Button>
      </div>

      {showForm && (
        <Card className="border-zinc-700 bg-zinc-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">{editingId ? "Editar Categoría" : "Nueva Categoría"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Nombre *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white h-9" placeholder="Ej: Platos principales" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Descripción</label>
                <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white h-9" placeholder="Opcional" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Categoría padre (para subcategorías)</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm(p => ({ ...p, parentId: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 h-9"
              >
                <option value="">Ninguna (categoría principal)</option>
                {topLevel
                  .filter((cat) => cat.id !== editingId)
                  .map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)
                }
              </select>
            </div>
            <div className="flex gap-2 pt-1">
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
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Categoría</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Productos</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">Subcategorías</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-zinc-500 uppercase">POS / Mesonero</th>
                  <th className="py-3 px-4 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {topLevel.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-zinc-500 text-sm">No hay categorías. Crea la primera.</td></tr>
                ) : topLevel.map((cat) => <CategoryRow key={cat.id} cat={cat} />)}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
