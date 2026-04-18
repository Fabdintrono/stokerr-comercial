"use client";

import { useState, useEffect } from "react";
import { Plus, X, Loader2, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

interface Product { id: string; name: string; sku: string | null; unit: string }
interface Location { id: string; name: string; type: string; isActive?: boolean }
interface ReqItem { productId: string; productName: string; unit: string; quantity: number }
interface Request {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string | null;
  reviewNotes: string | null;
  createdAt: string;
  fromLocation: { name: string };
  toLocation: { name: string };
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

export default function ReplenishmentPage() {
  const [myLocationId, setMyLocationId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [sourceLocations, setSourceLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Form state
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReqItem[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const lid = getLocationId();
    setMyLocationId(lid);
    if (!lid) { setLoading(false); return; }
    loadData(lid);
  }, []);

  async function loadData(locationId: string) {
    setLoading(true);
    try {
      const [reqRes, bizRes] = await Promise.all([
        fetch(`/api/replenishment?locationId=${locationId}`),
        fetch("/api/auth/business"),
      ]);
      const [reqData, bizData] = await Promise.all([reqRes.json(), bizRes.json()]);
      setRequests(reqData.requests || []);

      const biz = bizData.businesses?.[0];
      // All active locations except the current one
      const others = (biz?.locations || []).filter((l: Location) => l.id !== locationId && l.isActive !== false);
      setSourceLocations(others);
      const defaultLoc = others.find((l: Location) => l.type === "WAREHOUSE") || others[0];
      if (defaultLoc) {
        setToLocationId(defaultLoc.id);
        await loadInventoryForLocation(defaultLoc.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadInventoryForLocation(locationId: string) {
    setLoadingProducts(true);
    try {
      const invRes = await fetch(`/api/inventory?locationId=${locationId}`);
      const invData = await invRes.json();
      setProducts((invData.inventory || []).map((i: any) => i.product));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleSourceChange(locId: string) {
    setToLocationId(locId);
    setItems([]);
    if (locId) await loadInventoryForLocation(locId);
  }

  function openModal() {
    setItems([]);
    setNotes("");
    setSearch("");
    setShowModal(true);
  }

  function addItem(product: Product) {
    if (items.find((i) => i.productId === product.id)) return;
    setItems((prev) => [...prev, { productId: product.id, productName: product.name, unit: product.unit, quantity: 1 }]);
  }

  function updateQty(productId: string, qty: number) {
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(0.01, qty) } : i));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleSubmit() {
    if (!myLocationId || !toLocationId || items.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/replenishment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromLocationId: myLocationId,
          toLocationId,
          notes,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Solicitud enviada");
      setShowModal(false);
      loadData(myLocationId);
    } catch {
      toast.error("Error al enviar solicitud");
    } finally {
      setSaving(false);
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      !items.find((i) => i.productId === p.id) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Solicitudes de Reposición</h1>
          <p className="text-xs text-zinc-500">{requests.filter((r) => r.status === "PENDING").length} pendientes</p>
        </div>
        <Button
          onClick={openModal}
          className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-sm"
        >
          <Plus className="h-4 w-4" /> Nueva Solicitud
        </Button>
      </div>

      {/* List */}
      {requests.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 py-12 text-center text-zinc-500">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Sin solicitudes aún
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const S = STATUS[req.status];
            const Icon = S.icon;
            const isOpen = expanded === req.id;
            return (
              <div key={req.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : req.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${S.cls}`}>
                      <Icon className="h-3 w-3" /> {S.label}
                    </span>
                    <span className="text-sm text-white">→ {req.toLocation.name}</span>
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
                  <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-zinc-500">
                          <th className="text-left pb-1">Producto</th>
                          <th className="text-right pb-1">Cantidad</th>
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
                      <p className="text-xs text-zinc-400">Nota: {req.notes}</p>
                    )}
                    {req.reviewNotes && (
                      <p className={`text-xs ${req.status === "REJECTED" ? "text-red-400" : "text-emerald-400"}`}>
                        Respuesta: {req.reviewNotes}
                      </p>
                    )}
                    {req.reviewedBy && (
                      <p className="text-xs text-zinc-500">
                        {req.status === "APPROVED" ? "Aprobado" : "Rechazado"} por {req.reviewedBy.name}
                        {req.reviewedAt ? ` · ${new Date(req.reviewedAt).toLocaleDateString("es-ES")}` : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-white">Nueva Solicitud</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Source location selector */}
              {sourceLocations.length > 1 ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Solicitar desde</label>
                  <select
                    value={toLocationId}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar local...</option>
                    {sourceLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.type === "WAREHOUSE" ? "Depósito" : "Restaurante"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : sourceLocations.length === 1 ? (
                <p className="text-xs text-zinc-500">
                  Solicitar desde: <span className="text-zinc-300">{sourceLocations[0].name}</span>
                  <span className="ml-1 text-zinc-600">({sourceLocations[0].type === "WAREHOUSE" ? "Depósito" : "Restaurante"})</span>
                </p>
              ) : null}

              {/* Product search */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Agregar productos
                  {loadingProducts && <Loader2 className="inline h-3 w-3 ml-1.5 animate-spin text-zinc-500" />}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 bg-zinc-800 border-zinc-700 text-white text-sm h-8"
                    disabled={loadingProducts || !toLocationId}
                  />
                </div>
                {search && (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-zinc-500">Sin resultados</p>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { addItem(p); setSearch(""); }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-zinc-800 transition-colors"
                        >
                          <span className="text-zinc-300">{p.name}</span>
                          <span className="text-xs text-zinc-500">{UNIT_LABELS[p.unit] || p.unit}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected items */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">Productos seleccionados</label>
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm text-zinc-300 truncate">{item.productName}</span>
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={item.quantity}
                        onChange={(e) => updateQty(item.productId, parseFloat(e.target.value) || 0)}
                        className="w-20 bg-zinc-700 border border-zinc-600 text-white text-sm rounded px-2 py-1 text-right"
                      />
                      <span className="text-xs text-zinc-500 w-8">{UNIT_LABELS[item.unit] || item.unit}</span>
                      <button onClick={() => removeItem(item.productId)} className="text-zinc-600 hover:text-red-400">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Nota (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Urgente, para el fin de semana..."
                  className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 resize-none placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800">
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || items.length === 0 || !toLocationId}
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enviar Solicitud
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
