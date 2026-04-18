"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, Tag, MoreHorizontal, Pencil, Trash2, UtensilsCrossed, ChefHat } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ProductModal } from "@/components/warehouse/ProductModal";
import toast from "react-hot-toast";
import Link from "next/link";

interface Product {
  id: string;
  sku: string | null;
  name: string;
  unit: string;
  minStock: number;
  costPrice: number;
  salePrice: number;
  vatRate: number;
  isActive: boolean;
  category: { id: string; name: string };
  brand?: { id: string; name: string } | null;
  inventory: { id: string; quantity: number; location: { id: string; name: string; type: string } }[];
}

function getLocationId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/locationId=([^;]+)/);
  return m ? m[1] : null;
}

export default function RestaurantProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; parentId?: string | null; children?: any[] }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [recipeAvailability, setRecipeAvailability] = useState<Record<string, number>>({}); // productId -> availableUnits
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const lid = getLocationId();
      setLocationId(lid);
      const [prodRes, catRes, brandsRes, recipeRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/brands"),
        fetch("/api/recipes"),
      ]);
      const [prodData, catData, brandsData, recipeData] = await Promise.all([
        prodRes.json(), catRes.json(), brandsRes.json(), recipeRes.json(),
      ]);
      setProducts(prodData.products || []);
      setCategories(catData.categories || []);
      setBrands(brandsData.brands || []);

      // Build productId -> availableUnits map from recipe metrics
      const avail: Record<string, number> = {};
      for (const r of (recipeData.recipes || [])) {
        if (r.metrics) avail[r.product.id] = r.metrics.availableUnits;
      }
      setRecipeAvailability(avail);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (data: any) => {
    try {
      const body = {
        name: data.name,
        sku: data.sku || undefined,
        categoryId: data.categoryId,
        brandId: data.brandId || undefined,
        unit: data.unit,
        minStock: data.minStock,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        vatRate: data.vatRate,
        isActive: data.active,
        showInPos: data.showInPos,
        initialStock: data.currentStock || 0,
        locationId: locationId || undefined,
      };

      if (data.id) {
        const res = await fetch(`/api/products/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Producto actualizado");
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, sku: data.sku || `REST-${Date.now()}` }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Producto creado");
      }
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Desactivar "${product.name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Producto desactivado");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Error");
    }
  };

  // Build a flat list of category ids that match the selected filter (parent + its children)
  const matchingCategoryIds = selectedCategoryId
    ? [selectedCategoryId, ...categories.filter(c => c.parentId === selectedCategoryId).map(c => c.id)]
    : null;

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !matchingCategoryIds || matchingCategoryIds.includes(p.category.id);
    return matchesSearch && matchesCategory;
  });

  // Root categories that have products
  const rootCategories = categories.filter(c => !c.parentId);
  // Sub-categories of currently selected root
  const subCategories = selectedCategoryId
    ? categories.filter(c => c.parentId === selectedCategoryId)
    : [];

  const getTotalStock = (inv: Product["inventory"]) => inv.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-sm text-zinc-400">Platos, bebidas y preparaciones del restaurante</p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setModalOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
          <Plus className="h-4 w-4" /> Nuevo Producto
        </Button>
      </div>

      <Card className="border-zinc-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category filter pills */}
      {rootCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                selectedCategoryId === null
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300"
              )}
            >
              Todos
            </button>
            {rootCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  selectedCategoryId === cat.id
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Subcategory pills */}
          {subCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-2 border-l-2 border-amber-500/20">
              {subCategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedCategoryId(selectedCategoryId === sub.id ? null : sub.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                    selectedCategoryId === sub.id
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
                  )}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base text-white">
            {loading ? "Cargando..." : `${filtered.length} productos`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-zinc-800/50 rounded animate-pulse" />)}</div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Producto</TableHead>
                    <TableHead className="text-zinc-400">Categoría</TableHead>
                    <TableHead className="text-zinc-400 text-right">Stock</TableHead>
                    <TableHead className="text-zinc-400 text-right">Costo</TableHead>
                    <TableHead className="text-zinc-400 text-right">Venta</TableHead>
                    <TableHead className="text-zinc-400 text-right">Venta + IVA</TableHead>
                    <TableHead className="text-zinc-400 w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-zinc-500">
                        No se encontraron productos
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((product) => {
                    const stock = getTotalStock(product.inventory);
                    const cost = Number(product.costPrice) || 0;
                    const sale = Number(product.salePrice) || 0;
                    const vat = Number(product.vatRate) || 0;
                    return (
                      <TableRow key={product.id} className="border-zinc-800 hover:bg-zinc-900/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                              <Package className="h-4 w-4 text-amber-400" />
                            </div>
                            <div>
                              <div className="font-medium text-white text-sm">{product.name}</div>
                              {product.sku && <div className="text-xs text-zinc-500 font-mono">{product.sku}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                            <Tag className="h-3.5 w-3.5 text-zinc-600" />
                            {product.category.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {recipeAvailability[product.id] !== undefined ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <ChefHat className="h-3.5 w-3.5 text-amber-400/70 shrink-0" />
                              <span className={cn(
                                "font-mono font-semibold",
                                recipeAvailability[product.id] === 0 ? "text-red-400" :
                                recipeAvailability[product.id] < 5 ? "text-amber-400" : "text-emerald-400"
                              )}>
                                {recipeAvailability[product.id]}
                              </span>
                              <span className="text-zinc-500">porciones</span>
                            </div>
                          ) : (
                            <span className="text-white font-mono">{stock} <span className="text-zinc-500">{product.unit}</span></span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-zinc-300 font-mono text-sm">{cost.toFixed(2)} €</TableCell>
                        <TableCell className="text-right text-zinc-300 font-mono text-sm">{sale.toFixed(2)} €</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className="text-white font-medium">{(sale * (1 + vat / 100)).toFixed(2)} €</span>
                          <div className="text-[10px] text-zinc-600">IVA {vat}%</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Link href={`/restaurant/recipes?productId=${product.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-amber-400" title="Ver receta">
                                <UtensilsCrossed className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem onClick={() => { setEditingProduct(product); setModalOpen(true); }} className="text-zinc-300">
                                  <Pencil className="h-4 w-4 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem onClick={() => handleDelete(product)} className="text-red-400 focus:text-red-300">
                                  <Trash2 className="h-4 w-4 mr-2" /> Desactivar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductModal
        key={editingProduct?.id || "new"}
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProduct(null); }}
        onSave={handleSave}
        categories={categories}
        brands={brands}
        initialData={editingProduct ? {
          id: editingProduct.id,
          name: editingProduct.name,
          sku: editingProduct.sku || "",
          categoryId: editingProduct.category.id,
          brandId: editingProduct.brand?.id || "",
          unit: editingProduct.unit,
          currentStock: getTotalStock(editingProduct.inventory),
          minStock: editingProduct.minStock,
          costPrice: Number(editingProduct.costPrice) || 0,
          salePrice: Number(editingProduct.salePrice) || 0,
          vatRate: Number(editingProduct.vatRate) || 23,
          active: editingProduct.isActive,
          showInPos: (editingProduct as any).showInPos ?? false,
        } : undefined}
      />
    </div>
  );
}
