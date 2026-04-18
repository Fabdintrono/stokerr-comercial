"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Search,
  Loader2,
  UtensilsCrossed,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  salePrice: number;
  category: { name: string };
  unit: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Table {
  id: string;
  number: string;
  capacity: number;
  orders: { id: string; number: string; status: string; totalAmount: number }[];
}

interface Order {
  id: string;
  number: string;
  status: string;
  totalAmount: number;
  table?: { number: string };
  user: { name: string };
  items: { id: string; quantity: number; unitPrice: number; totalPrice: number; product: { name: string } }[];
  payments: { id: string; amount: number; method: string }[];
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // POS state
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [view, setView] = useState<"pos" | "orders">("pos");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [processing, setProcessing] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  // Fetch location
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const bizRes = await fetch("/api/auth/business");
        if (bizRes.ok) {
          const bizData = await bizRes.json();
          const biz = bizData.businesses?.[0];
          if (biz) {
            const restLoc = biz.locations.find((l: any) => l.type === "RESTAURANT");
            if (restLoc) {
              setLocationId(restLoc.id);
              return;
            }
            // fallback to first location
            if (biz.locations.length > 0) {
              setLocationId(biz.locations[0].id);
            }
          }
        }
      } catch {}
    };
    fetchLocation();
  }, []);

  const fetchData = useCallback(async () => {
    if (!locationId) return;
    try {
      const [tablesRes, productsRes, categoriesRes, ordersRes] = await Promise.all([
        fetch(`/api/tables?locationId=${locationId}`),
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch(`/api/orders?locationId=${locationId}&date=${new Date().toISOString().slice(0, 10)}`),
      ]);

      if (tablesRes.ok) {
        const d = await tablesRes.json();
        setTables(d.data || []);
      }
      if (productsRes.ok) {
        const d = await productsRes.json();
        setProducts((d.products || []).filter((p: any) => p.isActive));
      }
      if (categoriesRes.ok) {
        const d = await categoriesRes.json();
        setCategories(d.categories || []);
      }
      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders(d.data || []);
      }
    } catch {
      console.error("Error loading POS data");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.salePrice) * item.quantity, 0);

  // Create order
  const createOrder = async () => {
    if (cart.length === 0 || !locationId || !user) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          tableId: selectedTable?.id,
          userId: user.id,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: Number(item.product.salePrice),
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Pedido ${data.data.number} creado`);
        setCart([]);
        setSelectedTable(null);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al crear pedido");
      }
    } catch {
      toast.error("Error al crear pedido");
    } finally {
      setProcessing(false);
    }
  };

  // Pay order
  const payOrder = async (orderId: string) => {
    setProcessing(true);
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          payments: [{ amount: Number(order.totalAmount), method: paymentMethod }],
        }),
      });
      if (res.ok) {
        toast.success("Pedido pagado");
        setShowPayment(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al pagar");
      }
    } catch {
      toast.error("Error al procesar pago");
    } finally {
      setProcessing(false);
    }
  };

  // Cancel order
  const cancelOrder = async (orderId: string) => {
    if (!confirm("¿Cancelar este pedido?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Pedido cancelado");
        fetchData();
      }
    } catch {
      toast.error("Error");
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !activeCategory || p.category?.name === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const openOrders = orders.filter((o) => ["OPEN", "PREPARING", "SERVED"].includes(o.status));
  const closedOrders = orders.filter((o) => ["PAID", "CANCELLED"].includes(o.status));

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800">
        <Button
          size="sm"
          variant={view === "pos" ? "default" : "outline"}
          className={view === "pos" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-zinc-700 text-zinc-400"}
          onClick={() => setView("pos")}
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" /> POS
        </Button>
        <Button
          size="sm"
          variant={view === "orders" ? "default" : "outline"}
          className={view === "orders" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-zinc-700 text-zinc-400"}
          onClick={() => setView("orders")}
        >
          <UtensilsCrossed className="h-4 w-4 mr-1.5" /> Pedidos ({openOrders.length})
        </Button>
      </div>

      {view === "pos" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Products */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search + Categories */}
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  size="sm"
                  variant={!activeCategory ? "default" : "outline"}
                  className={!activeCategory ? "bg-emerald-500 hover:bg-emerald-600 text-white shrink-0" : "border-zinc-700 text-zinc-400 shrink-0"}
                  onClick={() => setActiveCategory(null)}
                >
                  Todos
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    size="sm"
                    variant={activeCategory === cat.name ? "default" : "outline"}
                    className={activeCategory === cat.name ? "bg-emerald-500 hover:bg-emerald-600 text-white shrink-0" : "border-zinc-700 text-zinc-400 shrink-0"}
                    onClick={() => setActiveCategory(cat.name)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Table selection */}
            {tables.length > 0 && (
              <div className="px-4 pb-3">
                <p className="text-xs text-zinc-500 mb-2">Mesa:</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Button
                    size="sm"
                    variant={!selectedTable ? "default" : "outline"}
                    className={!selectedTable ? "bg-zinc-700 text-white shrink-0" : "border-zinc-700 text-zinc-400 shrink-0"}
                    onClick={() => setSelectedTable(null)}
                  >
                    Sin mesa
                  </Button>
                  {tables.map((table) => {
                    const isOccupied = table.orders.length > 0;
                    return (
                      <Button
                        key={table.id}
                        size="sm"
                        variant={selectedTable?.id === table.id ? "default" : "outline"}
                        className={
                          selectedTable?.id === table.id
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                            : isOccupied
                            ? "border-amber-500/50 text-amber-400 shrink-0"
                            : "border-zinc-700 text-zinc-400 shrink-0"
                        }
                        onClick={() => setSelectedTable(table)}
                      >
                        {table.number} {isOccupied && "●"}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="flex flex-col items-start p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/50 hover:bg-zinc-800/50 transition-all text-left"
                  >
                    <span className="text-sm font-medium text-white truncate w-full">{product.name}</span>
                    <span className="text-xs text-zinc-500">{product.category?.name}</span>
                    <span className="text-sm font-bold text-emerald-400 mt-1">
                      €{Number(product.salePrice).toFixed(2)}
                    </span>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-sm text-zinc-500">
                    Sin productos
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Cart */}
          <div className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-900/30">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Pedido Actual
                {selectedTable && (
                  <span className="text-xs text-emerald-400 ml-auto">Mesa {selectedTable.number}</span>
                )}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-8">Agrega productos al pedido</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.product.name}</p>
                      <p className="text-xs text-zinc-500">€{Number(item.product.salePrice).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-zinc-400 hover:text-white"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm text-white w-6 text-center">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-zinc-400 hover:text-white"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-red-400 hover:text-red-300"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-medium text-white w-16 text-right">
                      €{(Number(item.product.salePrice) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Total</span>
                <span className="text-xl font-bold text-white">€{cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                disabled={cart.length === 0 || processing}
                onClick={createOrder}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                Crear Pedido
              </Button>
              {cart.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-400 hover:text-white"
                  onClick={() => setCart([])}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Orders view */
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Open orders */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Pedidos Abiertos ({openOrders.length})</h3>
            {openOrders.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin pedidos abiertos</p>
            ) : (
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {openOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{order.number}</p>
                        <p className="text-xs text-zinc-500">
                          {order.table ? `Mesa ${order.table.number}` : "Sin mesa"} · {order.user?.name}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                        order.status === "OPEN" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        order.status === "PREPARING" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {order.status === "OPEN" ? "Abierto" : order.status === "PREPARING" ? "Preparando" : "Servido"}
                      </span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-zinc-400">{item.quantity}x {item.product.name}</span>
                          <span className="text-zinc-300">€{Number(item.totalPrice).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                      <span className="text-lg font-bold text-white">€{Number(order.totalAmount).toFixed(2)}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => cancelOrder(order.id)}
                        >
                          <X className="h-3 w-3 mr-1" /> Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => { setPayingOrderId(order.id); setShowPayment(true); }}
                        >
                          <CreditCard className="h-3 w-3 mr-1" /> Cobrar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Closed orders */}
          {closedOrders.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">Cerrados Hoy ({closedOrders.length})</h3>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800">
                {closedOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm text-white">{order.number}</p>
                        <p className="text-xs text-zinc-500">
                          {order.table ? `Mesa ${order.table.number}` : "Sin mesa"} ·{" "}
                          {new Date(order.createdAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">€{Number(order.totalAmount).toFixed(2)}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                        order.status === "PAID" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {order.status === "PAID" ? "Pagado" : "Cancelado"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment modal */}
      {showPayment && payingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Cobrar Pedido</h3>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400" onClick={() => setShowPayment(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-white">
                €{Number(orders.find(o => o.id === payingOrderId)?.totalAmount || 0).toFixed(2)}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {orders.find(o => o.id === payingOrderId)?.number}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "CASH", label: "Efectivo", icon: Banknote },
                  { value: "CARD", label: "Tarjeta", icon: CreditCard },
                  { value: "MBWAY", label: "MB Way", icon: Smartphone },
                  { value: "TRANSFER", label: "Transfer.", icon: CreditCard },
                ].map((m) => (
                  <Button
                    key={m.value}
                    variant={paymentMethod === m.value ? "default" : "outline"}
                    className={paymentMethod === m.value
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "border-zinc-700 text-zinc-400"
                    }
                    onClick={() => setPaymentMethod(m.value)}
                  >
                    <m.icon className="h-4 w-4 mr-2" />
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
              disabled={processing}
              onClick={() => payOrder(payingOrderId)}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Confirmar Pago
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
