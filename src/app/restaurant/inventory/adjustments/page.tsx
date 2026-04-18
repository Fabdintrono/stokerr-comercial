"use client";
import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, Trash2, X, Save, Search } from "lucide-react";
import toast from "react-hot-toast";

const UNIT_LABELS: Record<string, string> = { KG: "kg", G: "g", L: "L", ML: "ml", UNIT: "un", BOX: "caja", CASE: "case", GARRAFA: "garrafa" };
function fmt(n: number) { return n % 1 === 0 ? n.toString() : n.toFixed(2); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

interface Movement {
  id: string; quantity: number; reason: string | null; createdAt: string;
  product: { name: string; sku: string | null; unit: string };
  location: { name: string }; user: { name: string };
}

interface InvItem {
  id: string; quantity: number;
  product: { id: string; name: string; sku: string | null; unit: string };
  location: { id: string; name: string };
}

interface AdjRow { uid: number; invItem: InvItem | null; newQty: string; search: string; open: boolean }

let uid = 0;
function newRow(): AdjRow { return { uid: ++uid, invItem: null, newQty: "", search: "", open: false }; }

export default function RestaurantInventoryAdjustmentsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState<string | null | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rows, setRows] = useState<AdjRow[]>([newRow()]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Detect locationId from cookie
  useEffect(() => {
    const m = document.cookie.match(/locationId=([^;]+)/);
    setLocationId(m ? m[1] : null);
  }, []);

  const loadData = async (locId: string | null) => {
    setLoading(true);
    try {
      const invUrl = locId ? `/api/inventory?locationId=${locId}` : "/api/inventory";
      const movUrl = locId
        ? `/api/inventory/movement?locationId=${locId}&limit=200`
        : "/api/inventory/movement?limit=200";
      const [invRes, movRes] = await Promise.all([fetch(invUrl), fetch(movUrl)]);
      const [invData, movData] = await Promise.all([invRes.json(), movRes.json()]);
      setInventory(invData.inventory || []);
      setMovements((movData.movements || []).filter((m: any) => m.type === "ADJUSTMENT"));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (locationId === undefined) return;
    loadData(locationId);
  }, [locationId]);

  // Drawer helpers
  const openDrawer = () => { setRows([newRow()]); setReason(""); setDrawerOpen(true); };
  const closeDrawer = () => setDrawerOpen(false);

  const updateRow = (uid: number, patch: Partial<AdjRow>) =>
    setRows(prev => prev.map(r => r.uid === uid ? { ...r, ...patch } : r));

  const removeRow = (uid: number) =>
    setRows(prev => prev.filter(r => r.uid !== uid));

  const addRow = () => setRows(prev => [...prev, newRow()]);

  const selectItem = (uid: number, item: InvItem) => {
    updateRow(uid, { invItem: item, newQty: fmt(item.quantity), search: item.product.name, open: false });
  };

  const submit = async () => {
    const valid = rows.filter(r => r.invItem && r.newQty !== "" && !isNaN(parseFloat(r.newQty)));
    if (valid.length === 0) { toast.error("Añade al menos un producto"); return; }
    setSaving(true);
    let errors = 0;
    for (const row of valid) {
      try {
        const res = await fetch("/api/inventory/movement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: row.invItem!.product.id,
            locationId: row.invItem!.location.id,
            type: "ADJUSTMENT",
            quantity: parseFloat(row.newQty),
            reason: reason || undefined,
          }),
        });
        if (!res.ok) errors++;
      } catch { errors++; }
    }
    setSaving(false);
    if (errors === 0) {
      toast.success(`${valid.length} ajuste${valid.length > 1 ? "s" : ""} registrado${valid.length > 1 ? "s" : ""}`);
      closeDrawer();
      loadData(locationId ?? null);
    } else {
      toast.error(`${errors} ajuste${errors > 1 ? "s" : ""} fallaron`);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Ajustes de Inventario</h1>
        <button onClick={openDrawer} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
          <Plus className="h-4 w-4" /> Nuevo ajuste
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-400" /></div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-zinc-900/50 border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Fecha</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Producto</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">Cantidad ajustada</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Motivo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Usuario</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {movements.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Sin ajustes registrados</td></tr>
              ) : movements.map(m => {
                const unit = UNIT_LABELS[m.product.unit] || m.product.unit;
                return (
                  <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{m.product.name}</div>
                      {m.product.sku && <div className="text-xs text-zinc-500">{m.product.sku}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">{fmt(m.quantity)} {unit}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs max-w-[200px] truncate">{m.reason || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{m.user.name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={closeDrawer} />
          <div className="fixed right-0 top-0 h-full z-50 w-full max-w-xl bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-white">Nuevo ajuste</h2>
              <button onClick={closeDrawer} className="text-zinc-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>

            {/* Reason */}
            <div className="px-5 pt-4">
              <input
                type="text"
                placeholder="Motivo del ajuste (opcional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto px-5 pt-3 space-y-2">
              {rows.map((row) => {
                const filtered = inventory.filter(i =>
                  i.product.name.toLowerCase().includes(row.search.toLowerCase()) ||
                  (i.product.sku || "").toLowerCase().includes(row.search.toLowerCase())
                );
                const unit = row.invItem ? UNIT_LABELS[row.invItem.product.unit] || row.invItem.product.unit : "";
                return (
                  <div key={row.uid} className="flex gap-2 items-start">
                    {/* Product selector */}
                    <div className="relative flex-1">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar producto…"
                          value={row.search}
                          onChange={e => updateRow(row.uid, { search: e.target.value, open: true, invItem: e.target.value !== row.invItem?.product.name ? null : row.invItem })}
                          onFocus={() => updateRow(row.uid, { open: true })}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      {row.open && filtered.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {filtered.map(i => (
                            <button
                              key={i.id}
                              onMouseDown={() => selectItem(row.uid, i)}
                              className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors text-sm"
                            >
                              <span className="text-white">{i.product.name}</span>
                              <span className="ml-2 text-xs text-zinc-500">{fmt(i.quantity)} {UNIT_LABELS[i.product.unit] || i.product.unit}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Current stock (readonly) */}
                    {row.invItem && (
                      <div className="flex flex-col items-center min-w-[60px]">
                        <span className="text-[10px] text-zinc-500">Actual</span>
                        <span className="text-xs font-mono text-zinc-400">{fmt(row.invItem.quantity)} {unit}</span>
                      </div>
                    )}

                    {/* New qty */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Nueva cant."
                        value={row.newQty}
                        onChange={e => updateRow(row.uid, { newQty: e.target.value })}
                        className="w-28 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      />
                      {row.invItem && <span className="text-xs text-zinc-500">{unit}</span>}
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeRow(row.uid)} className="mt-2 text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              <button onClick={addRow} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-400 transition-colors pt-1">
                <Plus className="h-4 w-4" /> Añadir producto
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-zinc-800 flex gap-3 justify-end">
              <button onClick={closeDrawer} className="px-4 py-2 rounded-lg text-sm border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
                Cancelar
              </button>
              <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar ajuste
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
