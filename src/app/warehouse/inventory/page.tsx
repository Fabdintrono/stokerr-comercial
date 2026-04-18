"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  AlertTriangle,
  MapPin,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  SlidersHorizontal,
  History,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Location {
  id: string;
  name: string;
  type: string;
}

interface InventoryItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    minStock: number;
    maxStock: number;
    category: { name: string };
  };
  location: Location;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
  product: { name: string; sku: string; unit: string };
  location: { name: string };
  user: { name: string };
}

type Tab = "stock" | "movements" | "alerts";

const movementTypeConfig = {
  IN: { label: "Entrada", icon: ArrowUpCircle, color: "text-emerald-400" },
  OUT: { label: "Salida", icon: ArrowDownCircle, color: "text-red-400" },
  ADJUSTMENT: { label: "Ajuste", icon: SlidersHorizontal, color: "text-amber-400" },
  TRANSFER: { label: "Transfer.", icon: RefreshCw, color: "text-blue-400" },
};

function getStockStatus(qty: number, min: number) {
  if (qty <= 0) return { label: "Sin stock", color: "text-red-400 bg-red-400/10 border border-red-400/20" };
  if (qty < min) return { label: "Bajo mínimo", color: "text-red-400 bg-red-400/10 border border-red-400/20" };
  if (qty < min * 1.5) return { label: "Cerca del mínimo", color: "text-amber-400 bg-amber-400/10 border border-amber-400/20" };
  return { label: "OK", color: "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20" };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("stock");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Adjustment modal
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedLocation !== "all"
        ? `/api/inventory?locationId=${selectedLocation}`
        : "/api/inventory";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const items: InventoryItem[] = data.inventory || [];
        setInventory(items);
        // Extract unique locations
        const locs = Array.from(
          new Map(items.map((i) => [i.location.id, i.location])).values()
        );
        setLocations(locs);
      }
    } catch {
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const url = selectedLocation !== "all"
        ? `/api/inventory/movement?locationId=${selectedLocation}&limit=100`
        : "/api/inventory/movement?limit=100";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements || []);
      }
    } catch {
      toast.error("Error al cargar movimientos");
    } finally {
      setLoadingMovements(false);
    }
  }, [selectedLocation]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => {
    if (activeTab === "movements") fetchMovements();
  }, [activeTab, fetchMovements]);

  const filtered = inventory.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.product.name.toLowerCase().includes(q) ||
      item.product.sku?.toLowerCase().includes(q) ||
      item.location.name.toLowerCase().includes(q) ||
      item.product.category.name.toLowerCase().includes(q)
    );
  });

  const lowStockItems = inventory.filter((i) => i.quantity < i.product.minStock);
  const alertItems = activeTab === "alerts" ? lowStockItems : filtered;

  // KPIs
  const totalProducts = new Set(inventory.map((i) => i.product.id)).size;
  const totalEntries = inventory.length;
  const lowCount = lowStockItems.length;
  const zeroCount = inventory.filter((i) => i.quantity <= 0).length;

  const submitAdjustment = async () => {
    if (!adjustItem || !adjustQty) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Cantidad inválida");
      return;
    }
    setAdjusting(true);
    try {
      const res = await fetch("/api/inventory/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustItem.product.id,
          locationId: adjustItem.location.id,
          type: adjustType,
          quantity: qty,
          reason: adjustReason || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Movimiento registrado");
        setAdjustItem(null);
        setAdjustQty("");
        setAdjustReason("");
        fetchInventory();
        if (activeTab === "movements") fetchMovements();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error");
      }
    } catch {
      toast.error("Error al registrar movimiento");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario</h1>
          <p className="text-sm text-zinc-400">Stock por producto y ubicación</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Productos", value: totalProducts, icon: Package, color: "text-blue-400 bg-blue-400/10" },
          { label: "Registros", value: totalEntries, icon: MapPin, color: "text-emerald-400 bg-emerald-400/10" },
          { label: "Bajo mínimo", value: lowCount, icon: AlertTriangle, color: "text-amber-400 bg-amber-400/10", alert: lowCount > 0 },
          { label: "Sin stock", value: zeroCount, icon: AlertTriangle, color: "text-red-400 bg-red-400/10", alert: zeroCount > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className={cn(
            "rounded-lg border bg-zinc-900/50 p-4 flex items-center gap-3",
            kpi.alert ? "border-amber-500/30" : "border-zinc-800"
          )}>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", kpi.color)}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">{kpi.label}</p>
              <p className={cn("text-xl font-bold", kpi.alert && kpi.value > 0 ? "text-amber-400" : "text-white")}>
                {kpi.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Location Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1 w-fit">
          {(["stock", "movements", "alerts"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {tab === "stock" && "Stock"}
              {tab === "movements" && (
                <span className="flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Movimientos</span>
              )}
              {tab === "alerts" && (
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Alertas {lowCount > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5">{lowCount}</span>}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Location filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedLocation("all")}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-md text-sm border transition-all",
              selectedLocation === "all"
                ? "bg-zinc-700 text-white border-zinc-600"
                : "border-zinc-800 text-zinc-400 hover:text-white"
            )}
          >
            Todos los locales
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-md text-sm border transition-all flex items-center gap-1.5",
                selectedLocation === loc.id
                  ? "bg-zinc-700 text-white border-zinc-600"
                  : "border-zinc-800 text-zinc-400 hover:text-white"
              )}
            >
              <MapPin className="h-3 w-3" />
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search (only for stock/alerts tab) */}
      {activeTab !== "movements" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar por producto, SKU, categoría o ubicación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
          />
        </div>
      )}

      {/* Stock Table */}
      {(activeTab === "stock" || activeTab === "alerts") && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              {activeTab === "alerts" ? `${lowStockItems.length} productos bajo mínimo` : `${filtered.length} registros`}
            </span>
            {activeTab === "alerts" && lowCount === 0 && (
              <span className="text-xs text-emerald-400">Todo el stock está al nivel adecuado</span>
            )}
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Producto</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Categoría</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Ubicación</th>
                    <th className="text-right px-4 py-3">Cantidad</th>
                    <th className="text-right px-4 py-3 hidden sm:table-cell">Mínimo</th>
                    <th className="text-right px-4 py-3 hidden sm:table-cell">Máximo</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="text-center px-4 py-3">Ajustar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {alertItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-zinc-500">
                        {activeTab === "alerts" ? "No hay alertas de stock" : "Sin resultados"}
                      </td>
                    </tr>
                  ) : alertItems.map((item) => {
                    const status = getStockStatus(item.quantity, item.product.minStock);
                    const isLow = item.quantity < item.product.minStock;
                    const pct = item.product.maxStock > 0
                      ? Math.min(100, (item.quantity / item.product.maxStock) * 100)
                      : null;

                    return (
                      <tr key={item.id} className={cn(
                        "hover:bg-zinc-800/30 transition-colors",
                        isLow && "bg-red-500/5"
                      )}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                              isLow ? "bg-red-500/10" : "bg-zinc-800"
                            )}>
                              <Package className={cn("h-4 w-4", isLow ? "text-red-400" : "text-zinc-400")} />
                            </div>
                            <div>
                              <p className="font-medium text-white">{item.product.name}</p>
                              {item.product.sku && (
                                <p className="text-xs text-zinc-500 font-mono">{item.product.sku}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-zinc-400">
                          {item.product.category.name}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="flex items-center gap-1.5 text-zinc-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {item.location.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div>
                            <span className={cn("font-bold text-base", isLow ? "text-red-400" : "text-white")}>
                              {item.quantity}
                            </span>
                            <span className="text-zinc-500 text-xs ml-1">{item.product.unit}</span>
                            {pct !== null && (
                              <div className="mt-1 h-1 w-16 ml-auto rounded-full bg-zinc-800">
                                <div
                                  className={cn("h-1 rounded-full", isLow ? "bg-red-400" : "bg-emerald-400")}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-500 hidden sm:table-cell">
                          {item.product.minStock} {item.product.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-500 hidden sm:table-cell">
                          {item.product.maxStock > 0 ? `${item.product.maxStock} ${item.product.unit}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.color)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                            onClick={() => { setAdjustItem(item); setAdjustType("IN"); setAdjustQty(""); setAdjustReason(""); }}
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === "movements" && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
            <span className="text-sm font-medium text-white">{movements.length} movimientos</span>
          </div>
          {loadingMovements ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Producto</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Ubicación</th>
                    <th className="text-right px-4 py-3">Cantidad</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Motivo</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Usuario</th>
                    <th className="text-right px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-zinc-500">Sin movimientos</td>
                    </tr>
                  ) : movements.map((mov) => {
                    const cfg = movementTypeConfig[mov.type as keyof typeof movementTypeConfig] || movementTypeConfig.IN;
                    const Icon = cfg.icon;
                    return (
                      <tr key={mov.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={cn("flex items-center gap-1.5 font-medium", cfg.color)}>
                            <Icon className="h-4 w-4 shrink-0" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{mov.product.name}</p>
                          {mov.product.sku && <p className="text-xs text-zinc-500 font-mono">{mov.product.sku}</p>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="flex items-center gap-1.5 text-zinc-400">
                            <MapPin className="h-3 w-3" /> {mov.location.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn("font-bold", cfg.color)}>
                            {mov.type === "OUT" || mov.type === "TRANSFER" ? "-" : mov.type === "ADJUSTMENT" ? "=" : "+"}
                            {mov.quantity}
                          </span>
                          <span className="text-zinc-500 text-xs ml-1">{mov.product.unit}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-zinc-400">
                          {mov.reason || <span className="text-zinc-600">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-zinc-400">{mov.user.name}</td>
                        <td className="px-4 py-3 text-right text-zinc-500 text-xs">
                          {new Date(mov.createdAt).toLocaleString("pt-PT", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Ajustar Stock</h3>
                <p className="text-sm text-zinc-400 mt-0.5">{adjustItem.product.name} · {adjustItem.location.name}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400" onClick={() => setAdjustItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Current stock */}
            <div className="rounded-lg bg-zinc-800/50 px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-zinc-400">Stock actual</span>
              <span className="text-lg font-bold text-white">
                {adjustItem.quantity} <span className="text-zinc-500 text-sm font-normal">{adjustItem.product.unit}</span>
              </span>
            </div>

            {/* Type selector */}
            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs uppercase tracking-wide">Tipo de movimiento</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "IN", label: "Entrada", icon: TrendingUp, color: "emerald" },
                  { value: "OUT", label: "Salida", icon: TrendingDown, color: "red" },
                  { value: "ADJUSTMENT", label: "Ajuste", icon: SlidersHorizontal, color: "amber" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setAdjustType(t.value as "IN" | "OUT" | "ADJUSTMENT")}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-all",
                      adjustType === t.value
                        ? t.color === "emerald"
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                          : t.color === "red"
                          ? "border-red-500/50 bg-red-500/10 text-red-400"
                          : "border-amber-500/50 bg-amber-500/10 text-amber-400"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    )}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
              </div>
              {adjustType === "ADJUSTMENT" && (
                <p className="text-xs text-amber-400">El ajuste establece el stock al valor exacto ingresado</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Cantidad ({adjustItem.product.unit})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="0"
                className="bg-zinc-800/50 border-zinc-700 text-white text-lg font-bold"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Motivo <span className="text-zinc-600">(opcional)</span></Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ej: Recepción de mercancía, inventario físico..."
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600"
              />
            </div>

            {/* Preview */}
            {adjustQty && !isNaN(parseFloat(adjustQty)) && (
              <div className="rounded-lg bg-zinc-800/50 px-4 py-3 flex justify-between items-center text-sm">
                <span className="text-zinc-400">Resultado</span>
                <span className="font-bold text-white">
                  {adjustType === "IN"
                    ? adjustItem.quantity + parseFloat(adjustQty)
                    : adjustType === "OUT"
                    ? adjustItem.quantity - parseFloat(adjustQty)
                    : parseFloat(adjustQty)}{" "}
                  <span className="text-zinc-500 font-normal">{adjustItem.product.unit}</span>
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-400" onClick={() => setAdjustItem(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={!adjustQty || adjusting}
                onClick={submitAdjustment}
              >
                {adjusting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
