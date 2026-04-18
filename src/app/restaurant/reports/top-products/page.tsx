"use client";
import { useState, useEffect, useCallback } from "react";
import { Package, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const presets = [{ label: "Hoy", days: 0 }, { label: "7 días", days: 7 }, { label: "30 días", days: 30 }];
function dateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function TopProductsReportPage() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [products, setProducts] = useState<{ name: string; category: string; qty: number; total: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState(7);
  const [from, setFrom] = useState(() => dateStr((() => { const d = new Date(); d.setDate(d.getDate() - 6); return d; })()));
  const [to, setTo] = useState(() => dateStr(new Date()));

  useEffect(() => {
    if (typeof document === "undefined") return;
    const m = document.cookie.match(/locationId=([^;]+)/);
    if (m) { setLocationId(m[1]); return; }
    fetch("/api/auth/business").then(r => r.json()).then(d => {
      const loc = d.businesses?.[0]?.locations?.find((l: any) => l.type === "RESTAURANT");
      if (loc) setLocationId(loc.id);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/restaurant?locationId=${locationId}&from=${from}&to=${to}`);
      if (res.ok) { const d = await res.json(); setProducts(d.data?.topProducts || []); }
    } catch {} finally { setLoading(false); }
  }, [locationId, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyPreset = (days: number) => {
    setPreset(days);
    const end = new Date(), start = new Date();
    if (days === 0) setFrom(dateStr(end));
    else { start.setDate(end.getDate() - (days - 1)); setFrom(dateStr(start)); }
    setTo(dateStr(end));
  };

  const maxTotal = products.length > 0 ? Math.max(...products.map(p => p.total)) : 1;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-semibold text-white">Productos más Vendidos</h1>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
          {presets.map(p => (
            <button key={p.days} onClick={() => applyPreset(p.days)}
              className={cn("px-3 py-1.5 text-sm transition-all", preset === p.days ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-sm text-zinc-400">
          <Calendar className="h-4 w-4" />
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset(-1); }} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs" />
          <span>→</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset(-1); }} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 py-16 text-center text-zinc-500">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Sin ventas en el período
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Categoría</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Unidades</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Total</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-400 w-32">Participación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {products.map((p, i) => (
                <tr key={p.name} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 text-zinc-600 font-mono text-xs">#{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{p.category}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{p.qty}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">€{p.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${(p.total / maxTotal) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
