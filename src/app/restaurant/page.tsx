"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  ArrowUpRight,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  totalSales: number;
  totalOrders: number;
  openOrders: number;
  avgTicket: number;
  totalTables: number;
  occupiedTables: number;
  cashRegister: { id: string; openedAt: string; openingBalance: number; user: { name: string } } | null;
  recentOrders: {
    id: string;
    number: string;
    table: string;
    total: number;
    status: string;
    user: string;
    time: string;
  }[];
}

function getLocationId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/locationId=([^;]+)/);
  return match ? match[1] : null;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PREPARING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  SERVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PAID: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const statusLabels: Record<string, string> = {
  OPEN: "Abierto",
  PREPARING: "Preparando",
  SERVED: "Servido",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

export default function RestaurantPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    const resolveLocation = async () => {
      // Cookie is set by the layout before businessReady=true, so it's always available here
      const lid = getLocationId();
      if (lid) { setLocationId(lid); return; }

      // Fallback: fetch from API (e.g. direct navigation)
      try {
        const res = await fetch("/api/auth/business");
        if (res.ok) {
          const bizData = await res.json();
          const biz = bizData.businesses?.[0];
          const restLoc = biz?.locations?.find((l: any) => l.type === "RESTAURANT");
          if (restLoc) setLocationId(restLoc.id);
          else setLoading(false); // no restaurant location configured
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    resolveLocation();
  }, []);

  useEffect(() => {
    if (!locationId) return;
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`/api/dashboard/restaurant?locationId=${locationId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch {
        console.error("Error fetching dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [locationId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const kpis = [
    {
      title: "Ventas del Día",
      value: `€${(data?.totalSales || 0).toFixed(2)}`,
      icon: DollarSign,
    },
    {
      title: "Pedidos Hoy",
      value: String(data?.totalOrders || 0),
      icon: ShoppingCart,
      subtitle: `${data?.openOrders || 0} abiertos`,
    },
    {
      title: "Mesas Ocupadas",
      value: `${data?.occupiedTables || 0}/${data?.totalTables || 0}`,
      icon: Users,
    },
    {
      title: "Ticket Medio",
      value: `€${(data?.avgTicket || 0).toFixed(2)}`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <p className="text-xs text-zinc-500">Bienvenido, {user?.name?.split(" ")[0] || "Usuario"}</p>
        </div>
        <div className="flex items-center gap-2">
          {data?.cashRegister ? (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
              Caja abierta por {data.cashRegister.user.name}
            </span>
          ) : (
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
              Caja cerrada
            </span>
          )}
          <Link href="/restaurant/orders">
            <Button size="sm" className="h-8 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white">
              <ShoppingCart className="h-3.5 w-3.5" />
              Nuevo Pedido
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KPICard key={i} title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} icon={kpi.icon} />
        ))}
      </div>

      {/* Recent Orders */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">Pedidos Recientes</h2>
          <Link href="/restaurant/orders">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white">
              Ver todos <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
        <div className="divide-y divide-zinc-800">
          {(data?.recentOrders || []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              Sin pedidos hoy
            </div>
          ) : (
            data?.recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                    <UtensilsCrossed className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Mesa {order.table}</p>
                    <p className="text-xs text-zinc-500">{order.number} · {order.user}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">€{order.total.toFixed(2)}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusColors[order.status] || ""}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
