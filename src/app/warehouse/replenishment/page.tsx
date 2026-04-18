"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Check, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface Product { id: string; name: string; unit: string }
interface Request {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string | null;
  reviewNotes: string | null;
  createdAt: string;
  fromLocation: { id: string; name: string };
  toLocation: { id: string; name: string };
  requestedBy: { name: string };
  reviewedBy: { name: string } | null;
  reviewedAt: string | null;
  items: { product: Product; quantity: number }[];
}

const UNIT_LABELS: Record<string, string> = {
  KG: "kg", G: "g", L: "L", ML: "ml",
  UNIT: "un", BOX: "caja", CASE: "case", GARRAFA: "garrafa",
};

const STATUS = {
  PENDING:  { label: "Pendiente",  icon: Clock,         cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  APPROVED: { label: "Aprobada",   icon: CheckCircle2,  cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  REJECTED: { label: "Rechazada",  icon: XCircle,       cls: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function getLocationId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/locationId=([^;]+)/);
  return m ? m[1] : null;
}

export default function WarehouseReplenishmentPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // For warehouse manager: get warehouse locationId from business API
      let locationId = getLocationId(); // fallback to cookie (usually null for warehouse)
      if (!locationId) {
        const bizRes = await fetch("/api/auth/business");
        const bizData = await bizRes.json();
        const biz = bizData.businesses?.[0];
        const wh = (biz?.locations || []).find((l: any) => l.type === "WAREHOUSE" && l.isActive !== false);
        locationId = wh?.id || null;
      }
      const url = locationId ? `/api/replenishment?locationId=${locationId}` : "/api/replenishment";
      const res = await fetch(url);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActioning(id);
    try {
      const res = await fetch(`/api/replenishment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes: reviewNotes[id] || "" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success(action === "approve" ? "Solicitud aprobada" : "Solicitud rechazada");
      load();
    } catch (e: any) {
      toast.error(e.message || "Error al procesar solicitud");
    } finally {
      setActioning(null);
    }
  }

  const filtered = filter === "PENDING"
    ? requests.filter((r) => r.status === "PENDING")
    : requests;

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Solicitudes de Reposición</h1>
          <p className="text-xs text-zinc-500">{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-1">
          {(["PENDING", "ALL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filter === f
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {f === "PENDING" ? `Pendientes${pendingCount > 0 ? ` (${pendingCount})` : ""}` : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 py-12 text-center text-zinc-500">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {filter === "PENDING" ? "No hay solicitudes pendientes" : "Sin solicitudes"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => {
            const S = STATUS[req.status];
            const Icon = S.icon;
            const isOpen = expanded === req.id;
            const isPending = req.status === "PENDING";

            return (
              <div key={req.id} className={`rounded-lg border overflow-hidden ${isPending ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 bg-zinc-900/50"}`}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : req.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${S.cls}`}>
                      <Icon className="h-3 w-3" /> {S.label}
                    </span>
                    <span className="text-sm text-white">{req.fromLocation.name}</span>
                    <span className="text-xs text-zinc-500">{req.items.length} producto{req.items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      {new Date(req.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                    </span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                    <div className="text-xs text-zinc-500">
                      Solicitado por <span className="text-zinc-300">{req.requestedBy.name}</span>
                      {" · "}{new Date(req.createdAt).toLocaleDateString("es-ES")}
                    </div>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-zinc-500">
                          <th className="text-left pb-1">Producto</th>
                          <th className="text-right pb-1">Cantidad solicitada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {req.items.map((item) => (
                          <tr key={item.product.id}>
                            <td className="py-1.5 text-zinc-300">{item.product.name}</td>
                            <td className="py-1.5 text-right text-white font-mono">
                              {item.quantity} {UNIT_LABELS[item.product.unit] || item.product.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {req.notes && (
                      <p className="text-xs text-zinc-400 italic">"{req.notes}"</p>
                    )}

                    {isPending ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          placeholder="Nota de respuesta (opcional)..."
                          value={reviewNotes[req.id] || ""}
                          onChange={(e) => setReviewNotes((p) => ({ ...p, [req.id]: e.target.value }))}
                          rows={2}
                          className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 resize-none placeholder:text-zinc-600"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actioning === req.id}
                            onClick={() => handleAction(req.id, "reject")}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5"
                          >
                            <X className="h-3.5 w-3.5" /> Rechazar
                          </Button>
                          <Button
                            size="sm"
                            disabled={actioning === req.id}
                            onClick={() => handleAction(req.id, "approve")}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
                          >
                            {actioning === req.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Check className="h-3.5 w-3.5" />}
                            Aprobar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      req.reviewedBy && (
                        <div className="text-xs text-zinc-500 pt-1">
                          {req.status === "APPROVED" ? "Aprobado" : "Rechazado"} por{" "}
                          <span className="text-zinc-300">{req.reviewedBy.name}</span>
                          {req.reviewedAt ? ` · ${new Date(req.reviewedAt).toLocaleDateString("es-ES")}` : ""}
                          {req.reviewNotes && <span className="block mt-1 italic text-zinc-400">"{req.reviewNotes}"</span>}
                        </div>
                      )
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
