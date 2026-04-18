"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  UtensilsCrossed, LogOut, Search, Plus, Minus, X,
  ChevronDown, Loader2, Check, RefreshCw, Send, FileText,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  salePrice: number;
  category: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface DBTable {
  id: string;
  number: string;
  capacity: number;
  orders: { id: string; number: string; status: string; totalAmount: number }[];
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocationId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/locationId=([^;]+)/);
  return m ? m[1] : null;
}

function fmt(n: number) {
  return `€${n.toFixed(2)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WaiterApp() {
  const { user, logout } = useAuth();

  // ── Data ──
  const [locationId, setLocationId] = useState("");
  const [locationName, setLocationName] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<DBTable[]>([]);
  const [loading, setLoading] = useState(true);

  // ── POS state ──
  const [selectedTable, setSelectedTable] = useState<DBTable | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderNumber, setActiveOrderNumber] = useState("");
  const [existingItems, setExistingItems] = useState<CartItem[]>([]); // already in DB
  const [newItems, setNewItems] = useState<CartItem[]>([]);           // to be added
  const [orderNote, setOrderNote] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  // ── Overlays ──
  const [showTables, setShowTables] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  // ── Clock ──
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Load data ──
  const loadData = useCallback(async (locId: string) => {
    try {
      const [prodRes, catRes, tabRes] = await Promise.all([
        fetch("/api/products?posOnly=true"),
        fetch("/api/categories?posOnly=true"),
        fetch(`/api/tables?locationId=${locId}`),
      ]);
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products || []); }
      if (catRes.ok)  { const d = await catRes.json();  setCategories(d.categories || []); }
      if (tabRes.ok)  { const d = await tabRes.json();  setTables(d.data || []); }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const fetchLoc = async () => {
      const locFromCookie = getLocationId();
      if (locFromCookie) {
        setLocationId(locFromCookie);
        try {
          const res = await fetch("/api/auth/business");
          if (res.ok) {
            const d = await res.json();
            const biz = d.businesses?.[0];
            const loc = biz?.locations?.find((l: any) => l.id === locFromCookie);
            if (loc) setLocationName(loc.name);
          }
        } catch { /* silent */ }
        await loadData(locFromCookie);
        return;
      }
      try {
        const res = await fetch("/api/auth/business");
        if (res.ok) {
          const d = await res.json();
          const biz = d.businesses?.[0];
          const loc = biz?.locations?.find((l: any) => l.type === "RESTAURANT");
          if (loc) {
            setLocationId(loc.id);
            setLocationName(loc.name);
            await loadData(loc.id);
            return;
          }
        }
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchLoc();
  }, [loadData]);

  const refreshTables = useCallback(async () => {
    if (!locationId) return;
    try {
      const res = await fetch(`/api/tables?locationId=${locationId}`);
      if (res.ok) { const d = await res.json(); setTables(d.data || []); }
    } catch { /* silent */ }
  }, [locationId]);

  // ── Select table ──
  const selectTable = useCallback(async (table: DBTable) => {
    setSelectedTable(table);
    setShowTables(false);
    setNewItems([]);
    setOrderNote("");

    const openOrder = table.orders.find(o => ["OPEN", "PREPARING", "SERVED"].includes(o.status));
    if (openOrder) {
      setActiveOrderId(openOrder.id);
      setActiveOrderNumber(openOrder.number);
      try {
        const res = await fetch(`/api/orders/${openOrder.id}`);
        if (res.ok) {
          const d = await res.json();
          setExistingItems((d.data.items || []).map((i: any) => ({
            productId: i.productId,
            name: i.product.name,
            price: Number(i.unitPrice),
            qty: i.quantity,
          })));
          setOrderNote(d.data.notes || "");
        }
      } catch { setExistingItems([]); }
    } else {
      setActiveOrderId(null);
      setActiveOrderNumber("");
      setExistingItems([]);
    }
  }, []);

  // ── Add product (only to newItems) ──
  const addProduct = (p: Product) => {
    setNewItems(prev => {
      const idx = prev.findIndex(i => i.productId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { productId: p.id, name: p.name, price: p.salePrice, qty: 1 }];
    });
  };

  const changeNewQty = (productId: string, delta: number) => {
    setNewItems(prev => prev.map(i => i.productId === productId ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0));
  };

  const removeNew = (productId: string) => {
    setNewItems(prev => prev.filter(i => i.productId !== productId));
  };

  const clearNew = () => { setNewItems([]); };

  // ── Send to kitchen ──
  const handleSend = async () => {
    if (newItems.length === 0) { toast.error("Añade productos al pedido"); return; }
    if (!selectedTable) { toast.error("Selecciona una mesa"); return; }
    setSending(true);
    try {
      if (activeOrderId) {
        // Add items to existing order
        const res = await fetch(`/api/orders/${activeOrderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_items",
            items: newItems.map(i => ({ productId: i.productId, quantity: i.qty, unitPrice: i.price })),
          }),
        });
        if (!res.ok) { toast.error("Error al añadir items"); setSending(false); return; }
        // Save note if changed
        if (orderNote) {
          await fetch(`/api/orders/${activeOrderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update_note", notes: orderNote }),
          });
        }
      } else {
        // Create new order (OPEN, kitchen will see it)
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId,
            tableId: selectedTable.id,
            userId: user?.id,
            notes: orderNote || undefined,
            items: newItems.map(i => ({ productId: i.productId, quantity: i.qty, unitPrice: i.price })),
          }),
        });
        if (!res.ok) { toast.error("Error al crear pedido"); setSending(false); return; }
        const d = await res.json();
        setActiveOrderId(d.data.id);
        setActiveOrderNumber(d.data.number);
      }

      toast.success(`✓ Pedido enviado — Mesa ${selectedTable.number}`);
      // Move new items to existing
      setExistingItems(prev => {
        const combined = [...prev];
        newItems.forEach(ni => {
          const idx = combined.findIndex(e => e.productId === ni.productId);
          if (idx >= 0) combined[idx] = { ...combined[idx], qty: combined[idx].qty + ni.qty };
          else combined.push(ni);
        });
        return combined;
      });
      setNewItems([]);
      await refreshTables();
    } catch { toast.error("Error de conexión"); }
    setSending(false);
  };

  // ── Filtered products ──
  const filtered = products.filter(p => {
    const catOk = activeCat === "all" || p.category?.id === activeCat;
    const searchOk = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const newTotal = newItems.reduce((s, i) => s + i.price * i.qty, 0);
  const existingTotal = existingItems.reduce((s, i) => s + i.price * i.qty, 0);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950 text-white select-none">

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-4 h-14 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 shadow-lg shadow-orange-500/25 flex-shrink-0">
            <UtensilsCrossed className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white hidden sm:block">Mesonero</span>
        </div>

        <div className="w-px h-6 bg-zinc-700" />

        {/* Table selector */}
        <button
          onClick={() => setShowTables(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all",
            selectedTable
              ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
          )}
        >
          <UtensilsCrossed className="h-3.5 w-3.5" />
          {selectedTable ? `Mesa ${selectedTable.number}` : "Sin mesa"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>

        {activeOrderNumber && (
          <span className="text-xs font-mono text-zinc-500">{activeOrderNumber}</span>
        )}

        {locationName && (
          <span className="text-xs text-zinc-600 hidden lg:block">{locationName}</span>
        )}

        <div className="ml-auto font-mono text-lg font-bold text-white tabular-nums">{time}</div>

        <div className="w-px h-6 bg-zinc-700" />

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <span className="text-sm font-medium text-white hidden md:block">{user?.name?.split(" ")[0]}</span>
        </div>

        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* ── MAIN ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── PRODUCTS ── */}
        <div className="flex flex-col border-r border-zinc-800" style={{ width: "60%" }}>

          {/* Categories */}
          <div className="flex gap-1.5 px-3 py-2 bg-zinc-900/80 border-b border-zinc-800 overflow-x-auto flex-shrink-0 scrollbar-none">
            <button
              onClick={() => setActiveCat("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0",
                activeCat === "all"
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
              )}
            >
              Todo
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0",
                  activeCat === cat.id
                    ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-3 py-2 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-orange-500/50"
              />
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 gap-2 content-start">
            {filtered.length === 0 ? (
              <div className="col-span-4 flex items-center justify-center py-16 text-zinc-600 text-sm">
                Sin productos
              </div>
            ) : filtered.map(p => {
              const inNew = newItems.find(i => i.productId === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className={cn(
                    "flex flex-col gap-1.5 p-3 rounded-xl border transition-all text-left min-h-[88px]",
                    inNew
                      ? "bg-orange-500/10 border-orange-500/40 shadow-sm shadow-orange-500/10"
                      : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.97]"
                  )}
                >
                  <span className="text-[10px] text-zinc-500">{p.category?.name || "General"}</span>
                  <span className="text-xs font-semibold text-white leading-tight line-clamp-2">{p.name}</span>
                  <span className="text-sm font-bold text-orange-400">{fmt(p.salePrice)}</span>
                  {inNew && (
                    <span className="text-[10px] text-orange-400/80 font-semibold">+{inNew.qty}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── ORDER PANEL ── */}
        <div className="flex flex-col bg-zinc-950" style={{ width: "40%" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
            <div>
              <div className="text-sm font-bold text-white">
                {selectedTable ? `Mesa ${selectedTable.number}` : "Sin mesa seleccionada"}
              </div>
              {activeOrderNumber && (
                <div className="text-xs text-zinc-500 font-mono">{activeOrderNumber}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setNoteInput(orderNote); setShowNote(true); }}
                title="Nota del pedido"
                className={cn(
                  "p-1.5 rounded-lg border transition-all",
                  orderNote
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
              </button>
              <button onClick={refreshTables} className="p-1 text-zinc-600 hover:text-zinc-400">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Note badge */}
          {orderNote && (
            <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-2 flex-shrink-0">
              <FileText className="h-3 w-3 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-300 truncate">{orderNote}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">

            {/* Existing items (already in kitchen) */}
            {existingItems.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wide px-1 mb-1">
                  Ya enviado
                </p>
                {existingItems.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 py-2 px-1 border-b border-zinc-800/40 last:border-0 opacity-60">
                    <span className="flex-1 text-sm text-zinc-400 truncate">{item.name}</span>
                    <span className="text-xs text-zinc-600">×{item.qty}</span>
                    <span className="text-xs text-zinc-500 w-14 text-right">{fmt(item.price * item.qty)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs text-zinc-600 px-1 pt-1 pb-2 border-b border-zinc-800">
                  <span>Subtotal enviado</span>
                  <span>{fmt(existingTotal)}</span>
                </div>
              </div>
            )}

            {/* New items */}
            {newItems.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-orange-500/80 uppercase tracking-wide px-1 mb-1 mt-2">
                  Nuevos items
                </p>
                {newItems.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 py-2.5 border-b border-orange-500/10 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                      <p className="text-xs text-zinc-500">{fmt(item.price)} / ud.</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => changeNewQty(item.productId, -1)}
                        className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-red-900/50 hover:border-red-700 transition-all"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                      <button
                        onClick={() => changeNewQty(item.productId, 1)}
                        className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-orange-900/50 hover:border-orange-700 transition-all"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-orange-400 w-14 text-right">{fmt(item.price * item.qty)}</span>
                    <button
                      onClick={() => removeNew(item.productId)}
                      className="w-6 h-6 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {existingItems.length === 0 && newItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-700 pt-12">
                <UtensilsCrossed className="h-10 w-10" />
                <p className="text-sm">
                  {selectedTable ? "Añade productos al pedido" : "Selecciona una mesa"}
                </p>
              </div>
            )}
          </div>

          {/* Totals */}
          {newItems.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50 flex-shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">Nuevo total</span>
                <span className="text-xl font-black text-orange-400">{fmt(newTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="flex items-center gap-2 px-3 h-[72px] bg-zinc-900 border-t border-zinc-800 flex-shrink-0">
        {/* Mesas */}
        <WaiterBtn icon="🍽" label="MESAS" color="blue" onClick={() => setShowTables(true)} />
        {/* Nueva comanda */}
        <WaiterBtn
          icon="➕"
          label="NUEVA COMANDA"
          onClick={() => {
            setNewItems([]);
            setExistingItems([]);
            setActiveOrderId(null);
            setActiveOrderNumber("");
            setOrderNote("");
            setSelectedTable(null);
          }}
        />
        {/* Cancelar nuevos */}
        <WaiterBtn
          icon={<X className="h-4 w-4" />}
          label="LIMPIAR"
          color="red"
          onClick={() => {
            if (newItems.length === 0) return;
            clearNew();
          }}
        />
        {/* Enviar a cocina */}
        <WaiterBtn
          icon={sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          label="ENVIAR A COCINA"
          color="orange"
          wide
          onClick={handleSend}
        />
      </div>

      {/* ════ OVERLAYS ════ */}

      {/* ── TABLES ── */}
      {showTables && (
        <Overlay onClose={() => setShowTables(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[700px] max-h-[80vh] flex flex-col">
            <OverlayHeader
              title="Mesas del Restaurante"
              sub="Toca una mesa para ver/crear su pedido"
              onClose={() => setShowTables(false)}
            />
            <div className="p-4 overflow-y-auto grid grid-cols-4 gap-3">
              {tables.length === 0 ? (
                <div className="col-span-4 text-center py-10 text-zinc-500 text-sm">
                  Sin mesas configuradas
                </div>
              ) : tables.map(t => {
                const openOrder = t.orders.find(o => ["OPEN", "PREPARING", "SERVED"].includes(o.status));
                const isSelected = selectedTable?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTable(t)}
                    className={cn(
                      "rounded-xl p-4 text-left border-2 transition-all flex flex-col gap-1",
                      isSelected
                        ? "bg-orange-500/10 border-orange-500"
                        : openOrder
                        ? "bg-zinc-800 border-orange-500/30 hover:border-orange-500/60"
                        : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-500"
                    )}
                  >
                    <span className={cn("text-xl font-black", openOrder ? "text-orange-400" : "text-zinc-500")}>
                      Mesa {t.number}
                    </span>
                    <span className={cn("text-xs font-semibold", openOrder ? "text-orange-400" : "text-zinc-600")}>
                      {openOrder ? "🟡 Ocupada" : "⚪ Libre"}
                    </span>
                    {openOrder ? (
                      <>
                        <span className="text-xs text-zinc-400">{openOrder.number}</span>
                        <span className="text-sm font-bold text-orange-400">{fmt(Number(openOrder.totalAmount))}</span>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-600">Sin pedido</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowTables(false)}
                className="w-full py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── NOTE ── */}
      {showNote && (
        <Overlay onClose={() => setShowNote(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[420px]">
            <OverlayHeader
              title="Nota del pedido"
              sub={selectedTable ? `Mesa ${selectedTable.number}` : "Sin mesa"}
              onClose={() => setShowNote(false)}
            />
            <div className="px-5 py-4">
              <textarea
                autoFocus
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder="Ej: Sin gluten, alergia a frutos secos, extra picante..."
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/60 resize-none"
              />
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => { setNoteInput(""); setOrderNote(""); setShowNote(false); }}
                className="px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-400 hover:text-white transition-all"
              >
                Borrar
              </button>
              <button
                onClick={() => setShowNote(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setOrderNote(noteInput); setShowNote(false); toast.success("Nota guardada"); }}
                className="flex-[2] py-3 rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" /> Guardar
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

function OverlayHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-5 py-4 border-b border-zinc-800">
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function WaiterBtn({
  icon, label, color, wide, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color?: "orange" | "red" | "blue";
  wide?: boolean;
  onClick: () => void;
}) {
  const base = "flex flex-col items-center justify-center gap-0.5 rounded-xl border h-[52px] cursor-pointer transition-all";
  const wideCls = wide ? "flex-[2]" : "flex-1";
  const colors: Record<string, string> = {
    orange: "bg-orange-700/60 border-orange-600 hover:bg-orange-600",
    red:    "bg-red-900/40 border-red-800 hover:bg-red-900/70",
    blue:   "bg-blue-900/30 border-blue-800/60 hover:bg-blue-900/50",
  };
  const labelColors: Record<string, string> = {
    orange: "text-orange-300", red: "text-red-300", blue: "text-blue-300",
  };
  return (
    <button
      onClick={onClick}
      className={cn(base, wideCls, color ? colors[color] : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700")}
    >
      <span className="text-white">{icon}</span>
      <span className={cn("text-[10px] font-semibold", color ? labelColors[color] : "text-zinc-400")}>{label}</span>
    </button>
  );
}
