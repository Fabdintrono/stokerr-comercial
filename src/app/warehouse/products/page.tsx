"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Package, Filter, MoreHorizontal, Tag, AlertTriangle, Pencil, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuCheckboxItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ProductModal } from "@/components/warehouse/ProductModal";
import toast from "react-hot-toast";

interface InventoryEntry {
  id: string;
  quantity: number;
  location: { id: string; name: string; type: string };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  minStock: number;
  maxStock: number;
  costPrice: number;
  salePrice: number;
  vatRate: number;
  isActive: boolean;
  category: { id: string; name: string };
  brand?: { id: string; name: string } | null;
  inventory: InventoryEntry[];
}

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

function getTotalStock(inventory: InventoryEntry[]) {
  return inventory.reduce((sum, i) => sum + i.quantity, 0);
}

function getStockStatus(current: number, min: number) {
  if (current < min) return { label: "Stock Bajo", color: "text-red-400 bg-red-400/10" };
  if (current < min * 1.5) return { label: "Normal", color: "text-amber-400 bg-amber-400/10" };
  return { label: "OK", color: "text-emerald-400 bg-emerald-400/10" };
}

const UNIT_MAP: Record<string, string> = {
  KG: "KG", G: "G", L: "L", ML: "ML", UNIT: "UNIT", BOX: "BOX", CASE: "CASE", GARRAFA: "GARRAFA",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [warehouseLocationId, setWarehouseLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, brandsRes, bizRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/brands"),
        fetch("/api/auth/business"),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      const brandsData = await brandsRes.json();
      const bizData = await bizRes.json();
      setProducts(prodData.products || []);
      setCategories(catData.categories || []);
      setBrands(brandsData.brands || []);
      const biz = bizData.businesses?.[0];
      const wh = (biz?.locations || []).find((l: any) => l.type === "WAREHOUSE" && l.isActive !== false);
      if (wh) setWarehouseLocationId(wh.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (data: any) => {
    try {
      const body = {
        name: data.name,
        sku: data.sku,
        categoryId: data.categoryId,
        brandId: data.brandId || undefined,
        unit: UNIT_MAP[data.unit] || data.unit,
        minStock: data.minStock,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        vatRate: data.vatRate,
        isActive: data.active,
        showInPos: data.showInPos,
        initialStock: data.currentStock || 0,
        locationId: warehouseLocationId,
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
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Producto creado");
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Desactivar producto "${product.name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Producto desactivado");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const filteredProducts = products.filter((p) => {
    const totalStock = getTotalStock(p.inventory);
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category.id === selectedCategory;
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low" && totalStock < p.minStock) ||
      (stockFilter === "normal" && totalStock >= p.minStock);
    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-sm text-zinc-400">Gestiona tu catalogo de productos</p>
        </div>
        <Button
          onClick={() => { setEditingProduct(null); setModalOpen(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <Card className="border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium border",
                    selectedCategory === cat.id
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                      : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                  )}
                >
                  <Tag className="h-3.5 w-3.5" />
                  {cat.name}
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    selectedCategory === cat.id ? "bg-emerald-500/30 text-emerald-300" : "bg-zinc-700 text-zinc-400"
                  )}>
                    {products.filter((p) => p.category.id === cat.id).length}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-zinc-700 text-zinc-300 gap-2">
                  <Filter className="h-4 w-4" />
                  Stock
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                <DropdownMenuCheckboxItem checked={stockFilter === "all"} onCheckedChange={() => setStockFilter("all")} className="text-zinc-300">
                  Todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={stockFilter === "low"} onCheckedChange={() => setStockFilter("low")} className="text-zinc-300">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-400" />
                  Stock Bajo
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={stockFilter === "normal"} onCheckedChange={() => setStockFilter("normal")} className="text-zinc-300">
                  Stock Normal
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">
            {loading ? "Cargando..." : `${filteredProducts.length} productos`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-zinc-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Producto</TableHead>
                    <TableHead className="text-zinc-400">Categoria</TableHead>
                    <TableHead className="text-zinc-400 text-right">Stock</TableHead>
                    <TableHead className="text-zinc-400 text-right">Costo</TableHead>
                    <TableHead className="text-zinc-400 text-right">Margen</TableHead>
                    <TableHead className="text-zinc-400 text-right">Venta</TableHead>
                    <TableHead className="text-zinc-400 text-right">Venta + IVA</TableHead>
                    <TableHead className="text-zinc-400 text-right">Estado</TableHead>
                    <TableHead className="text-zinc-400 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-zinc-500">
                        No se encontraron productos
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.map((product) => {
                    const totalStock = getTotalStock(product.inventory);
                    const isLowStock = totalStock < product.minStock;
                    const stockStatus = getStockStatus(totalStock, product.minStock);
                    const costPrice = Number(product.costPrice) || 0;
                    const salePrice = Number(product.salePrice) || 0;
                    const vatRate = Number(product.vatRate) || 0;
                    const salePriceWithVat = salePrice * (1 + vatRate / 100);
                    const margin = costPrice > 0 ? ((salePrice - costPrice) / costPrice * 100) : 0;
                    return (
                      <TableRow key={product.id} className="border-zinc-800 hover:bg-zinc-900/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg",
                              isLowStock ? "bg-red-500/10" : "bg-emerald-500/10"
                            )}>
                              <Package className={cn("h-5 w-5", isLowStock ? "text-red-400" : "text-emerald-400")} />
                            </div>
                            <div>
                              <div className="font-medium text-white">{product.name}</div>
                              <div className="text-sm text-zinc-400 font-mono">{product.sku}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-zinc-300">
                            <Tag className="h-3.5 w-3.5 text-zinc-500" />
                            {product.category.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-medium", isLowStock ? "text-red-400" : "text-white")}>
                            {totalStock}
                          </span>
                          <span className="text-zinc-500 text-sm ml-1">{product.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-zinc-300 font-mono text-sm">
                          {costPrice.toFixed(2)} €
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "text-sm font-medium",
                            margin > 0 ? "text-emerald-400" : margin < 0 ? "text-red-400" : "text-zinc-500"
                          )}>
                            {margin.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-zinc-300 font-mono text-sm">
                          {salePrice.toFixed(2)} €
                        </TableCell>
                        <TableCell className="text-right text-white font-mono text-sm font-medium">
                          {salePriceWithVat.toFixed(2)} €
                          <div className="text-xs text-zinc-500 font-normal">IVA {vatRate}%</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("text-xs px-2 py-1 rounded-full font-medium", stockStatus.color)}>
                            {stockStatus.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                              <DropdownMenuItem
                                onClick={() => { setEditingProduct(product); setModalOpen(true); }}
                                className="text-zinc-300"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-zinc-800" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(product)}
                                className="text-red-400 focus:text-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Desactivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
