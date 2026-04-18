"use client";

import { useState, useEffect } from "react";
import { Search, Package, AlertTriangle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface InventoryItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string | null;
    unit: string;
    minStock: number;
    costPrice: number;
    category: { name: string };
  };
}

const UNIT_LABELS: Record<string, string> = {
  KG: "kg", G: "g", L: "L", ML: "ml",
  UNIT: "un", BOX: "caja", CASE: "case", GARRAFA: "garrafa",
};

function getLocationId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/locationId=([^;]+)/);
  return m ? m[1] : null;
}

export default function RestaurantInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low">("all");

  useEffect(() => {
    const locationId = getLocationId();
    if (!locationId) { setLoading(false); return; }

    fetch(`/api/inventory?locationId=${locationId}`)
      .then((r) => r.json())
      .then((data) => setItems(data.inventory || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((item) => {
    const matchSearch =
      item.product.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.product.sku || "").toLowerCase().includes(search.toLowerCase()) ||
      item.product.category.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || item.quantity <= item.product.minStock;
    return matchSearch && matchFilter;
  });

  const lowStockCount = items.filter((i) => i.quantity <= i.product.minStock).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Inventario</h1>
          <p className="text-xs text-zinc-500">{items.length} productos · {lowStockCount} con stock bajo</p>
        </div>
        {lowStockCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {lowStockCount} bajo mínimo
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar producto o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "low"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filter === f
                  ? f === "low"
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {f === "all" ? "Todos" : "Stock bajo"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Producto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Categoría</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Stock actual</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Mínimo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 text-sm">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  {search || filter === "low" ? "Sin resultados" : "Sin productos en inventario"}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isLow = item.quantity <= item.product.minStock;
                const unit = UNIT_LABELS[item.product.unit] || item.product.unit;
                return (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{item.product.name}</div>
                      {item.product.sku && (
                        <div className="text-xs text-zinc-500">{item.product.sku}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{item.product.category.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">
                      {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)} {unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-400">
                      {item.product.minStock % 1 === 0 ? item.product.minStock : item.product.minStock.toFixed(2)} {unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="h-3 w-3" /> Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
