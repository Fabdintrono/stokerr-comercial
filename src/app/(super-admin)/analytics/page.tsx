"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, DollarSign, Activity } from "lucide-react";

export default function AnalyticsPage() {
  const { user } = useAuth();

  // TODO: Conectar con API real
  const stats = [
    {
      title: "Clientes Activos",
      value: "124",
      change: "+12%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Ingresos Mensuales",
      value: "€45,231",
      change: "+8%",
      trend: "up",
      icon: DollarSign,
    },
    {
      title: "Suscripciones Nuevas",
      value: "23",
      change: "+5%",
      trend: "up",
      icon: Activity,
    },
    {
      title: "Tasa de Retención",
      value: "94.2%",
      change: "+2%",
      trend: "up",
      icon: TrendingUp,
    },
  ];

  const topClients = [
    { name: "Restaurante Oporto", locations: 5, revenue: "€2,340" },
    { name: "Café Lisboa", locations: 3, revenue: "€1,890" },
    { name: "Pizzaria Porto", locations: 2, revenue: "€1,450" },
    { name: "Sushi Bar Faro", locations: 2, revenue: "€1,120" },
    { name: "Bakery Coimbra", locations: 1, revenue: "€980" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-zinc-400">
            Métricas y estadísticas de la plataforma
          </p>
        </div>
        <div className="text-xs text-zinc-500">
          Última actualización: {new Date().toLocaleDateString("pt-PT")}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-emerald-400 mt-1">
                  {stat.change} vs. mes anterior
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Ingresos por Mes</CardTitle>
            <CardDescription className="text-zinc-400">
              Evolución de ingresos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Gráfico en desarrollo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Clientes por Plan</CardTitle>
            <CardDescription className="text-zinc-400">
              Distribución de suscripciones activas
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Gráfico en desarrollo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clients */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Top Clientes</CardTitle>
          <CardDescription className="text-zinc-400">
            Clientes con mayor volumen de facturación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topClients.map((client, index) => (
              <div
                key={client.name}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-zinc-600 w-6">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{client.name}</p>
                    <p className="text-xs text-zinc-400">{client.locations} ubicaciones</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-400">{client.revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}