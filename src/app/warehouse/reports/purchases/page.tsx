"use client";
import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "Pendiente",  cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  PAID:     { label: "Pagada",     cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  OVERDUE:  { label: "Vencida",    cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  CANCELLED:{ label: "Cancelada",  cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};
function fmtDate(s: string) { return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); }
function fmtEur(n: number) { return `€${Number(n).toFixed(2)}`; }

interface Invoice {
  id: string; number: string; issueDate: string; dueDate?: string;
  totalAmount: number; totalVat: number; status: string;
  supplier: { name: string };
  lineItems: { quantity: number; unitPrice: number; product: { name: string } }[];
}

export default function WarehousePurchasesReportPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/invoices")
      .then(r => r.json())
      .then(d => setInvoices(d.invoices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter(i => status === "ALL" || i.status === status);
  const totalSpend = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-semibold text-white">Compras</h1>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total facturas", value: invoices.length, cls: "text-blue-400" },
          { label: "Pendientes", value: invoices.filter(i => i.status === "PENDING").length, cls: "text-amber-400" },
          { label: "Pagadas", value: invoices.filter(i => i.status === "PAID").length, cls: "text-emerald-400" },
          { label: "Gasto total", value: fmtEur(totalSpend), cls: "text-emerald-400" },
        ].map(k => (
          <div key={k.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">{k.label}</p>
            <p className={`text-xl font-bold ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {[["ALL","Todas"],["PENDING","Pendientes"],["PAID","Pagadas"],["OVERDUE","Vencidas"],["CANCELLED","Canceladas"]].map(([v,l]) => (
          <button key={v} onClick={() => setStatus(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${status === v ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>{l}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-400" /></div> : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 py-10 text-center text-zinc-500">Sin facturas</div>
          ) : filtered.map(inv => {
            const S = STATUS[inv.status] || { label: inv.status, cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
            const isOpen = expanded === inv.id;
            return (
              <div key={inv.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors" onClick={() => setExpanded(isOpen ? null : inv.id)}>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${S.cls}`}>{S.label}</span>
                    <span className="text-sm text-white font-mono">{inv.number}</span>
                    <span className="text-xs text-zinc-500">{inv.supplier.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-zinc-300 font-mono font-semibold">{fmtEur(inv.totalAmount)}</span>
                    <span className="text-zinc-500">{fmtDate(inv.issueDate)}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-zinc-800 px-4 py-3">
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-zinc-500">
                        <th className="text-left pb-1">Producto</th>
                        <th className="text-right pb-1">Cantidad</th>
                        <th className="text-right pb-1">Precio unit.</th>
                        <th className="text-right pb-1">Total</th>
                      </tr></thead>
                      <tbody className="divide-y divide-zinc-800">
                        {inv.lineItems.map((li, i) => (
                          <tr key={i}>
                            <td className="py-1.5 text-zinc-300">{li.product.name}</td>
                            <td className="py-1.5 text-right font-mono text-zinc-400">{li.quantity}</td>
                            <td className="py-1.5 text-right font-mono text-zinc-400">{fmtEur(li.unitPrice)}</td>
                            <td className="py-1.5 text-right font-mono text-white">{fmtEur(li.quantity * li.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {inv.totalVat > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-end gap-6 text-xs text-zinc-500">
                        <span>IVA: <span className="text-zinc-300">{fmtEur(inv.totalVat)}</span></span>
                        <span>Total: <span className="text-zinc-200 font-semibold">{fmtEur(inv.totalAmount)}</span></span>
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
