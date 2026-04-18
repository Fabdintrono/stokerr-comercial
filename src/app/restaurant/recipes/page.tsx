"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, UtensilsCrossed, Search, X, Pencil, Trash2,
  ChevronDown, ChevronUp, Package, Loader2, Check, TrendingUp, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Category { id: string; name: string; parentId: string | null }
interface Product { id: string; name: string; sku: string | null; unit: string; costPrice?: number; categoryId?: string }
interface RecipeItem { productId: string; product: Product; quantity: number; unit: string }

// Mirror of server-side toBaseUnit for live cost calculation
function toBaseUnit(quantity: number, recipeUnit: string, productUnit: string): number {
  if (recipeUnit === productUnit) return quantity;
  const key = `${recipeUnit}->${productUnit}`;
  const factors: Record<string, number> = {
    'G->KG': 1/1000, 'KG->G': 1000, 'ML->L': 1/1000, 'L->ML': 1000,
  };
  return quantity * (factors[key] ?? 1);
}
interface RecipeMetrics {
  costPrice: number;
  salePrice: number;
  salePriceWithVat: number;
  vatRate: number;
  margin: number;
  availableUnits: number;
}
interface Recipe {
  id: string;
  name: string;
  description?: string;
  yield: number;
  product: Product;
  items: RecipeItem[];
  metrics?: RecipeMetrics;
}

const UNIT_LABELS: Record<string, string> = {
  KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "un", BOX: "caja", CASE: "case", GARRAFA: "garrafa",
};

// Compatible units per product base unit (for recipe item selector)
const COMPATIBLE_UNITS: Record<string, string[]> = {
  KG: ["KG", "G"], G: ["G", "KG"], L: ["L", "ML"], ML: ["ML", "L"],
  UNIT: ["UNIT"], BOX: ["BOX"], CASE: ["CASE"], GARRAFA: ["GARRAFA"],
};

function RecipesContent() {
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("productId");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [form, setForm] = useState({
    productId: preselectedProductId || "",
    categoryId: "",
    name: "",
    description: "",
    yield: 1,
  });
  const [items, setItems] = useState<{ productId: string; product: Product; quantity: number; unit: string }[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = preselectedProductId ? `/api/recipes?productId=${preselectedProductId}` : "/api/recipes";
      const [recipeRes, prodRes, catRes] = await Promise.all([fetch(url), fetch("/api/products"), fetch("/api/categories")]);
      const [recipeData, prodData, catData] = await Promise.all([recipeRes.json(), prodRes.json(), catRes.json()]);
      setRecipes(recipeData.recipes || []);
      setProducts(prodData.products || []);
      setCategories(catData.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [preselectedProductId]);

  useEffect(() => { load(); }, [load]);

  // Auto-open modal if preselectedProductId
  useEffect(() => {
    if (preselectedProductId && products.length > 0) {
      const existingRecipe = recipes.find(r => r.product.id === preselectedProductId);
      if (existingRecipe) {
        openEdit(existingRecipe);
      } else {
        const p = products.find(pr => pr.id === preselectedProductId);
        if (p) {
          setForm({ productId: p.id, categoryId: p.categoryId || "", name: `Receta ${p.name}`, description: "", yield: 1 });
          setItems([]);
          setShowModal(true);
        }
      }
    }
  }, [preselectedProductId, products, recipes]);

  function openNew() {
    setEditingRecipe(null);
    setForm({ productId: "", categoryId: "", name: "", description: "", yield: 1 });
    setItems([]);
    setIngredientSearch("");
    setShowModal(true);
  }

  function openEdit(recipe: Recipe) {
    setEditingRecipe(recipe);
    const p = products.find(pr => pr.id === recipe.product.id);
    setForm({ productId: recipe.product.id, categoryId: p?.categoryId || "", name: recipe.name, description: recipe.description || "", yield: recipe.yield });
    setItems(recipe.items.map(i => ({ productId: i.productId, product: i.product, quantity: i.quantity, unit: i.unit || i.product.unit })));
    setIngredientSearch("");
    setShowModal(true);
  }

  function addIngredient(p: Product) {
    if (items.find(i => i.productId === p.id)) return;
    setItems(prev => [...prev, { productId: p.id, product: p, quantity: 1, unit: p.unit }]);
    setIngredientSearch("");
  }

  async function handleSave() {
    if (!form.productId || !form.name || items.length === 0) {
      return toast.error("Completa todos los campos");
    }
    setSaving(true);
    try {
      // Update product category if set
      if (form.categoryId) {
        const catRes = await fetch(`/api/products/${form.productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: form.categoryId }),
        });
        if (!catRes.ok) {
          const err = await catRes.json().catch(() => ({}));
          console.error("Error actualizando categoría:", err);
        }
      }

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          name: form.name,
          description: form.description || undefined,
          yield: form.yield,
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unit: i.unit })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      // Auto-update product cost price from recipe
      if (liveCostPerPortion > 0) {
        await fetch(`/api/products/${form.productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ costPrice: Math.round(liveCostPerPortion * 100) / 100 }),
        });
      }

      toast.success(editingRecipe ? "Receta actualizada" : "Receta creada");
      setShowModal(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta receta?")) return;
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Receta eliminada");
      load();
    } catch (e: any) {
      toast.error(e.message || "Error");
    }
  }

  const filteredRecipes = recipes.filter(r =>
    r.product.name.toLowerCase().includes(search.toLowerCase()) ||
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // Build the set of "ingredient" category IDs (the category named "Ingredientes" + all its subcategories)
  const ingredientsCat = categories.find(c => c.name.toLowerCase() === "ingredientes" && !c.parentId);
  const ingredientCategoryIds = new Set<string>(
    ingredientsCat
      ? [ingredientsCat.id, ...categories.filter(c => c.parentId === ingredientsCat.id).map(c => c.id)]
      : []
  );

  // Products not already selected as main product or ingredient — only from "Ingredientes" category
  const availableIngredients = products.filter(p =>
    p.id !== form.productId &&
    !items.find(i => i.productId === p.id) &&
    (ingredientCategoryIds.size === 0 || ingredientCategoryIds.has(p.categoryId || "")) &&
    (p.name.toLowerCase().includes(ingredientSearch.toLowerCase()) || (p.sku || "").toLowerCase().includes(ingredientSearch.toLowerCase()))
  );

  // Products that don't already have a recipe, excluding ingredients category
  const availableMainProducts = products.filter(p =>
    !recipes.find(r => r.product.id === p.id && r.id !== editingRecipe?.id) &&
    !ingredientCategoryIds.has(p.categoryId || "")
  );

  // Categories excluding "Ingredientes" and its subcategories
  const dishCategories = categories.filter(c => !ingredientCategoryIds.has(c.id));

  // Live cost calculation
  const liveCost = items.reduce((sum, item) => {
    const qtyInBase = toBaseUnit(item.quantity, item.unit, item.product.unit);
    return sum + qtyInBase * (item.product.costPrice ?? 0);
  }, 0);
  const liveCostPerPortion = form.yield > 0 ? liveCost / form.yield : liveCost;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recetas</h1>
          <p className="text-sm text-zinc-400">Define los ingredientes de cada plato</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
          <Plus className="h-4 w-4" /> Nueva Receta
        </Button>
      </div>

      {/* Search */}
      <Card className="border-zinc-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar receta o producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Metrics table */}
      {!loading && filteredRecipes.length > 0 && (
        <Card className="border-zinc-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-white">Resumen de platos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase">Plato</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase">Costo</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase">P. Venta</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase">Venta + IVA</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase">Margen</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-zinc-500 uppercase">Disponibles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredRecipes.map((recipe) => {
                    const m = recipe.metrics;
                    if (!m) return null;
                    const stockColor = m.availableUnits === 0
                      ? "text-red-400"
                      : m.availableUnits < 5
                      ? "text-amber-400"
                      : "text-emerald-400";
                    return (
                      <tr key={recipe.id} className="hover:bg-zinc-900/40">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                              <UtensilsCrossed className="h-3.5 w-3.5 text-amber-400" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{recipe.product.name}</p>
                              <p className="text-xs text-zinc-500">{recipe.items.length} ingrediente{recipe.items.length !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300 font-mono">€{m.costPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-white font-mono font-medium">€{m.salePrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-zinc-300 font-mono">
                          €{m.salePriceWithVat.toFixed(2)}
                          <span className="text-xs text-zinc-600 ml-1">(IVA {m.vatRate}%)</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            "font-mono font-semibold",
                            m.margin >= 50 ? "text-emerald-400" : m.margin >= 20 ? "text-amber-400" : "text-red-400"
                          )}>
                            {m.margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn("font-mono font-bold text-base", stockColor)}>
                            {m.availableUnits}
                          </span>
                          <span className="text-xs text-zinc-600 ml-1">uds</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-800/50 rounded-lg animate-pulse" />)}</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 py-16 text-center text-zinc-500">
          <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No hay recetas aún</p>
          <p className="text-xs mt-1">Crea una receta para un producto del menú</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecipes.map((recipe) => {
            const isOpen = expanded === recipe.id;
            return (
              <div key={recipe.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : recipe.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                      <UtensilsCrossed className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">{recipe.product.name}</p>
                      <p className="text-xs text-zinc-500">{recipe.name} · {recipe.items.length} ingrediente{recipe.items.length !== 1 ? "s" : ""} · rendimiento: {recipe.yield}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-amber-400"
                      onClick={(e) => { e.stopPropagation(); openEdit(recipe); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400"
                      onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-800 px-4 py-3">
                    {recipe.description && <p className="text-xs text-zinc-400 italic mb-3">"{recipe.description}"</p>}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-zinc-500">
                          <th className="text-left pb-1.5">Ingrediente</th>
                          <th className="text-right pb-1.5">Cantidad por unidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {recipe.items.map((item) => (
                          <tr key={item.productId}>
                            <td className="py-1.5 text-zinc-300">{item.product.name}</td>
                            <td className="py-1.5 text-right text-white font-mono">
                              {item.quantity} <span className="text-zinc-500">{UNIT_LABELS[item.unit || item.product.unit] || item.unit}</span>
                              {item.unit && item.unit !== item.product.unit && (
                                <span className="text-[10px] text-amber-400/60 ml-1">(base {item.product.unit.toLowerCase()})</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — horizontal layout */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <UtensilsCrossed className="h-4 w-4 text-amber-400" />
                </div>
                <h2 className="text-base font-semibold text-white">
                  {editingRecipe ? "Editar Receta" : "Nueva Receta"}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body — two columns */}
            <div className="flex flex-1 overflow-hidden">

              {/* Left: recipe fields */}
              <div className="w-[42%] flex flex-col gap-4 px-6 py-5 border-r border-zinc-800 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Plato del menú *</label>
                  <select
                    value={form.productId}
                    onChange={(e) => {
                      const p = products.find(pr => pr.id === e.target.value);
                      setForm(prev => ({ ...prev, productId: e.target.value, categoryId: p?.categoryId || "", name: p ? `Receta ${p.name}` : prev.name }));
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    disabled={!!editingRecipe}
                  >
                    <option value="">Seleccionar producto...</option>
                    {availableMainProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Categoría del plato
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="">Sin categoría</option>
                    {dishCategories.filter(c => !c.parentId).map(parent => (
                      <optgroup key={parent.id} label={parent.name}>
                        <option value={parent.id}>{parent.name}</option>
                        {dishCategories.filter(c => c.parentId === parent.id).map(child => (
                          <option key={child.id} value={child.id}>  {child.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Nombre de la receta *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700 text-white h-9"
                    placeholder="Ej: Receta Hamburguesa Clásica"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Rendimiento (porciones)</label>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={form.yield}
                      onChange={(e) => setForm(p => ({ ...p, yield: parseFloat(e.target.value) || 1 }))}
                      className="bg-zinc-800 border-zinc-700 text-white h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Ingredientes</label>
                    <div className="flex items-center justify-center h-9 bg-zinc-800/50 rounded-lg border border-zinc-700 text-sm text-amber-400 font-semibold">
                      {items.length} agregado{items.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Live cost badge */}
                <div className={cn(
                  "flex items-center justify-between rounded-lg px-4 py-3 border transition-colors",
                  items.length === 0
                    ? "bg-zinc-800/30 border-zinc-800 text-zinc-600"
                    : "bg-emerald-500/10 border-emerald-500/30"
                )}>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Costo estimado</p>
                    <p className={cn("text-xl font-bold font-mono mt-0.5", items.length === 0 ? "text-zinc-600" : "text-emerald-400")}>
                      €{liveCostPerPortion.toFixed(2)}
                    </p>
                    {form.yield > 1 && items.length > 0 && (
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        por porción · total €{liveCost.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <TrendingUp className={cn("h-6 w-6", items.length === 0 ? "text-zinc-700" : "text-emerald-400/60")} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none placeholder:text-zinc-600"
                    placeholder="Preparación, notas del chef..."
                  />
                </div>

                {/* Added ingredients list */}
                {items.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Ingredientes agregados</label>
                    <div className="space-y-1.5">
                      {items.map((item) => {
                        const compatibleUnits = COMPATIBLE_UNITS[item.product.unit] || [item.product.unit];
                        const isConverted = item.unit !== item.product.unit;
                        return (
                          <div key={item.productId} className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-zinc-300 truncate block">{item.product.name}</span>
                              {isConverted && (
                                <span className="text-[10px] text-amber-400/70">base: {item.product.unit.toLowerCase()}</span>
                              )}
                            </div>
                            <input
                              type="number"
                              min={0.01}
                              step={0.01}
                              value={item.quantity}
                              onChange={(e) => setItems(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: parseFloat(e.target.value) || 0 } : i))}
                              className="w-16 bg-zinc-700 border border-zinc-600 text-white text-sm rounded px-2 py-1 text-right"
                            />
                            {compatibleUnits.length > 1 ? (
                              <select
                                value={item.unit}
                                onChange={(e) => setItems(prev => prev.map(i => i.productId === item.productId ? { ...i, unit: e.target.value } : i))}
                                className={`bg-zinc-700 border rounded px-1.5 py-1 text-xs focus:outline-none w-12 ${isConverted ? "border-amber-500/50 text-amber-400" : "border-zinc-600 text-zinc-400"}`}
                              >
                                {compatibleUnits.map(u => (
                                  <option key={u} value={u}>{UNIT_LABELS[u] || u}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-zinc-500 w-12 text-center">{UNIT_LABELS[item.product.unit] || item.product.unit}</span>
                            )}
                            <button onClick={() => setItems(prev => prev.filter(i => i.productId !== item.productId))}
                              className="text-zinc-600 hover:text-red-400 shrink-0">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: ingredient search + catalog */}
              <div className="flex-1 flex flex-col px-6 py-5 overflow-hidden">
                <label className="text-xs font-medium text-zinc-400 mb-2">Agregar ingredientes</label>

                {/* Search */}
                <div className="relative mb-3 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    className="pl-9 bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                    autoFocus
                  />
                </div>

                {/* Product list — shows 10 by default, filters on type */}
                <div className="flex-1 overflow-y-auto border border-zinc-800 rounded-lg">
                  {availableIngredients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-zinc-600">
                      <Package className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">Sin resultados</p>
                    </div>
                  ) : (
                    availableIngredients.slice(0, 10).map(p => {
                      const isAdded = items.some(i => i.productId === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => !isAdded && addIngredient(p)}
                          disabled={isAdded}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-2.5 text-sm border-b border-zinc-800/60 last:border-0 transition-colors",
                            isAdded
                              ? "bg-amber-500/5 text-zinc-500 cursor-default"
                              : "hover:bg-zinc-800/60 text-zinc-300"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-md shrink-0",
                              isAdded ? "bg-amber-500/10" : "bg-zinc-800"
                            )}>
                              {isAdded
                                ? <Check className="h-3.5 w-3.5 text-amber-400" />
                                : <Package className="h-3.5 w-3.5 text-zinc-500" />
                              }
                            </div>
                            <div className="min-w-0 text-left">
                              <p className={cn("font-medium truncate", isAdded ? "text-amber-400/70" : "text-white")}>{p.name}</p>
                              {p.sku && <p className="text-[10px] text-zinc-600 font-mono">{p.sku}</p>}
                            </div>
                          </div>
                          <span className={cn(
                            "text-xs ml-2 shrink-0 px-2 py-0.5 rounded-md border",
                            isAdded ? "border-amber-500/20 text-amber-500/60" : "border-zinc-700 text-zinc-500"
                          )}>
                            {UNIT_LABELS[p.unit] || p.unit}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {availableIngredients.length > 10 && (
                  <p className="text-[10px] text-zinc-600 mt-1.5 text-center">
                    Mostrando 10 de {availableIngredients.length}. Escribe para filtrar.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 shrink-0">
              <p className="text-xs text-zinc-500">
                {items.length === 0
                  ? "Agrega al menos un ingrediente"
                  : <span>{items.length} ingrediente{items.length !== 1 ? "s" : ""} · costo <span className="text-emerald-400 font-mono font-semibold">€{liveCostPerPortion.toFixed(2)}</span>{form.yield > 1 ? "/porción" : ""}</span>
                }
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving || !form.productId || !form.name || items.length === 0}
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editingRecipe ? "Guardar cambios" : "Crear Receta"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecipesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>}>
      <RecipesContent />
    </Suspense>
  );
}
