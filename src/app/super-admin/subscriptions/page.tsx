"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Search, CreditCard, Building2, CheckCircle, XCircle, Loader2, Pencil, Save } from "lucide-react";
import toast from "react-hot-toast";

interface Client {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  maxRestaurants: number;
  maxUsers: number;
  locationCount: number;
  userCount: number;
  productCount: number;
  supplierCount: number;
  invoiceCount: number;
  createdAt: string;
}

interface PlanPrice {
  id: string;
  plan: string;
  monthlyPrice: string;
  currency: string;
}

const planColors: Record<string, string> = {
  STARTER: "bg-zinc-700 text-zinc-300",
  GROWTH: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  ENTERPRISE: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

export default function SubscriptionsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({});
  const [planPricesRaw, setPlanPricesRaw] = useState<PlanPrice[]>([]);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClients(data.clients);
    } catch {
      toast.error("Error al cargar suscripciones");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlanPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/plan-prices");
      if (!res.ok) return;
      const data: PlanPrice[] = await res.json();
      setPlanPricesRaw(data);
      const map: Record<string, number> = {};
      for (const p of data) map[p.plan] = Number(p.monthlyPrice);
      setPlanPrices(map);
    } catch {
      // non-critical — fallback to empty
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchPlanPrices();
  }, [fetchClients, fetchPlanPrices]);

  async function savePlanPrice(plan: string) {
    const price = Number(editValue);
    if (isNaN(price) || price < 0) { toast.error("Precio inválido"); return; }
    setSavingPlan(plan);
    try {
      const res = await fetch("/api/admin/plan-prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, monthlyPrice: price }),
      });
      if (!res.ok) throw new Error();
      toast.success("Precio actualizado");
      setPlanPrices(prev => ({ ...prev, [plan]: price }));
      setEditingPlan(null);
    } catch {
      toast.error("Error al guardar precio");
    } finally {
      setSavingPlan(null);
    }
  }

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.plan.toLowerCase().includes(search.toLowerCase())
  );

  const activeClients = clients.filter((c) => c.active);
  const monthlyRevenue = activeClients.reduce((sum, c) => sum + (planPrices[c.plan] || 0), 0);

  const plans = ["STARTER", "GROWTH", "ENTERPRISE"];

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Suscripciones</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Resumen de planes y facturacion de los negocios
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-white">{clients.length}</div>
            <p className="text-xs text-zinc-500 mt-1">Total Suscripciones</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-emerald-400">{activeClients.length}</div>
            <p className="text-xs text-zinc-500 mt-1">Activas</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-red-400">{clients.length - activeClients.length}</div>
            <p className="text-xs text-zinc-500 mt-1">Inactivas</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-amber-400">{monthlyRevenue.toFixed(2)} USD</div>
            <p className="text-xs text-zinc-500 mt-1">Ingresos Mensuales</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Prices Editor */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="pt-4 pb-4">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Precios de Plan (USD/mes)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((plan) => (
              <div key={plan} className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[plan]}`}>{plan}</span>
                {editingPlan === plan ? (
                  <>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-24 px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      onClick={() => savePlanPrice(plan)}
                      disabled={savingPlan === plan}
                      className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                    >
                      {savingPlan === plan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-white">${(planPrices[plan] ?? 0).toFixed(2)}</span>
                    <button
                      onClick={() => { setEditingPlan(plan); setEditValue(String(planPrices[plan] ?? 0)); }}
                      className="p-1 text-zinc-500 hover:text-zinc-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar por negocio o plan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Subscriptions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white truncate">{client.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[client.plan]}`}>
                          {client.plan}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-0.5">
                        ${(planPrices[client.plan] ?? 0).toFixed(2)} USD/mes
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {client.locationCount} locales
                        </span>
                        <span>{client.userCount} usuarios</span>
                        <span>{client.productCount} productos</span>
                        <span className="hidden sm:inline">Desde: {new Date(client.createdAt).toLocaleDateString("es")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {client.active ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span className="hidden sm:inline">Activa</span>
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        <span className="hidden sm:inline">Inactiva</span>
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
