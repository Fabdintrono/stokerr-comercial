"use client";

import { useState, useEffect, useCallback, use } from "react";
import { cn } from "@/lib/utils";
import { ChefHat, Clock, CheckCircle, Loader2, RefreshCw, Utensils } from "lucide-react";

interface OrderItem {
  id: string;
  quantity: number;
  product: { name: string };
}

interface KitchenOrder {
  id: string;
  number: string;
  status: "OPEN" | "PREPARING";
  notes: string | null;
  createdAt: string;
  table: { number: string } | null;
  items: OrderItem[];
}

const STATUS_CONFIG = {
  OPEN:      { label: "Nuevo",       color: "border-amber-500  bg-amber-500/10  text-amber-400",  dot: "bg-amber-400" },
  PREPARING: { label: "Preparando",  color: "border-blue-500   bg-blue-500/10   text-blue-400",   dot: "bg-blue-400 animate-pulse" },
};

function elapsed(createdAt: string): string {
  const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function elapsedWarning(createdAt: string): boolean {
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
  return mins >= 15;
}

export default function KitchenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [locationName, setLocationName] = useState("");
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [, setTick] = useState(0); // force re-render for elapsed time

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/public/kitchen/${token}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (res.ok) {
        const d = await res.json();
        setLocationName(d.locationName);
        setOrders(d.orders);
        setLastUpdate(new Date());
      }
    } catch { /* silent */ }
    if (!silent) setLoading(false);
  }, [token]);

  // Initial load
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Poll every 12 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchOrders(true), 12000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Re-render every 10s to update elapsed times
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId: string, status: "PREPARING" | "SERVED") => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/public/kitchen/${token}/order/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        if (status === "SERVED") {
          setOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        }
      }
    } catch { /* silent */ }
    setUpdatingId(null);
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 text-lg">Pantalla de cocina no encontrada</p>
          <p className="text-zinc-700 text-sm mt-1">Verifica la URL con el gerente</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-white">Cocina — {locationName}</div>
            <div className="text-xs text-zinc-500">
              Actualizado {lastUpdate.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-400">{orders.length} pedido{orders.length !== 1 ? "s" : ""} activo{orders.length !== 1 ? "s" : ""}</span>
          </div>
          <button
            onClick={() => fetchOrders()}
            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Orders grid */}
      <div className="flex-1 p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Utensils className="h-16 w-16 text-zinc-800" />
            <p className="text-zinc-600 text-xl font-semibold">Sin pedidos pendientes</p>
            <p className="text-zinc-700 text-sm">La pantalla se actualiza automáticamente</p>
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
            {orders.map(order => {
              const cfg = STATUS_CONFIG[order.status];
              const warn = elapsedWarning(order.createdAt);
              const isUpdating = updatingId === order.id;
              return (
                <div
                  key={order.id}
                  className={cn(
                    "rounded-2xl border-2 flex flex-col gap-0 overflow-hidden transition-all",
                    cfg.color
                  )}
                >
                  {/* Order header */}
                  <div className="flex items-center justify-between px-5 py-4 bg-black/20">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-3 w-3 rounded-full flex-shrink-0", cfg.dot)} />
                      <div>
                        <div className="text-2xl font-black text-white">
                          {order.table ? `Mesa ${order.table.number}` : "Sin mesa"}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono">{order.number}</div>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full",
                      warn ? "bg-red-500/20 text-red-400" : "bg-black/20 text-zinc-300"
                    )}>
                      <Clock className="h-3.5 w-3.5" />
                      {elapsed(order.createdAt)}
                      {warn && " ⚠"}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-5 py-4 flex-1 space-y-2.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-white w-10 text-center flex-shrink-0">
                          {item.quantity}
                        </span>
                        <span className="text-lg font-semibold text-zinc-100 leading-tight">
                          {item.product.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  {order.notes && (
                    <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="text-sm text-amber-300 italic">📝 {order.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
                    {order.status === "OPEN" && (
                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus(order.id, "PREPARING")}
                        className="flex-1 py-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 border border-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Preparando
                      </button>
                    )}
                    <button
                      disabled={isUpdating}
                      onClick={() => updateStatus(order.id, "SERVED")}
                      className="flex-1 py-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Listo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
