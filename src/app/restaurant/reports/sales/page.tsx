"use client";
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, ShoppingCart, DollarSign, Calendar, Loader2, BarChart3, CreditCard, Banknote, Smartphone, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportData {
  summary: { totalSales: number; totalOrders: number; avgTicket: number };
  byDay: { date: string; sales: number; orders: number }[];
  byMethod: { method: string; amount: number }[];
  byHour: { hour: string | number; sales: number }[];
}

const methodLabels: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", MBWAY: "MB Way", TRANSFER: "Transferencia" };
const methodIcons: Record<string, any> = { CASH: Banknote, CARD: CreditCard, MBWAY: Smartphone, TRANSFER: ArrowUpRight };
const methodColors: Record<string, string> = { CASH: "text-emerald-400 bg-emerald-400/10", CARD: "text-blue-400 bg-blue-400/10", MBWAY: "text-purple-400 bg-purple-400/10", TRANSFER: "text-amber-400 bg-amber-400/10" };
const presets = [{ label: "Hoy", days: 0 }, { label: "7 días", days: 7 }, { label: "30 días", days: 30 }];
function dateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function SalesReportPage() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
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
      if (res.ok) { const d = await res.json(); setData(d.data); }
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

  const maxDay = data ? Math.max(...data.byDay.map(d => d.sales), 1) : 1;
  const maxHour = data ? Math.max(...data.byHour.map(h => h.sales), 1) : 1;
  const totalByMethod = data?.byMethod.reduce((s, m) => s + m.amount, 0) || 0;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-semibold text-white">Ventas</h1>
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
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Ventas", value: `€${data.summary.totalSales.toFixed(2)}`, icon: TrendingUp, color: "text-emerald-400 bg-emerald-400/10" },
              { label: "Pedidos", value: data.summary.totalOrders, icon: ShoppingCart, color: "text-blue-400 bg-blue-400/10" },
              { label: "Ticket Medio", value: `€${data.summary.avgTicket.toFixed(2)}`, icon: DollarSign, color: "text-amber-400 bg-amber-400/10" },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 flex items-center gap-4">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl shrink-0", kpi.color)}><kpi.icon className="h-6 w-6" /></div>
                <div><p className="text-sm text-zinc-400">{kpi.label}</p><p className="text-2xl font-bold text-white">{kpi.value}</p></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-semibold text-white">Ventas por día</h3></div>
              {data.byDay.length === 0 ? <p className="text-sm text-zinc-500 py-6 text-center">Sin ventas en el período</p> : (
                <div className="space-y-2">
                  {data.byDay.map(d => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500 w-16 shrink-0">{new Date(d.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}</span>
                      <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
                        <div className="h-full bg-emerald-500/60 rounded" style={{ width: `${(d.sales / maxDay) * 100}%`, minWidth: d.sales > 0 ? "2px" : "0" }} />
                      </div>
                      <span className="text-xs font-medium text-white w-16 text-right">€{d.sales.toFixed(2)}</span>
                      <span className="text-xs text-zinc-500 w-10 text-right">{d.orders}p</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-semibold text-white">Métodos de pago</h3></div>
              {data.byMethod.length === 0 ? <p className="text-sm text-zinc-500 py-6 text-center">Sin ventas en el período</p> : (
                <div className="space-y-3">
                  {data.byMethod.sort((a, b) => b.amount - a.amount).map(m => {
                    const Icon = methodIcons[m.method] || DollarSign;
                    const pct = totalByMethod > 0 ? (m.amount / totalByMethod) * 100 : 0;
                    return (
                      <div key={m.method} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", methodColors[m.method] || "text-zinc-400 bg-zinc-400/10")}><Icon className="h-3.5 w-3.5" /></span>
                            <span className="text-sm text-zinc-300">{methodLabels[m.method] || m.method}</span>
                          </div>
                          <div className="text-right"><span className="text-sm font-bold text-white">€{m.amount.toFixed(2)}</span><span className="text-xs text-zinc-500 ml-2">{pct.toFixed(0)}%</span></div>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={cn("h-1.5 rounded-full", m.method === "CASH" ? "bg-emerald-500" : m.method === "CARD" ? "bg-blue-500" : m.method === "MBWAY" ? "bg-purple-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-semibold text-white">Ventas por hora</h3></div>
              {data.byHour.length === 0 ? <p className="text-sm text-zinc-500 py-6 text-center">Sin ventas</p> : (
                <div className="flex items-end gap-1 h-28">
                  {data.byHour.map(h => {
                    const pct = maxHour > 0 ? (h.sales / maxHour) * 100 : 0;
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                          <div className="w-full bg-emerald-500/50 hover:bg-emerald-500/80 rounded-t transition-all" style={{ height: `${Math.max(pct, 2)}%` }} title={`${h.hour}:00 — €${h.sales.toFixed(2)}`} />
                        </div>
                        <span className="text-[9px] text-zinc-600">{h.hour}h</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
