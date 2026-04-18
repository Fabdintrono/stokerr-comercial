"use client";
import { useState, useEffect, useCallback } from "react";
import { Calendar, Loader2, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const presets = [{ label: "Hoy", days: 0 }, { label: "7 días", days: 7 }, { label: "30 días", days: 30 }];
function dateStr(d: Date) { return d.toISOString().slice(0, 10); }

interface Register { id: string; openedAt: string; closedAt: string; openingBalance: number; closingBalance: number; totalSales: number; user: string }

export default function RegistersReportPage() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [registers, setRegisters] = useState<Register[]>([]);
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
      if (res.ok) { const d = await res.json(); setRegisters(d.data?.registers || []); }
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

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-semibold text-white">Cierres de Caja</h1>
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
      ) : registers.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 py-16 text-center text-zinc-500">
          <Landmark className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Sin cierres en el período
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {registers.map(r => {
              const diff = r.closingBalance - r.openingBalance - r.totalSales;
              return (
                <div key={r.id} className="flex items-center justify-between px-4 py-4 hover:bg-zinc-800/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{new Date(r.openedAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(r.openedAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} → {r.closedAt ? new Date(r.closedAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "—"} · {r.user}
                    </p>
                  </div>
                  <div className="flex items-center gap-8 text-right">
                    <div><p className="text-xs text-zinc-500">Apertura</p><p className="text-sm font-mono text-zinc-300">€{r.openingBalance.toFixed(2)}</p></div>
                    <div><p className="text-xs text-zinc-500">Ventas</p><p className="text-sm font-bold text-emerald-400">€{r.totalSales.toFixed(2)}</p></div>
                    <div><p className="text-xs text-zinc-500">Cierre</p><p className="text-sm font-mono text-zinc-300">€{r.closingBalance.toFixed(2)}</p></div>
                    {Math.abs(diff) > 0.01 && (
                      <div><p className="text-xs text-zinc-500">Diferencia</p><p className={cn("text-sm font-medium font-mono", diff < 0 ? "text-red-400" : "text-emerald-400")}>{diff > 0 ? "+" : ""}€{diff.toFixed(2)}</p></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
