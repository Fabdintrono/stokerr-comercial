"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  Lock,
  Unlock,
  Loader2,
  Clock,
  Receipt,
  TrendingUp,
  AlertTriangle,
  History,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface CashRegister {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  closingBalance: number | null;
  totalSales: number;
  user: { name: string };
}

interface RegisterStats {
  cashSales: number;
  cardSales: number;
  mbwaySales: number;
  transferSales: number;
  totalOrders: number;
  totalSales: number;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function elapsed(openedAt: string) {
  const diff = Date.now() - new Date(openedAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function CajaPage() {
  const { user } = useAuth();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [current, setCurrent] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [stats, setStats] = useState<RegisterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Modal state
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");
  const [processing, setProcessing] = useState(false);

  // Tick clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Get location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch("/api/auth/business");
        if (res.ok) {
          const data = await res.json();
          const biz = data.businesses?.[0];
          if (biz) {
            const loc = biz.locations.find((l: any) => l.type === "RESTAURANT");
            if (loc) setLocationId(loc.id);
          }
        }
      } catch {}
    };
    fetchLocation();
  }, []);

  const fetchData = useCallback(async () => {
    if (!locationId) return;
    try {
      const [currentRes, historyRes] = await Promise.all([
        fetch(`/api/cash-register?locationId=${locationId}&current=true`),
        fetch(`/api/cash-register?locationId=${locationId}`),
      ]);

      if (currentRes.ok) {
        const d = await currentRes.json();
        setCurrent(d.data);
      }
      if (historyRes.ok) {
        const d = await historyRes.json();
        setHistory((d.data || []).filter((r: CashRegister) => r.closedAt));
      }
    } catch {
      toast.error("Error al cargar datos de caja");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  // Fetch stats for current register
  const fetchStats = useCallback(async () => {
    if (!locationId || !current) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/orders?locationId=${locationId}&date=${today}&status=PAID`);
      if (res.ok) {
        const data = await res.json();
        const orders = (data.data || []).filter(
          (o: any) => new Date(o.createdAt) >= new Date(current.openedAt)
        );
        const byMethod: Record<string, number> = { CASH: 0, CARD: 0, MBWAY: 0, TRANSFER: 0 };
        let totalSales = 0;
        for (const order of orders) {
          for (const payment of order.payments || []) {
            byMethod[payment.method] = (byMethod[payment.method] || 0) + Number(payment.amount);
            totalSales += Number(payment.amount);
          }
        }
        setStats({
          cashSales: byMethod.CASH,
          cardSales: byMethod.CARD,
          mbwaySales: byMethod.MBWAY,
          transferSales: byMethod.TRANSFER,
          totalOrders: orders.length,
          totalSales,
        });
      }
    } catch {}
  }, [locationId, current]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const openRegister = async () => {
    if (!locationId || !user) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          userId: user.id,
          openingBalance: parseFloat(openingBalance) || 0,
        }),
      });
      if (res.ok) {
        toast.success("Caja abierta");
        setShowOpen(false);
        setOpeningBalance("0");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al abrir caja");
      }
    } catch {
      toast.error("Error");
    } finally {
      setProcessing(false);
    }
  };

  const closeRegister = async () => {
    if (!current) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/cash-register", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: current.id,
          closingBalance: parseFloat(closingBalance) || 0,
        }),
      });
      if (res.ok) {
        toast.success("Caja cerrada correctamente");
        setShowClose(false);
        setClosingBalance("0");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al cerrar caja");
      }
    } catch {
      toast.error("Error");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const diff = stats ? stats.totalSales - (current?.openingBalance || 0) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Caja Registradora</h1>
          <p className="text-xs text-zinc-500">
            {now.toLocaleString("pt-PT", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
        {!current ? (
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2" onClick={() => setShowOpen(true)}>
            <Unlock className="h-4 w-4" /> Abrir Caja
          </Button>
        ) : (
          <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2" onClick={() => { setClosingBalance(String(current.openingBalance + (stats?.totalSales || 0))); setShowClose(true); }}>
            <Lock className="h-4 w-4" /> Cerrar Caja
          </Button>
        )}
      </div>

      {/* Current register status */}
      {current ? (
        <>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                  <Unlock className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-400">Caja Abierta</p>
                  <p className="text-sm text-zinc-400">
                    Por {current.user.name} desde las {formatTime(current.openedAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                  <Clock className="h-4 w-4" />
                  {elapsed(current.openedAt)} abierta
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Apertura: €{Number(current.openingBalance).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Sales stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Ventas", value: stats?.totalSales || 0, icon: TrendingUp, color: "text-emerald-400 bg-emerald-400/10" },
              { label: "Pedidos", value: stats?.totalOrders || 0, icon: Receipt, color: "text-blue-400 bg-blue-400/10", isCount: true },
              { label: "Efectivo", value: stats?.cashSales || 0, icon: DollarSign, color: "text-zinc-400 bg-zinc-400/10" },
              { label: "Tarjeta / Digital", value: (stats?.cardSales || 0) + (stats?.mbwaySales || 0) + (stats?.transferSales || 0), icon: DollarSign, color: "text-zinc-400 bg-zinc-400/10" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", kpi.color)}>
                  <kpi.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">{kpi.label}</p>
                  <p className="text-lg font-bold text-white">
                    {(kpi as any).isCount ? kpi.value : `€${Number(kpi.value).toFixed(2)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown by method */}
          {stats && stats.totalSales > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Desglose por método de pago</h3>
              <div className="space-y-2">
                {[
                  { label: "Efectivo", value: stats.cashSales, color: "bg-emerald-500" },
                  { label: "Tarjeta", value: stats.cardSales, color: "bg-blue-500" },
                  { label: "MB Way", value: stats.mbwaySales, color: "bg-purple-500" },
                  { label: "Transferencia", value: stats.transferSales, color: "bg-amber-500" },
                ].filter(m => m.value > 0).map((m) => {
                  const pct = stats.totalSales > 0 ? (m.value / stats.totalSales) * 100 : 0;
                  return (
                    <div key={m.label} className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400 w-24 shrink-0">{m.label}</span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={cn("h-2 rounded-full", m.color)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium text-white w-16 text-right">€{m.value.toFixed(2)}</span>
                      <span className="text-xs text-zinc-500 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-800 mx-auto mb-4">
            <Lock className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Caja cerrada</h3>
          <p className="text-sm text-zinc-500 mb-6">Abre la caja para empezar a registrar ventas</p>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2" onClick={() => setShowOpen(true)}>
            <Unlock className="h-4 w-4" /> Abrir Caja
          </Button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
            <History className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Historial de cajas</span>
          </div>
          <div className="divide-y divide-zinc-800">
            {history.slice(0, 10).map((reg) => (
              <div key={reg.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30">
                <div>
                  <p className="text-sm font-medium text-white">{formatDate(reg.openedAt)}</p>
                  <p className="text-xs text-zinc-500">
                    {formatTime(reg.openedAt)} → {reg.closedAt ? formatTime(reg.closedAt) : "—"} · {reg.user.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">€{Number(reg.totalSales).toFixed(2)}</p>
                  <p className="text-xs text-zinc-500">
                    Apertura €{Number(reg.openingBalance).toFixed(2)} · Cierre €{Number(reg.closingBalance || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open modal */}
      {showOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Abrir Caja</h3>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400" onClick={() => setShowOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Fondo inicial (efectivo en caja)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">€</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="pl-8 bg-zinc-800/50 border-zinc-700 text-white text-lg font-bold"
                  autoFocus
                />
              </div>
            </div>
            <div className="rounded-lg bg-zinc-800/50 px-4 py-3 text-sm text-zinc-400">
              Se abrirá la caja con €{parseFloat(openingBalance || "0").toFixed(2)} de fondo inicial. Todas las ventas se registrarán a partir de este momento.
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-400" onClick={() => setShowOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" disabled={processing} onClick={openRegister}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                Abrir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close modal */}
      {showClose && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Cerrar Caja</h3>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400" onClick={() => setShowClose(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-zinc-800/50 px-4 py-3 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Fondo inicial</span>
                <span className="text-white">€{Number(current.openingBalance).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Ventas en efectivo</span>
                <span className="text-emerald-400">+€{Number(stats?.cashSales || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-zinc-700 pt-2 flex justify-between font-semibold">
                <span className="text-zinc-300">Efectivo esperado</span>
                <span className="text-white">€{(Number(current.openingBalance) + Number(stats?.cashSales || 0)).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Efectivo contado en caja</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">€</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  className="pl-8 bg-zinc-800/50 border-zinc-700 text-white text-lg font-bold"
                  autoFocus
                />
              </div>
            </div>

            {/* Difference */}
            {closingBalance && !isNaN(parseFloat(closingBalance)) && (() => {
              const expected = Number(current.openingBalance) + Number(stats?.cashSales || 0);
              const counted = parseFloat(closingBalance);
              const diff = counted - expected;
              return Math.abs(diff) > 0.01 ? (
                <div className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-3 text-sm",
                  diff < 0 ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                )}>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {diff < 0 ? `Faltante de €${Math.abs(diff).toFixed(2)}` : `Sobrante de €${diff.toFixed(2)}`}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm bg-emerald-500/10 text-emerald-400">
                  <Check className="h-4 w-4" /> Cuadra perfectamente
                </div>
              );
            })()}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-400" onClick={() => setShowClose(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={processing} onClick={closeRegister}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
