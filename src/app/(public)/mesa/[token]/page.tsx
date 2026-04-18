"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Loader2, UtensilsCrossed, Receipt, Clock } from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface BillData {
  tableNumber: string;
  locationName: string;
  order: {
    number: string;
    status: string;
    notes: string | null;
    createdAt: string;
    items: OrderItem[];
    subtotal: number;
    iva: number;
    total: number;
  } | null;
}

function fmt(n: number) {
  return `€${n.toFixed(2)}`;
}

const STATUS_LABEL: Record<string, string> = {
  OPEN:      "Pedido recibido",
  PREPARING: "En preparación",
  SERVED:    "Servido",
};

export default function MesaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [data, setData] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchBill = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/public/mesa/${token}`);
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    if (!silent) setLoading(false);
  }, [token]);

  useEffect(() => { fetchBill(); }, [fetchBill]);

  // Poll every 20s to reflect new items added by waiter
  useEffect(() => {
    const interval = setInterval(() => fetchBill(true), 20000);
    return () => clearInterval(interval);
  }, [fetchBill]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <UtensilsCrossed className="h-14 w-14 text-zinc-700" />
        <p className="text-zinc-400 text-lg font-semibold">Mesa no encontrada</p>
        <p className="text-zinc-600 text-sm">Este código QR no es válido o ha expirado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 mb-3">
            <UtensilsCrossed className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">{data.locationName}</h1>
          <p className="text-zinc-500 text-sm mt-1">Mesa {data.tableNumber}</p>
        </div>

        {!data.order ? (
          /* No active order */
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <Receipt className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-semibold">Sin pedido activo</p>
            <p className="text-zinc-600 text-sm mt-1">Tu mesonero tomará tu pedido en breve.</p>
          </div>
        ) : (
          /* Active order */
          <div className="space-y-4">

            {/* Status badge */}
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-400">
                  {STATUS_LABEL[data.order.status] || data.order.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Clock className="h-3.5 w-3.5" />
                {new Date(data.order.createdAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Note */}
            {data.order.notes && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-400 italic">📝 {data.order.notes}</p>
              </div>
            )}

            {/* Items */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tu pedido</p>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {data.order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-zinc-400 w-6">{item.quantity}×</span>
                      <span className="text-base font-semibold text-white">{item.name}</span>
                    </div>
                    <span className="text-base font-bold text-zinc-300">{fmt(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 flex justify-between text-sm text-zinc-500">
                <span>Subtotal</span>
                <span>{fmt(data.order.subtotal)}</span>
              </div>
              <div className="px-5 py-3 flex justify-between text-sm text-zinc-500 border-t border-zinc-800/60">
                <span>IVA (23%)</span>
                <span>{fmt(data.order.iva)}</span>
              </div>
              <div className="px-5 py-4 flex justify-between items-center border-t border-zinc-700 bg-zinc-800/40">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="text-2xl font-black text-emerald-400">{fmt(data.order.total)}</span>
              </div>
            </div>

            {/* Footer note */}
            <p className="text-center text-xs text-zinc-700 pb-4">
              Para pagar, solicita la cuenta a tu mesonero.<br />
              Esta página se actualiza automáticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
