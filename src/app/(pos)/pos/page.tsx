"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ChefHat, LogOut, Search, Plus, Minus, X, Trash2,
  Scissors, CreditCard, Percent, Printer, RefreshCw, Loader2, Check,
  Landmark, UtensilsCrossed, ChevronDown, FileText, History, Receipt,
} from "lucide-react";
import { variantDisplayName } from "@/lib/variants/displayName";
import { effectivePrice } from "@/lib/variants/pricing";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Variant {
  id: string;
  attributes: Record<string, string>;
  sku?: string | null;
  salePrice?: string | null;
  costPrice?: string | null;
}

interface Product {
  id: string;
  name: string;
  salePrice: number;
  category: { id: string; name: string } | null;
  hasVariants?: boolean;
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
  variantId?: string;
  name: string;
  price: number;
  qty: number;
}

interface CashRegister {
  id: string;
  openedAt: string;
  openingBalance: number;
}

interface PaidOrder {
  id: string;
  number: string;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  table: { number: string } | null;
  user: { name: string };
  items: { quantity: number; unitPrice: number; product: { name: string } }[];
  payments: { amount: number; method: string }[];
}

type PayMethod = "CASH" | "CARD" | "MBWAY" | "TRANSFER";
type SplitMode = "equal" | "byitem";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocationId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/locationId=([^;]+)/);
  return m ? m[1] : null;
}

function fmt(n: number) {
  return `€${n.toFixed(2)}`;
}

function printReceipt({
  orderNumber,
  tableName,
  locationName,
  cashierName,
  items,
  subtotal,
  discountPct,
  discountAmt,
  iva,
  total,
  payments,
  notes,
}: {
  orderNumber: string;
  tableName: string;
  locationName: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  iva: number;
  total: number;
  payments: { amount: number; method: PayMethod }[];
  notes: string;
}) {
  const methodLabel: Record<string, string> = {
    CASH: "Efectivo", CARD: "Tarjeta", MBWAY: "MB WAY", TRANSFER: "Multibanco",
  };
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-PT");
  const timeStr = now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 300px; padding: 12px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 16px; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .total-row { font-size: 14px; font-weight: bold; }
  .note { font-style: italic; font-size: 11px; margin-top: 4px; }
  @media print { @page { margin: 0; } }
</style>
</head>
<body>
  <div class="center bold big">StokerPOS</div>
  <div class="center">${locationName}</div>
  <div class="line"></div>
  <div class="row"><span>${dateStr}</span><span>${timeStr}</span></div>
  <div class="row"><span>Pedido:</span><span class="bold">${orderNumber || "—"}</span></div>
  <div class="row"><span>Mesa:</span><span>${tableName}</span></div>
  <div class="row"><span>Cajero:</span><span>${cashierName}</span></div>
  ${notes ? `<div class="note">Nota: ${notes}</div>` : ""}
  <div class="line"></div>
  ${items.map(i => `
    <div class="row">
      <span>${i.name}</span>
      <span>${fmt(i.price * i.qty)}</span>
    </div>
    <div style="padding-left:8px;color:#555;">${i.qty} × ${fmt(i.price)}</div>
  `).join("")}
  <div class="line"></div>
  <div class="row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
  ${discountPct > 0 ? `<div class="row"><span>Descuento (${discountPct}%)</span><span>-${fmt(discountAmt)}</span></div>` : ""}
  <div class="row"><span>IVA (23%)</span><span>${fmt(iva)}</span></div>
  <div class="line"></div>
  <div class="row total-row"><span>TOTAL</span><span>${fmt(total)}</span></div>
  <div class="line"></div>
  ${payments.map(p => `<div class="row"><span>${methodLabel[p.method] || p.method}</span><span>${fmt(p.amount)}</span></div>`).join("")}
  <div class="line"></div>
  <div class="center" style="margin-top:8px;">Obrigado pela sua visita!</div>
  <div class="center" style="margin-top:4px;font-size:10px;">Powered by StokerPOS</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=340,height=600");
  if (!win) { toast.error("Permite las ventanas emergentes para imprimir"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

const METHODS: { key: PayMethod; icon: string; label: string; sub: string }[] = [
  { key: "CASH",     icon: "💵", label: "Efectivo",   sub: "Pago en mano" },
  { key: "CARD",     icon: "💳", label: "Tarjeta",    sub: "TPV / Contactless" },
  { key: "MBWAY",    icon: "📱", label: "MB WAY",     sub: "Transferencia móvil" },
  { key: "TRANSFER", icon: "🏦", label: "Multibanco", sub: "Referencia ATM" },
];

const METHOD_LABEL: Record<string, string> = {
  CASH: "Efectivo", CARD: "Tarjeta", MBWAY: "MB WAY", TRANSFER: "Multibanco",
};

const PERSON_COLORS = [
  "text-indigo-400 border-indigo-500/50 bg-indigo-500/10",
  "text-emerald-400 border-emerald-500/50 bg-emerald-500/10",
  "text-amber-400 border-amber-500/50 bg-amber-500/10",
  "text-rose-400 border-rose-500/50 bg-rose-500/10",
  "text-purple-400 border-purple-500/50 bg-purple-500/10",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function StokerPOS() {
  const { user, logout } = useAuth();

  // ── Data state ──
  const [locationId, setLocationId] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<DBTable[]>([]);
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);

  // ── POS state ──
  const [selectedTable, setSelectedTable] = useState<DBTable | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderNumber, setActiveOrderNumber] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [orderNote, setOrderNote] = useState("");

  // ── Clock ──
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Overlays ──
  const [showTables, setShowTables] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [paying, setPaying] = useState(false);

  // Payment overlay
  const [payMethod, setPayMethod] = useState<PayMethod>("CASH");
  // Last payments (for print after pay)
  const [lastPayments, setLastPayments] = useState<{ amount: number; method: PayMethod }[]>([]);

  // Discount overlay
  const [discInput, setDiscInput] = useState("");
  const [discPreset, setDiscPreset] = useState<number | null>(5);

  // Note overlay
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // History overlay
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<PaidOrder | null>(null);

  // Variant picker overlay
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [showVariantPicker, setShowVariantPicker] = useState(false);

  // Split overlay
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splitN, setSplitN] = useState(2);
  const [splitPaid, setSplitPaid] = useState<(PayMethod | null)[]>([]);
  const [splitPayingIdx, setSplitPayingIdx] = useState<number | null>(null);
  const [splitPayMethod, setSplitPayMethod] = useState<PayMethod>("CASH");
  const [activePerson, setActivePerson] = useState(0);
  const [itemPersons, setItemPersons] = useState(3);
  const [itemAssignments, setItemAssignments] = useState<Record<string, number>>({});

  // ── Load location & data ──
  const loadData = useCallback(async (locId: string) => {
    try {
      const [prodRes, catRes, tabRes, crRes] = await Promise.all([
        fetch("/api/products?posOnly=true"),
        fetch("/api/categories?posOnly=true"),
        fetch(`/api/tables?locationId=${locId}`),
        fetch(`/api/cash-register?locationId=${locId}&current=true`),
      ]);
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(d.products || []); }
      if (catRes.ok)  { const d = await catRes.json();  setCategories(d.categories || []); }
      if (tabRes.ok)  { const d = await tabRes.json();  setTables(d.data || []); }
      if (crRes.ok)   { const d = await crRes.json();   setCashRegister(d.data || null); }
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

  // ── Table selection ──
  const selectTable = useCallback(async (table: DBTable) => {
    setSelectedTable(table);
    setShowTables(false);
    setDiscount(0);
    setItemAssignments({});
    setOrderNote("");

    const openOrder = table.orders.find(o => ["OPEN", "PREPARING", "SERVED"].includes(o.status));
    if (openOrder) {
      setActiveOrderId(openOrder.id);
      setActiveOrderNumber(openOrder.number);
      try {
        const res = await fetch(`/api/orders/${openOrder.id}`);
        if (res.ok) {
          const d = await res.json();
          const items: CartItem[] = (d.data.items || []).map((i: any) => ({
            productId: i.productId,
            name: i.product.name,
            price: Number(i.unitPrice),
            qty: i.quantity,
          }));
          setCart(items);
          setOrderNote(d.data.notes || "");
        }
      } catch { setCart([]); }
    } else {
      setActiveOrderId(null);
      setActiveOrderNumber("");
      setCart([]);
    }
  }, []);

  // ── Cart actions ──
  const addProduct = (p: Product) => {
    if (p.hasVariants) {
      setPendingProduct(p);
      setSelectedVariantId("");
      setVariants([]);
      setVariantsLoading(true);
      setShowVariantPicker(true);
      fetch(`/api/variants?productId=${p.id}`)
        .then(r => r.json())
        .then(d => { setVariants(d.variants ?? []); setVariantsLoading(false); })
        .catch(() => setVariantsLoading(false));
      return;
    }
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === p.id && !i.variantId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { productId: p.id, name: p.name, price: p.salePrice, qty: 1 }];
    });
  };

  const confirmVariant = () => {
    if (!pendingProduct || !selectedVariantId) return;
    const variant = variants.find(v => v.id === selectedVariantId);
    if (!variant) return;
    const price = Number(effectivePrice(variant, { salePrice: String(pendingProduct.salePrice) }));
    const label = `${pendingProduct.name} — ${variantDisplayName(variant.attributes)}${variant.sku ? ` (${variant.sku})` : ""}`;
    setCart(prev => {
      const idx = prev.findIndex(i => i.variantId === variant.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { productId: pendingProduct.id, variantId: variant.id, name: label, price, qty: 1 }];
    });
    setShowVariantPicker(false);
    setPendingProduct(null);
    setSelectedVariantId("");
    setVariants([]);
  };

  const changeQty = (productId: string, delta: number, variantId?: string) => {
    setCart(prev => prev.map(i =>
      i.productId === productId && i.variantId === variantId ? { ...i, qty: i.qty + delta } : i
    ).filter(i => i.qty > 0));
  };

  const removeItem = (productId: string, variantId?: string) => {
    setCart(prev => prev.filter(i => !(i.productId === productId && i.variantId === variantId)));
  };

  const clearCart = () => {
    setCart([]);
    setActiveOrderId(null);
    setActiveOrderNumber("");
    setDiscount(0);
    setOrderNote("");
  };

  // ── Totals ──
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = subtotal * discount / 100;
  const subtotalAfterDisc = subtotal - discountAmt;
  const iva = subtotalAfterDisc * 0.23;
  const total = subtotalAfterDisc + iva;

  // ── Create or get order ID ──
  const ensureOrder = async (): Promise<string | null> => {
    if (activeOrderId) return activeOrderId;
    if (!selectedTable || cart.length === 0 || !locationId || !user?.id) return null;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          tableId: selectedTable.id,
          userId: user.id,
          notes: orderNote || undefined,
          items: cart.map(i => ({ productId: i.productId, quantity: i.qty, unitPrice: i.price, ...(i.variantId ? { variantId: i.variantId } : {}) })),
        }),
      });
      if (!res.ok) { toast.error("Error al crear pedido"); return null; }
      const d = await res.json();
      const id = d.data.id;
      setActiveOrderId(id);
      setActiveOrderNumber(d.data.number);
      return id;
    } catch { toast.error("Error de conexión"); return null; }
  };

  // ── Pay ──
  const handlePay = async (payments: { amount: number; method: PayMethod }[]) => {
    if (cart.length === 0) { toast.error("El carrito está vacío"); return; }
    if (!selectedTable) { toast.error("Selecciona una mesa"); return; }
    setPaying(true);
    try {
      let orderId = activeOrderId;
      if (!orderId) {
        orderId = await ensureOrder();
        if (!orderId) { setPaying(false); return; }
      }
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", payments }),
      });
      if (!res.ok) { toast.error("Error al cobrar"); setPaying(false); return; }
      toast.success(`✓ Cobrado ${fmt(total)} — Mesa ${selectedTable.number}`);
      setLastPayments(payments);
      setShowPayment(false);
      setShowSplit(false);
      clearCart();
      setSelectedTable(null);
      await refreshTables();
    } catch { toast.error("Error de conexión"); }
    setPaying(false);
  };

  // ── Save note ──
  const handleSaveNote = async () => {
    setOrderNote(noteInput);
    if (activeOrderId) {
      setSavingNote(true);
      try {
        await fetch(`/api/orders/${activeOrderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_note", notes: noteInput }),
        });
      } catch { /* silent */ }
      setSavingNote(false);
    }
    setShowNote(false);
    toast.success("Nota guardada");
  };

  // ── Load history ──
  const loadHistory = async () => {
    if (!locationId) return;
    setLoadingHistory(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/orders?locationId=${locationId}&status=PAID&date=${today}`);
      if (res.ok) {
        const d = await res.json();
        setPaidOrders(d.data || []);
      }
    } catch { /* silent */ }
    setLoadingHistory(false);
  };

  // ── Cancel order ──
  const handleCancel = async () => {
    if (!activeOrderId) { clearCart(); return; }
    try {
      await fetch(`/api/orders/${activeOrderId}`, { method: "DELETE" });
      toast.success("Pedido cancelado");
      clearCart();
      setSelectedTable(null);
      await refreshTables();
    } catch { toast.error("Error al cancelar"); }
  };

  // ── Filtered products ──
  const filtered = products.filter(p => {
    const catOk = activeCat === "all" || p.category?.id === activeCat;
    const searchOk = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  // ── Split helpers ──
  const splitPerPart = total / Math.max(splitN, 1);

  const expandedItems = cart.flatMap((item, itemIdx) =>
    Array.from({ length: item.qty }, (_, q) => ({
      key: `${itemIdx}-${q}`,
      name: item.name,
      price: item.price,
      productId: item.productId,
    }))
  );

  const itemTotals: Record<number, number> = {};
  expandedItems.forEach(ei => {
    const person = itemAssignments[ei.key];
    if (person !== undefined) {
      itemTotals[person] = (itemTotals[person] || 0) + ei.price;
    }
  });

  const openDiscountOverlay = () => {
    setDiscInput(String(discount || ""));
    setDiscPreset(discount || 5);
    setShowDiscount(true);
  };

  const applyDiscount = () => {
    const val = parseFloat(discInput) || discPreset || 0;
    setDiscount(Math.min(100, Math.max(0, val)));
    setShowDiscount(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-950 text-white select-none">

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-4 h-14 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25 flex-shrink-0">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white hidden sm:block">StokerPOS</span>
        </div>

        <div className="w-px h-6 bg-zinc-700" />

        <button
          onClick={() => setShowTables(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all",
            selectedTable
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
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

        <div className={cn(
          "ml-2 px-2.5 py-1 rounded-md text-xs font-semibold border hidden sm:block",
          cashRegister
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          <Landmark className="h-3 w-3 inline mr-1" />
          {cashRegister ? "Caja abierta" : "Caja cerrada"}
        </div>

        <div className="ml-auto font-mono text-lg font-bold text-white tabular-nums">{time}</div>

        <div className="w-px h-6 bg-zinc-700" />

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
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

        {/* ── PRODUCTS PANEL ── */}
        <div className="flex flex-col border-r border-zinc-800" style={{ width: "60%" }}>

          {/* Categories */}
          <div className="flex gap-1.5 px-3 py-2 bg-zinc-900/80 border-b border-zinc-800 overflow-x-auto flex-shrink-0 scrollbar-none">
            <button
              onClick={() => setActiveCat("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0",
                activeCat === "all"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
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
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
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
                className="w-full bg-zinc-800/80 border border-zinc-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/50"
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
              const cartItems = cart.filter(i => i.productId === p.id);
              const inCart = cartItems.length > 0;
              const cartQty = cartItems.reduce((s, i) => s + i.qty, 0);
              return (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className={cn(
                    "flex flex-col gap-1.5 p-3 rounded-xl border transition-all text-left min-h-[88px]",
                    inCart
                      ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                      : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.97]"
                  )}
                >
                  <span className="text-[10px] text-zinc-500">{p.category?.name || "General"}</span>
                  <span className="text-xs font-semibold text-white leading-tight line-clamp-2">{p.name}</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {p.hasVariants ? "Variantes" : fmt(p.salePrice)}
                  </span>
                  {inCart && (
                    <span className="text-[10px] text-emerald-400/80 font-semibold">✓ ×{cartQty}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── ORDER PANEL ── */}
        <div className="flex flex-col bg-zinc-950" style={{ width: "40%" }}>

          {/* Order header */}
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
              <span className="text-xs text-zinc-500">{cart.reduce((s, i) => s + i.qty, 0)} items</span>
              {/* Note button in order panel */}
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

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-700">
                <UtensilsCrossed className="h-10 w-10" />
                <p className="text-sm">
                  {selectedTable ? "Añade productos al pedido" : "Selecciona una mesa"}
                </p>
              </div>
            ) : cart.map(item => (
              <div key={`${item.productId}:${item.variantId ?? ""}`} className="flex items-center gap-2 py-2.5 border-b border-zinc-800/60 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                  <p className="text-xs text-zinc-500">{fmt(item.price)} / ud.</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => changeQty(item.productId, -1, item.variantId)}
                    className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-red-900/50 hover:border-red-700 transition-all"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                  <button
                    onClick={() => changeQty(item.productId, 1, item.variantId)}
                    className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-emerald-900/50 hover:border-emerald-700 transition-all"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-sm font-bold text-white w-14 text-right">{fmt(item.price * item.qty)}</span>
                <button
                  onClick={() => removeItem(item.productId, item.variantId)}
                  className="w-6 h-6 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50 flex-shrink-0 space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-amber-400">
                <span>Descuento ({discount}%)</span>
                <span>-{fmt(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-zinc-500">
              <span>IVA (23%)</span>
              <span>{fmt(iva)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
              <span className="text-base font-bold text-white">TOTAL</span>
              <span className="text-xl font-black text-emerald-400">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="flex items-center gap-2 px-3 h-[72px] bg-zinc-900 border-t border-zinc-800 flex-shrink-0">
        <ActionBtn icon="🍽" label="MESAS" color="blue" onClick={() => setShowTables(true)} />
        <ActionBtn
          icon="➕"
          label="NUEVA COMANDA"
          onClick={() => {
            clearCart();
            if (selectedTable) setSelectedTable({ ...selectedTable });
          }}
        />
        <ActionBtn icon={<Percent className="h-4 w-4" />} label="DESCUENTO" color="amber" onClick={openDiscountOverlay} />
        <ActionBtn
          icon={<Printer className="h-4 w-4" />}
          label="IMPRIMIR"
          onClick={() => {
            if (cart.length === 0) { toast.error("Carrito vacío"); return; }
            printReceipt({
              orderNumber: activeOrderNumber,
              tableName: selectedTable ? `Mesa ${selectedTable.number}` : "Sin mesa",
              locationName,
              cashierName: user?.name || "",
              items: cart,
              subtotal,
              discountPct: discount,
              discountAmt,
              iva,
              total,
              payments: lastPayments,
              notes: orderNote,
            });
          }}
        />
        <ActionBtn
          icon={<Scissors className="h-4 w-4" />}
          label="DIVIDIR"
          color="indigo"
          onClick={() => {
            if (cart.length === 0) { toast.error("Carrito vacío"); return; }
            setSplitN(2);
            setSplitPaid(Array(2).fill(null));
            setSplitPayingIdx(null);
            setActivePerson(0);
            setItemAssignments({});
            setSplitMode("equal");
            setShowSplit(true);
          }}
        />
        <ActionBtn
          icon={<History className="h-4 w-4" />}
          label="HISTORIAL"
          onClick={() => { loadHistory(); setHistoryDetail(null); setShowHistory(true); }}
        />
        <ActionBtn
          icon={<Trash2 className="h-4 w-4" />}
          label="CANCELAR"
          color="red"
          onClick={() => {
            if (cart.length === 0 && !activeOrderId) return;
            if (confirm(activeOrderId ? "¿Cancelar pedido en la base de datos?" : "¿Limpiar carrito?")) {
              handleCancel();
            }
          }}
        />
        <ActionBtn
          icon={paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          label="COBRAR"
          color="green"
          wide
          onClick={() => {
            if (cart.length === 0) { toast.error("Carrito vacío"); return; }
            if (!selectedTable) { toast.error("Selecciona una mesa"); return; }
            setPayMethod("CASH");
            setShowPayment(true);
          }}
        />
      </div>

      {/* ════════════════════════════════════════════
           OVERLAYS
      ════════════════════════════════════════════ */}

      {/* ── VARIANT PICKER OVERLAY ── */}
      {showVariantPicker && pendingProduct && (
        <Overlay onClose={() => { setShowVariantPicker(false); setPendingProduct(null); setVariants([]); setSelectedVariantId(""); }}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[420px]">
            <OverlayHeader
              title={pendingProduct.name}
              sub="Seleccionar variante"
              onClose={() => { setShowVariantPicker(false); setPendingProduct(null); setVariants([]); setSelectedVariantId(""); }}
            />
            <div className="px-5 py-4 space-y-3">
              {variantsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                </div>
              ) : variants.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-4">Sin variantes disponibles</div>
              ) : (
                <div className="space-y-2">
                  {variants.map(v => {
                    const price = Number(effectivePrice(v, { salePrice: String(pendingProduct.salePrice) }));
                    const label = variantDisplayName(v.attributes) + (v.sku ? ` · ${v.sku}` : "");
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all",
                          selectedVariantId === v.id
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                        )}
                      >
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="text-sm font-bold text-emerald-400">{fmt(price)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => { setShowVariantPicker(false); setPendingProduct(null); setVariants([]); setSelectedVariantId(""); }}
                className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={!selectedVariantId}
                onClick={confirmVariant}
                className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Agregar al pedido
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── TABLES OVERLAY ── */}
      {showTables && (
        <Overlay onClose={() => setShowTables(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[700px] max-h-[80vh] flex flex-col">
            <OverlayHeader
              title="Mesas del Restaurante"
              sub="Toca una mesa para cargar su pedido"
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
                        ? "bg-emerald-500/10 border-emerald-500"
                        : openOrder
                        ? "bg-zinc-800 border-emerald-500/30 hover:border-emerald-500/60"
                        : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-500"
                    )}
                  >
                    <span className={cn("text-xl font-black", openOrder ? "text-emerald-400" : "text-zinc-500")}>
                      Mesa {t.number}
                    </span>
                    <span className={cn("text-xs font-semibold", openOrder ? "text-emerald-400" : "text-zinc-600")}>
                      {openOrder ? "🟢 Ocupada" : "⚪ Libre"}
                    </span>
                    {openOrder ? (
                      <>
                        <span className="text-xs text-zinc-400">{t.orders.length} pedido(s)</span>
                        <span className="text-sm font-bold text-emerald-400">{fmt(Number(openOrder.totalAmount))}</span>
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

      {/* ── PAYMENT OVERLAY ── */}
      {showPayment && (
        <Overlay onClose={() => setShowPayment(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[460px]">
            <OverlayHeader
              title={`Cobrar · Mesa ${selectedTable?.number ?? ""}`}
              onClose={() => setShowPayment(false)}
            />
            <div className="px-6 py-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">Total a cobrar</p>
              <p className="text-5xl font-black text-emerald-400">{fmt(total)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 px-6 pb-4">
              {METHODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setPayMethod(m.key)}
                  className={cn(
                    "p-4 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                    payMethod === m.key
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  )}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span className="text-sm font-bold">{m.label}</span>
                  <span className="text-xs text-zinc-500">{m.sub}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={paying}
                onClick={() => handlePay([{ amount: total, method: payMethod }])}
                className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-bold text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmar cobro
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── NOTE OVERLAY ── */}
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
                placeholder="Ej: Sin gluten, alergia a los frutos secos, extra picante..."
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/60 resize-none"
              />
              <p className="text-xs text-zinc-600 mt-1">{noteInput.length} caracteres</p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => { setNoteInput(""); setOrderNote(""); if (activeOrderId) fetch(`/api/orders/${activeOrderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_note", notes: "" }) }); setShowNote(false); }}
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
                disabled={savingNote}
                onClick={handleSaveNote}
                className="flex-[2] py-3 rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Guardar nota
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── HISTORY OVERLAY ── */}
      {showHistory && (
        <Overlay onClose={() => { setShowHistory(false); setHistoryDetail(null); }}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[680px] max-h-[85vh] flex flex-col">
            {historyDetail ? (
              <>
                <OverlayHeader
                  title={`Pedido ${historyDetail.number}`}
                  sub={`Mesa ${historyDetail.table?.number ?? "—"} · ${historyDetail.user.name}`}
                  onClose={() => setHistoryDetail(null)}
                />
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {historyDetail.notes && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <FileText className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-amber-300">{historyDetail.notes}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {historyDetail.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-1.5 border-b border-zinc-800 last:border-0">
                        <span className="text-white">{item.product.name} <span className="text-zinc-500">×{item.quantity}</span></span>
                        <span className="text-zinc-300">{fmt(Number(item.unitPrice) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-sm font-black text-emerald-400">
                      <span>TOTAL</span>
                      <span>{fmt(Number(historyDetail.totalAmount))}</span>
                    </div>
                  </div>
                  <div className="pt-1 space-y-1">
                    {historyDetail.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs text-zinc-400">
                        <span>{METHOD_LABEL[p.method] || p.method}</span>
                        <span>{fmt(Number(p.amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-5 pb-5 pt-2 border-t border-zinc-800 flex gap-2">
                  <button
                    onClick={() => setHistoryDetail(null)}
                    className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-400 hover:text-white transition-all"
                  >
                    Volver
                  </button>
                  <button
                    onClick={() => {
                      const items: CartItem[] = historyDetail.items.map(i => ({
                        productId: "",
                        name: i.product.name,
                        price: Number(i.unitPrice),
                        qty: i.quantity,
                      }));
                      const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
                      const iv = sub * 0.23;
                      printReceipt({
                        orderNumber: historyDetail.number,
                        tableName: historyDetail.table ? `Mesa ${historyDetail.table.number}` : "Sin mesa",
                        locationName,
                        cashierName: historyDetail.user.name,
                        items,
                        subtotal: sub,
                        discountPct: 0,
                        discountAmt: 0,
                        iva: iv,
                        total: Number(historyDetail.totalAmount),
                        payments: historyDetail.payments.map(p => ({ amount: Number(p.amount), method: p.method as PayMethod })),
                        notes: historyDetail.notes || "",
                      });
                    }}
                    className="flex-1 py-3 rounded-xl bg-zinc-700 border border-zinc-600 text-sm text-white font-semibold flex items-center justify-center gap-2 hover:bg-zinc-600 transition-all"
                  >
                    <Printer className="h-4 w-4" /> Reimprimir
                  </button>
                  <button
                    onClick={() => window.open(`/api/sales/${historyDetail.id}/pdf`, '_blank')}
                    className="flex-1 py-3 rounded-xl bg-emerald-800/50 border border-emerald-700 text-sm text-emerald-300 font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700/50 transition-all"
                  >
                    <Receipt className="h-4 w-4" /> Comprobante
                  </button>
                </div>
              </>
            ) : (
              <>
                <OverlayHeader
                  title="Historial de hoy"
                  sub={`${paidOrders.length} pedidos pagados`}
                  onClose={() => setShowHistory(false)}
                />
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                    </div>
                  ) : paidOrders.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 text-sm">Sin pedidos pagados hoy</div>
                  ) : paidOrders.map(o => (
                    <button
                      key={o.id}
                      onClick={() => setHistoryDetail(o)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{o.number}</span>
                          {o.table && <span className="text-xs text-zinc-500">Mesa {o.table.number}</span>}
                          {o.notes && <FileText className="h-3 w-3 text-amber-400" />}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {new Date(o.createdAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} · {o.user.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-emerald-400">{fmt(Number(o.totalAmount))}</div>
                        <div className="text-xs text-zinc-600">{o.items.length} item(s)</div>
                      </div>
                    </button>
                  ))}
                </div>
                {paidOrders.length > 0 && (
                  <div className="px-4 py-3 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Total recaudado hoy</span>
                    <span className="text-lg font-black text-emerald-400">
                      {fmt(paidOrders.reduce((s, o) => s + Number(o.totalAmount), 0))}
                    </span>
                  </div>
                )}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => setShowHistory(false)}
                    className="w-full py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </Overlay>
      )}

      {/* ── SPLIT OVERLAY ── */}
      {showSplit && (
        <Overlay onClose={() => setShowSplit(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[560px] max-h-[85vh] flex flex-col">
            <OverlayHeader
              title={`Dividir cuenta · Mesa ${selectedTable?.number ?? ""}`}
              sub={`Total: ${fmt(total)}`}
              onClose={() => setShowSplit(false)}
            />

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Mode selector */}
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "equal", icon: "⚖️", label: "Partes iguales", sub: "Divide el total entre N" },
                  { key: "byitem", icon: "📋", label: "Por ítem", sub: "Cada uno paga sus productos" },
                ] as const).map(m => (
                  <button
                    key={m.key}
                    onClick={() => setSplitMode(m.key)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      splitMode === m.key
                        ? "bg-indigo-500/10 border-indigo-500 text-indigo-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    )}
                  >
                    <div className="text-2xl mb-1">{m.icon}</div>
                    <div className="text-sm font-bold">{m.label}</div>
                    <div className={cn("text-xs mt-0.5", splitMode === m.key ? "text-indigo-400/70" : "text-zinc-600")}>{m.sub}</div>
                  </button>
                ))}
              </div>

              <div className="h-px bg-zinc-800" />

              {/* Equal split */}
              {splitMode === "equal" && (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-400">¿En cuántas partes?</p>
                  <div className="flex gap-2 flex-wrap">
                    {[2, 3, 4, 5, 6].map(n => (
                      <button
                        key={n}
                        onClick={() => { setSplitN(n); setSplitPaid(Array(n).fill(null)); setSplitPayingIdx(null); }}
                        className={cn(
                          "w-14 h-14 rounded-xl border-2 text-xl font-black transition-all",
                          splitN === n
                            ? "bg-indigo-500/10 border-indigo-500 text-indigo-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-indigo-500/50"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                    <input
                      type="number" min="2" max="20" placeholder="Otro"
                      className="w-20 h-14 rounded-xl border-2 border-zinc-700 bg-zinc-800 text-center text-sm text-white outline-none focus:border-indigo-500"
                      onChange={e => {
                        const n = parseInt(e.target.value) || 2;
                        setSplitN(n);
                        setSplitPaid(Array(n).fill(null));
                        setSplitPayingIdx(null);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: splitN }, (_, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border",
                        splitPaid[i] ? "bg-emerald-500/5 border-emerald-500/30" : "bg-zinc-800 border-zinc-700"
                      )}>
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="flex-1 text-sm text-zinc-300">Persona {i + 1}</span>
                        <span className="text-lg font-black text-indigo-400">{fmt(splitPerPart)}</span>
                        {splitPaid[i] ? (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Pagado
                          </span>
                        ) : splitPayingIdx === i ? (
                          <div className="flex gap-1">
                            {METHODS.map(m => (
                              <button
                                key={m.key}
                                onClick={() => setSplitPayMethod(m.key)}
                                className={cn(
                                  "px-2 py-1 rounded text-xs font-bold border transition-all",
                                  splitPayMethod === m.key
                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                                    : "bg-zinc-700 border-zinc-600 text-zinc-400"
                                )}
                              >
                                {m.icon}
                              </button>
                            ))}
                            <button
                              onClick={async () => {
                                const next = [...splitPaid];
                                next[i] = splitPayMethod;
                                setSplitPaid(next);
                                setSplitPayingIdx(null);
                                if (next.every(p => p !== null)) {
                                  const payments = next.map(method => ({
                                    amount: splitPerPart,
                                    method: method as PayMethod,
                                  }));
                                  await handlePay(payments);
                                }
                              }}
                              className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setSplitPayingIdx(i); setSplitPayMethod("CASH"); }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 transition-all"
                          >
                            Cobrar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By item split */}
              {splitMode === "byitem" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">Selecciona persona y toca sus ítems:</p>
                    <button
                      onClick={() => setItemPersons(p => p + 1)}
                      className="text-xs text-indigo-400 border border-indigo-500/30 rounded-lg px-2 py-1 hover:bg-indigo-500/10"
                    >
                      + Añadir persona
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: itemPersons }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setActivePerson(i)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
                          PERSON_COLORS[i % PERSON_COLORS.length],
                          activePerson === i ? "ring-2 ring-offset-1 ring-offset-zinc-900 ring-current opacity-100" : "opacity-60 hover:opacity-90"
                        )}
                      >
                        👤 Persona {i + 1}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {expandedItems.map(ei => {
                      const assigned = itemAssignments[ei.key];
                      const color = assigned !== undefined ? PERSON_COLORS[assigned % PERSON_COLORS.length] : "";
                      return (
                        <button
                          key={ei.key}
                          onClick={() => setItemAssignments(prev => ({ ...prev, [ei.key]: activePerson }))}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                            assigned !== undefined
                              ? cn("border-2", color)
                              : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"
                          )}
                        >
                          <span className="flex-1 text-sm font-semibold text-white">{ei.name}</span>
                          {assigned !== undefined && (
                            <span className={cn("text-xs font-bold", PERSON_COLORS[assigned % PERSON_COLORS.length].split(" ")[0])}>
                              👤 P{assigned + 1}
                            </span>
                          )}
                          <span className="text-sm font-bold text-indigo-400">{fmt(ei.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {Object.keys(itemTotals).length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500">Resumen:</p>
                      {Object.entries(itemTotals).map(([p, amt]) => {
                        const idx = parseInt(p);
                        const personTotal = amt * 1.23 * (1 - discount / 100);
                        return (
                          <div key={p} className="flex justify-between items-center bg-zinc-800 rounded-lg px-3 py-2">
                            <span className={cn("text-sm font-bold", PERSON_COLORS[idx % PERSON_COLORS.length].split(" ")[0])}>
                              👤 Persona {idx + 1}
                            </span>
                            <span className="text-sm font-black text-white">{fmt(personTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-zinc-800 flex gap-2">
              <button
                onClick={() => setShowSplit(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
              {splitMode === "byitem" && (
                <button
                  onClick={async () => {
                    const payments = Object.entries(itemTotals).map(([, amt]) => ({
                      amount: amt * 1.23 * (1 - discount / 100),
                      method: "CASH" as PayMethod,
                    }));
                    if (payments.length === 0) { toast.error("Asigna al menos un ítem"); return; }
                    await handlePay(payments);
                  }}
                  disabled={paying}
                  className="flex-[2] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Procesar división
                </button>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {/* ── DISCOUNT OVERLAY ── */}
      {showDiscount && (
        <Overlay onClose={() => setShowDiscount(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[380px]">
            <OverlayHeader title="Aplicar descuento" onClose={() => setShowDiscount(false)} />
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => { setDiscPreset(n); setDiscInput(String(n)); }}
                    className={cn(
                      "py-3 rounded-xl border-2 text-base font-black transition-all",
                      discPreset === n && discInput === String(n)
                        ? "bg-amber-500/10 border-amber-500 text-amber-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-amber-500/50"
                    )}
                  >
                    {n}%
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" max="100" placeholder="Otro %"
                  value={discInput}
                  onChange={e => { setDiscInput(e.target.value); setDiscPreset(null); }}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-amber-500"
                />
                <span className="text-zinc-500 text-sm">%</span>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setShowDiscount(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={applyDiscount}
                className="flex-[2] py-3 rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500 text-white font-bold text-sm transition-all"
              >
                Aplicar descuento
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

function ActionBtn({
  icon, label, color, wide, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color?: "green" | "red" | "amber" | "blue" | "indigo";
  wide?: boolean;
  onClick: () => void;
}) {
  const base = "flex flex-col items-center justify-center gap-0.5 rounded-xl border h-[52px] cursor-pointer transition-all";
  const wideCls = wide ? "flex-[2]" : "flex-1";
  const colors: Record<string, string> = {
    green:  "bg-emerald-700/60 border-emerald-600 hover:bg-emerald-600",
    red:    "bg-red-900/40 border-red-800 hover:bg-red-900/70",
    amber:  "bg-amber-900/30 border-amber-800/60 hover:bg-amber-900/50",
    blue:   "bg-blue-900/30 border-blue-800/60 hover:bg-blue-900/50",
    indigo: "bg-indigo-900/30 border-indigo-800/60 hover:bg-indigo-900/50",
  };
  const labelColors: Record<string, string> = {
    green: "text-emerald-300", red: "text-red-300", amber: "text-amber-300",
    blue: "text-blue-300", indigo: "text-indigo-300",
  };
  return (
    <button
      onClick={onClick}
      className={cn(base, wideCls, color ? colors[color] : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700")}
    >
      <span className={cn("text-white", color && "text-opacity-90")}>{icon}</span>
      <span className={cn("text-[10px] font-semibold", color ? labelColors[color] : "text-zinc-400")}>{label}</span>
    </button>
  );
}
