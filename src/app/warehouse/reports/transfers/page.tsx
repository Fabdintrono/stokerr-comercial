"use client";
import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

const UNIT_LABELS: Record<string, string> = { KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "un", BOX: "caja", CASE: "case", GARRAFA: "garrafa" };
const TRANSFER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  COMPLETED: { label: "Completada", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "Cancelada", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
};
function fmt(n: number) { return n % 1 === 0 ? n.toString() : n.toFixed(2); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); }

interface Transfer {
  id: string; reference: string; status: string; notes: string | null; createdAt: string;
  fromLocation: { name: string }; toLocation: { name: string };
  lineItems: { quantity: number; product: { name: string; unit: string } }[];
}

export default function TransfersReportPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/transfers").then(r => r.json()).then(d => setTransfers(d.transfers || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = transfers.filter(t => status === "ALL" || t.status === status);

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-semibold text-white">Transferencias</h1>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: transfers.length },
          { label: "Completadas", value: transfers.filter(t => t.status === "COMPLETED").length },
          { label: "Pendientes", value: transfers.filter(t => t.status === "PENDING").length },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">{k.label}</p>
            <p className="text-2xl font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {[["ALL","Todas"],["PENDING","Pendientes"],["COMPLETED","Completadas"],["CANCELLED","Canceladas"]].map(([v,l]) => (
          <button key={v} onClick={() => setStatus(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${status === v ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>{l}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-400" /></div> : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 py-10 text-center text-zinc-500">Sin transferencias</div>
          ) : filtered.map(tx => {
            const S = TRANSFER_STATUS[tx.status] || { label: tx.status, cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
            const isOpen = expanded === tx.id;
            return (
              <div key={tx.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors" onClick={() => setExpanded(isOpen ? null : tx.id)}>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${S.cls}`}>{S.label}</span>
                    <span className="text-sm text-white font-mono">{tx.reference}</span>
                    <span className="text-xs text-zinc-500">{tx.fromLocation.name} → {tx.toLocation.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">{fmtDate(tx.createdAt)}{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
                </button>
                {isOpen && (
                  <div className="border-t border-zinc-800 px-4 py-3">
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-zinc-500"><th className="text-left pb-1">Producto</th><th className="text-right pb-1">Cantidad</th></tr></thead>
                      <tbody className="divide-y divide-zinc-800">
                        {tx.lineItems.map((li, i) => (
                          <tr key={i}><td className="py-1.5 text-zinc-300">{li.product.name}</td><td className="py-1.5 text-right font-mono text-white">{fmt(li.quantity)} {UNIT_LABELS[li.product.unit] || li.product.unit}</td></tr>
                        ))}
                      </tbody>
                    </table>
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
