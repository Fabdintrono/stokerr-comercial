"use client";
import { useState, useEffect } from "react";
import { Package, AlertTriangle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

const UNIT_LABELS: Record<string, string> = { KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "un", BOX: "caja", CASE: "case", GARRAFA: "garrafa" };
function fmt(n: number) { return n % 1 === 0 ? n.toString() : n.toFixed(2); }
function fmtEur(n: number) { return `€${Number(n).toFixed(2)}`; }

interface InventoryItem {
  id: string; quantity: number;
  product: { name: string; sku: string | null; unit: string; minStock: number; maxStock: number; costPrice: number; category: { name: string } };
  location: { name: string; type: string };
}

export default function WarehouseInventoryReportPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/inventory").then(r => r.json()).then(d => setInventory(d.inventory || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = inventory.filter(i => {
    if (filter === "LOW") return i.quantity <= i.product.minStock;
    if (filter === "OVER") return i.product.maxStock > 0 && i.quantity > i.product.maxStock;
    return true;
  });
  const totalValue = inventory.reduce((s, i) => s + i.quantity * Number(i.product.costPrice), 0);
  const lowCount = inventory.filter(i => i.quantity <= i.product.minStock).length;
  const overCount = inventory.filter(i => i.product.maxStock > 0 && i.quantity > i.product.maxStock).length;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-semibold text-white">Inventario</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Productos", value: inventory.length, icon: Package, cls: "text-blue-400 bg-blue-500/10" },
          { label: "Valor total", value: fmtEur(totalValue), icon: TrendingUp, cls: "text-emerald-400 bg-emerald-500/10" },
          { label: "Stock bajo", value: lowCount, icon: AlertTriangle, cls: "text-amber-400 bg-amber-500/10" },
          { label: "Sobrestock", value: overCount, icon: TrendingDown, cls: "text-red-400 bg-red-500/10" },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${k.cls}`}><k.icon className="h-4 w-4" /></div>
            <div><p className="text-xs text-zinc-500">{k.label}</p><p className="text-lg font-bold text-white">{k.value}</p></div>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {[["ALL","Todos"],["LOW","Stock bajo"],["OVER","Sobrestock"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === v ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>{l}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-400" /></div> : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-zinc-900/50 border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Producto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Categoría</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Ubicación</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Stock</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Valor</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Estado</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Sin resultados</td></tr>
              ) : filtered.map(item => {
                const isLow = item.quantity <= item.product.minStock;
                const isOver = item.product.maxStock > 0 && item.quantity > item.product.maxStock;
                const unit = UNIT_LABELS[item.product.unit] || item.product.unit;
                return (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3"><div className="font-medium text-white">{item.product.name}</div>{item.product.sku && <div className="text-xs text-zinc-500">{item.product.sku}</div>}</td>
                    <td className="px-4 py-3 text-zinc-400">{item.product.category?.name || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{item.location.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmt(item.quantity)} {unit}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtEur(item.quantity * Number(item.product.costPrice))}</td>
                    <td className="px-4 py-3 text-right">
                      {isLow && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Bajo</span>}
                      {isOver && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">Exceso</span>}
                      {!isLow && !isOver && <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">OK</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
