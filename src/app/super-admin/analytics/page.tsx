"use client";

import { useState, useEffect } from "react";
import { Users, DollarSign, TrendingUp, MapPin, ShoppingCart, ArrowUpRight, Loader2, Building2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  summary: {
    totalBusinesses: number;
    activeBusinesses: number;
    inactiveBusinesses: number;
    newThisMonth: number;
    growthVsLastMonth: number | null;
    mrr: number;
    totalUsers: number;
    totalLocations: number;
  };
  byPlan: { STARTER: number; GROWTH: number; ENTERPRISE: number };
  topByLocations: { id: string; name: string; plan: string; locations: number; users: number }[];
  monthlyGrowth: { month: string; clients: number; mrr: number }[];
  platform: { totalOrders: number; totalTransfers: number; totalRevenueProcessed: number };
}

const planColors = {
  STARTER: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  GROWTH: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  ENTERPRISE: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, byPlan, topByLocations, monthlyGrowth, platform } = data;
  const maxGrowth = Math.max(...monthlyGrowth.map(m => m.clients), 1);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-zinc-400">Métricas reales de la plataforma</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Clientes Activos", value: summary.activeBusinesses, sub: `${summary.totalBusinesses} total`, icon: Building2, color: "text-emerald-400 bg-emerald-400/10" },
          { label: "MRR", value: `€${summary.mrr.toFixed(2)}`, sub: summary.newThisMonth > 0 ? `+${summary.newThisMonth} este mes` : "Sin nuevos este mes", icon: DollarSign, color: "text-amber-400 bg-amber-400/10", highlight: true },
          { label: "Usuarios Activos", value: summary.totalUsers, sub: "En toda la plataforma", icon: Users, color: "text-blue-400 bg-blue-400/10" },
          { label: "Locales Totales", value: summary.totalLocations, sub: "Restaurantes + depósitos", icon: MapPin, color: "text-purple-400 bg-purple-400/10" },
        ].map((kpi) => (
          <div key={kpi.label} className={cn("rounded-lg border bg-zinc-900/50 p-5", kpi.highlight ? "border-amber-500/30" : "border-zinc-800")}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-zinc-400">{kpi.label}</p>
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", kpi.color)}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan distribution */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Distribución por plan</h3>
          <div className="space-y-3">
            {(["STARTER", "GROWTH", "ENTERPRISE"] as const).map((plan) => {
              const count = byPlan[plan];
              const total = summary.activeBusinesses || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={plan} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", planColors[plan])}>{plan}</span>
                    <span className="text-sm font-bold text-white">{count} <span className="text-zinc-500 font-normal text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn("h-1.5 rounded-full", plan === "STARTER" ? "bg-zinc-400" : plan === "GROWTH" ? "bg-blue-500" : "bg-amber-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-3 border-t border-zinc-800 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>MRR estimado</span>
              <span className="text-emerald-400 font-bold">€{summary.mrr.toFixed(2)}/mes</span>
            </div>
          </div>
        </div>

        {/* Monthly growth */}
        <div className="lg:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Clientes nuevos por mes</h3>
          <div className="space-y-2">
            {monthlyGrowth.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-14 shrink-0">{m.month}</span>
                <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/60 rounded flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max((m.clients / maxGrowth) * 100, m.clients > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-white w-6 text-right">{m.clients}</span>
              </div>
            ))}
          </div>
          {summary.growthVsLastMonth !== null && (
            <div className={cn(
              "flex items-center gap-2 text-sm pt-2 border-t border-zinc-800",
              summary.growthVsLastMonth >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              <TrendingUp className="h-4 w-4" />
              {summary.growthVsLastMonth >= 0 ? "+" : ""}{summary.growthVsLastMonth}% vs mes anterior
            </div>
          )}
        </div>
      </div>

      {/* Top clients */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-white">Top clientes por locales</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          {topByLocations.map((biz, i) => (
            <div key={biz.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-zinc-600 w-5">#{i + 1}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                  <Building2 className="h-4 w-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{biz.name}</p>
                  <p className="text-xs text-zinc-500">{biz.users} usuarios</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", planColors[biz.plan as keyof typeof planColors] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/20")}>{biz.plan}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{biz.locations}</p>
                  <p className="text-xs text-zinc-500">locales</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pedidos en plataforma", value: platform.totalOrders, icon: ShoppingCart },
          { label: "Transferencias", value: platform.totalTransfers, icon: ArrowUpRight },
          { label: "Ventas procesadas", value: `€${platform.totalRevenueProcessed.toFixed(2)}`, icon: TrendingUp },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 shrink-0">
              <stat.icon className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{stat.label}</p>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
