"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Package, 
  Filter,
  MoreHorizontal,
  Tag,
  AlertTriangle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock data - será reemplazado con API real
const mockCategories = [
  { id: "1", name: "Alimentos Base", icon: "📦", color: "#10b981", productCount: 45 },
  { id: "2", name: "Aceites", icon: "🫒", color: "#f59e0b", productCount: 12 },
  { id: "3", name: "Lácteos", icon: "🥛", color: "#3b82f6", productCount: 28 },
  { id: "4", name: "Carnes", icon: "🥩", color: "#ef4444", productCount: 18 },
];

const mockProductsWithStock = [
  { id: "1", name: "Harina de Trigo", sku: "HAR-001", category: "Alimentos Base", categoryId: "1", unit: "kg", minStock: 50, currentStock: 12, active: true },
  { id: "2", name: "Aceite de Oliva Extra", sku: "ACE-015", category: "Aceites", categoryId: "2", unit: "L", minStock: 30, currentStock: 8, active: true },
  { id: "3", name: "Arroz Basmati", sku: "ARR-003", category: "Alimentos Base", categoryId: "1", unit: "kg", minStock: 100, currentStock: 25, active: true },
  { id: "4", name: "Leche Entera", sku: "LEC-001", category: "Lácteos", categoryId: "3", unit: "L", minStock: 50, currentStock: 120, active: true },
];

export default function ProductsPage() {
  const [products] = useState(mockProductsWithStock);
  const [categories] = useState(mockCategories);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState("all");

  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    
    const matchesStock = 
      stockFilter === "all" ||
      (stockFilter === "low" && product.currentStock < product.minStock) ||
      (stockFilter === "normal" && product.currentStock >= product.minStock);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const getStockStatus = (current: number, min: number) => {
    if (current < min) {
      return { label: "Stock Bajo", color: "text-red-400 bg-red-400/10" };
    }
    if (current < min * 1.5) {
      return { label: "Normal", color: "text-amber-400 bg-amber-400/10" };
    }
    return { label: "OK", color: "text-emerald-400 bg-emerald-400/10" };
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-sm text-zinc-400">Gestiona tu catálogo de productos y categorías</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Categories */}
      <Card className="border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  selectedCategory === category.id
                    ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
                    : "bg-zinc-800/50 border border-zinc-700 text-zinc-300 hover:border-zinc-600"
                )}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  selectedCategory === category.id
                    ? "bg-emerald-500/30 text-emerald-300"
                    : "bg-zinc-700 text-zinc-400"
                )}>
                  {category.productCount}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

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
                <DropdownMenuCheckboxItem
                  checked={stockFilter === "all"}
                  onCheckedChange={() => setStockFilter("all")}
                  className="text-zinc-300"
                >
                  Todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={stockFilter === "low"}
                  onCheckedChange={() => setStockFilter("low")}
                  className="text-zinc-300"
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-400" />
                  Stock Bajo
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={stockFilter === "normal"}
                  onCheckedChange={() => setStockFilter("normal")}
                  className="text-zinc-300"
                >
                  Stock Normal
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">{filteredProducts.length} productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Producto</TableHead>
                  <TableHead className="text-zinc-400">Categoría</TableHead>
                  <TableHead className="text-zinc-400 text-right">Stock</TableHead>
                  <TableHead className="text-zinc-400 text-right">Mínimo</TableHead>
                  <TableHead className="text-zinc-400 text-right">Estado</TableHead>
                  <TableHead className="text-zinc-400 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.currentStock, product.minStock);
                  const isLowStock = product.currentStock < product.minStock;
                  
                  return (
                    <TableRow key={product.id} className="border-zinc-800">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            isLowStock ? "bg-red-500/10" : "bg-emerald-500/10"
                          )}>
                            <Package className={cn(
                              "h-5 w-5",
                              isLowStock ? "text-red-400" : "text-emerald-400"
                            )} />
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
                          {product.category}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={cn(
                            "font-medium",
                            isLowStock ? "text-red-400" : "text-white"
                          )}>
                            {product.currentStock}
                          </span>
                          <span className="text-zinc-500 text-sm">{product.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-zinc-400">
                        {product.minStock} {product.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          stockStatus.color
                        )}>
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
                            <DropdownMenuItem className="text-zinc-300">
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-zinc-300">
                              Editar
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
        </CardContent>
      </Card>
    </div>
  );
}