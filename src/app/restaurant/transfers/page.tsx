"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Clock, CheckCircle2, XCircle, Truck, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface Transfer {
  id: string;
  reference: string;
  status: string;
  notes: string | null;
  createdAt: string;
  fromLocation: { id: string; name: string; type: string };
  toLocation: { id: string; name: string; type: string };
  lineItems: { quantity: number; product: { id: string; name: string; sku: string | null; unit: string } }[];
}

const UNIT_LABELS: Record<string, string> = {
  KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "un", BOX: "caja", CASE: "case", GARRAFA: "garrafa",
};

const STATUS_MAP: Record<string, { label: string; cls: string; icon: any }> = {
  PENDING:   { label: "Pendiente",  cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",    icon: Clock },
  COMPLETED: { label: "Aceptada",   cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  REJECTED:  { label: "Rechazada",  cls: "bg-red-500/10 text-red-400 border-red-500/20",          icon: XCircle },
};

function getLocationId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/locationId=([^;]+)/);
  return m ? m[1] : null;
}

export default function RestaurantTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
  const [myLocationId, setMyLocationId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transfers");
      const data = await res.json();
      const lid = getLocationId();
      setMyLocationId(lid);
      // Only show transfers TO this restaurant
      const incoming = (data.transfers || []).filter(
        (t: Transfer) => !lid || t.toLocation.id === lid
      );
      setTransfers(incoming);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, action: "accept" | "reject") {
    setActioning(id);
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(action === "accept" ? "Transferencia aceptada — stock actualizado" : "Transferencia rechazada");
      load();
    } catch (e: any) {
      toast.error(e.message || "Error al procesar transferencia");
    } finally {
      setActioning(null);
    }
  }

  const filtered = filter === "PENDING"
    ? transfers.filter((t) => t.status === "PENDING")
    : transfers;

  const pendingCount = transfers.filter((t) => t.status === "PENDING").length;

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Transferencias Entrantes</h1>
          <p className="text-xs text-zinc-500">{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""} de aceptar</p>
        </div>
        <div className="flex gap-1">
          {(["PENDING", "ALL"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filter === f
                ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
            }`}>
              {f === "PENDING" ? `Pendientes${pendingCount > 0 ? ` (${pendingCount})` : ""}` : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 py-12 text-center text-zinc-500">
          <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {filter === "PENDING" ? "No hay transferencias pendientes" : "Sin transferencias"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const S = STATUS_MAP[t.status] || STATUS_MAP.PENDING;
            const Icon = S.icon;
            const isOpen = expanded === t.id;
            const isPending = t.status === "PENDING";

            return (
              <div key={t.id} className={`rounded-lg border overflow-hidden ${isPending ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-900/50"}`}>
                <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : t.id)}>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${S.cls}`}>
                      <Icon className="h-3 w-3" /> {S.label}
                    </span>
                    <span className="text-sm text-white">De: {t.fromLocation.name}</span>
                    <span className="text-xs text-zinc-500 font-mono">{t.reference}</span>
                    <span className="text-xs text-zinc-500">{t.lineItems.length} producto{t.lineItems.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      {new Date(t.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                    </span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-zinc-500">
                          <th className="text-left pb-1">Producto</th>
                          <th className="text-right pb-1">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {t.lineItems.map((item) => (
                          <tr key={item.product.id}>
                            <td className="py-1.5 text-zinc-300">{item.product.name}</td>
                            <td className="py-1.5 text-right text-white font-mono">
                              {item.quantity} {UNIT_LABELS[item.product.unit] || item.product.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {t.notes && <p className="text-xs text-zinc-400 italic">"{t.notes}"</p>}

                    {isPending && (
                      <div className="flex gap-2 justify-end pt-1">
                        <Button size="sm" variant="outline" disabled={actioning === t.id}
                          onClick={() => handleAction(t.id, "reject")}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5">
                          <X className="h-3.5 w-3.5" /> Rechazar
                        </Button>
                        <Button size="sm" disabled={actioning === t.id}
                          onClick={() => handleAction(t.id, "accept")}
                          className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                          {actioning === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Aceptar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
