"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useI18n } from "@/lib/i18n";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  Plus,
  Clock,
  ArrowUpRight,
  Truck,
  CheckCircle,
  Box,
} from "lucide-react";

const kpiData = [
  {
    title: "Valor del Inventario",
    value: "€45,892",
    icon: DollarSign,
    trend: { value: 8.3, isPositive: true },
  },
  {
    title: "Ventas del Día",
    value: "€4,892",
    icon: DollarSign,
    trend: { value: 18.2, isPositive: true },
  },
  {
    title: "Stock Bajo",
    value: "23",
    icon: AlertTriangle,
    subtitle: "productos críticos",
  },
  {
    title: "Pedidos Pendientes",
    value: "8",
    icon: ShoppingCart,
    subtitle: "3 nuevos hoy",
  },
];

const recentOrders = [
  { id: "#1248", restaurant: "Restaurante La Esquina", total: "€125.50", status: "Pendiente", statusColor: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { id: "#1247", restaurant: "Café Central", total: "€89.00", status: "Completado", statusColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { id: "#1246", restaurant: "Bar El Sol", total: "€234.75", status: "En proceso", statusColor: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "#1245", restaurant: "Pizzería Roma", total: "€67.30", status: "Completado", statusColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { id: "#1244", restaurant: "Sushi Express", total: "€312.00", status: "Pendiente", statusColor: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
];

const activities = [
  { icon: CheckCircle, iconColor: "text-emerald-400", iconBg: "bg-emerald-500/10", title: "Nueva venta completada", desc: "Pedido #1247 - €89.50", time: "5m" },
  { icon: Box, iconColor: "text-blue-400", iconBg: "bg-blue-500/10", title: "Stock actualizado", desc: "Coca-Cola 500ml: +50 unidades", time: "15m" },
  { icon: AlertTriangle, iconColor: "text-amber-400", iconBg: "bg-amber-500/10", title: "Alerta de stock bajo", desc: "Agua Mineral 1L - Quedan 5 unidades", time: "30m" },
  { icon: Truck, iconColor: "text-purple-400", iconBg: "bg-purple-500/10", title: "Transferencia recibida", desc: "Depósito Principal → Restaurante Centro", time: "1h" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-4 px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-white">
              {t("dashboard.title")}
            </h1>
            <p className="text-xs text-zinc-500">
              {t("dashboard.welcome")}, {user?.name?.split(" ")[0] || "Usuario"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
              <Clock className="h-3.5 w-3.5" />
              Hoy
            </Button>
            <Button size="sm" className="h-8 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25">
              <Plus className="h-3.5 w-3.5" />
              Nueva venta
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {kpiData.map((kpi, i) => (
            <KPICard
              key={i}
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              icon={kpi.icon}
              trend={kpi.trend}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600">
            <Plus className="h-4 w-4" />
            Agregar Producto
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600">
            <ShoppingCart className="h-4 w-4" />
            Nueva Venta
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600">
            <Truck className="h-4 w-4" />
            Transferir Stock
          </Button>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Recent Orders */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">Pedidos Recientes</h2>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white">
                Ver todos
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <div className="divide-y divide-zinc-800">
              {recentOrders.map((order, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-sm font-medium text-white">
                      {order.id.slice(-2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{order.restaurant}</p>
                      <p className="text-xs text-zinc-500">{order.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">{order.total}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${order.statusColor}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">Actividad Reciente</h2>
            </div>
            <div className="divide-y divide-zinc-800">
              {activities.map((activity, i) => {
                const Icon = activity.icon;
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activity.iconBg}`}>
                      <Icon className={`h-4 w-4 ${activity.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{activity.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{activity.desc}</p>
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}