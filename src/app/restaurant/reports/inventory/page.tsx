"use client";
import { useState, useEffect } from "react";
import { Package, AlertTriangle, Loader2 } from "lucide-react";

const UNIT_LABELS: Record<string, string> = { KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "un", BOX: "caja", CASE: "case", GARRAFA: "garrafa" };
function fmt(n: number) { return n % 1 === 0 ? n.toString() : n.toFixed(2); }

interface InventoryItem {
  id: string; quantity: number;
  product: { name: string; sku: string | null; unit: string; minStock: number; costPrice: number; category: { name: string } };
  location: { name: string };
}

export default function InventoryReportPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const m = document.cookie.match(/locationId=([^;]+)/);
        const locId = m ? m[1] : null;
        const url = locId ? `/api/inventory?locationId=${locId}` : "/api/inventory";
        const r = await fetch(url);
        const d = await r.json();
        setInventory(d.inventory || []);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = inventory.filter(i => {
    if (filter === "LOW") return i.quantity <= i.product.minStock;
    return true;
  });
  const lowCount = inventory.filter(i => i.quantity <= i.product.minStock).length;
  const totalValue = inventory.reduce((s, i) => s + i.quantity * Number(i.product.costPrice), 0);

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-semibold text-white">Inventario</h1>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Productos", value: inventory.length, cls: "text-blue-400" },
          { label: "Stock bajo", value: lowCount, cls: "text-amber-400" },
          { label: "Valor total", value: `€${totalValue.toFixed(2)}`, cls: "text-emerald-400" },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">{k.label}</p>
            <p className={`text-xl font-bold ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {[["ALL","Todos"],["LOW","Stock bajo"]].map(([v,l]) => (
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
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Stock</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Mínimo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Estado</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Sin productos</td></tr>
              ) : filtered.map(item => {
                const isLow = item.quantity <= item.product.minStock;
                const unit = UNIT_LABELS[item.product.unit] || item.product.unit;
                return (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3"><div className="font-medium text-white">{item.product.name}</div>{item.product.sku && <div className="text-xs text-zinc-500">{item.product.sku}</div>}</td>
                    <td className="px-4 py-3 text-zinc-400">{item.product.category?.name || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmt(item.quantity)} {unit}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-500">{fmt(item.product.minStock)} {unit}</td>
                    <td className="px-4 py-3 text-right">
                      {isLow
                        ? <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertTriangle className="h-3 w-3 inline mr-1" />Bajo</span>
                        : <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">OK</span>}
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
