"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const UNIT_LABELS: Record<string, string> = { KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "un", BOX: "caja", CASE: "case", GARRAFA: "garrafa" };
const MOVEMENT_TYPE: Record<string, { label: string; cls: string }> = {
  IN: { label: "Entrada", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  OUT: { label: "Salida", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  TRANSFER: { label: "Transferencia", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ADJUSTMENT: { label: "Ajuste", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};
function fmt(n: number) { return n % 1 === 0 ? n.toString() : n.toFixed(2); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); }

interface Movement {
  id: string; type: string; quantity: number; reason: string | null; createdAt: string;
  product: { name: string; sku: string | null; unit: string };
  location: { name: string }; user: { name: string };
}

export default function WarehouseAdjustmentsReportPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [movType, setMovType] = useState("ALL");

  useEffect(() => {
    fetch("/api/inventory/movement?limit=200")
      .then(r => r.json())
      .then(d => setMovements(d.movements || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = movements.filter(m => movType === "ALL" || m.type === movType);

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-semibold text-white">Ajustes de Inventario</h1>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Entradas", value: movements.filter(m => m.type === "IN").length, cls: "text-emerald-400" },
          { label: "Salidas", value: movements.filter(m => m.type === "OUT").length, cls: "text-red-400" },
          { label: "Transferencias", value: movements.filter(m => m.type === "TRANSFER").length, cls: "text-blue-400" },
          { label: "Ajustes", value: movements.filter(m => m.type === "ADJUSTMENT").length, cls: "text-amber-400" },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">{k.label}</p>
            <p className={`text-2xl font-bold ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {[["ALL","Todos"],["IN","Entradas"],["OUT","Salidas"],["TRANSFER","Transferencias"],["ADJUSTMENT","Ajustes"]].map(([v,l]) => (
          <button key={v} onClick={() => setMovType(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${movType === v ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>{l}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-400" /></div> : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-zinc-900/50 border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Fecha</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Producto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Ubicación</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Tipo</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Cantidad</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Razón</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Usuario</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">Sin movimientos</td></tr>
              ) : filtered.map(m => {
                const T = MOVEMENT_TYPE[m.type] || { label: m.type, cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
                const unit = UNIT_LABELS[m.product.unit] || m.product.unit;
                return (
                  <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 text-zinc-500 text-xs">{fmtDate(m.createdAt)}</td>
                    <td className="px-4 py-3"><div className="text-white font-medium">{m.product.name}</div>{m.product.sku && <div className="text-xs text-zinc-500">{m.product.sku}</div>}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{m.location.name}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${T.cls}`}>{T.label}</span></td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmt(m.quantity)} {unit}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs max-w-[180px] truncate">{m.reason || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{m.user.name}</td>
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
