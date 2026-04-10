"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, MoreVertical, CreditCard, Calendar, Building2, CheckCircle, XCircle, Clock } from "lucide-react";

// Mock data
const mockSubscriptions = [
  {
    id: "1",
    businessName: "Restaurante Chiado",
    plan: "GROWTH",
    amount: 49.90,
    currency: "EUR",
    billingCycle: "MONTHLY",
    status: "ACTIVE",
    currentPeriodEnd: "2024-05-15",
    paymentMethod: "Tarjeta •••• 4242",
  },
  {
    id: "2",
    businessName: "Pizzeria Center",
    plan: "STARTER",
    amount: 19.90,
    currency: "EUR",
    billingCycle: "MONTHLY",
    status: "PAST_DUE",
    currentPeriodEnd: "2024-04-01",
    paymentMethod: "Transferencia",
  },
  {
    id: "3",
    businessName: "Café Lisboa",
    plan: "ENTERPRISE",
    amount: 199.00,
    currency: "EUR",
    billingCycle: "YEARLY",
    status: "ACTIVE",
    currentPeriodEnd: "2025-03-10",
    paymentMethod: "Tarjeta •••• 1234",
  },
  {
    id: "4",
    businessName: "Taberna Porto",
    plan: "GROWTH",
    amount: 0,
    currency: "EUR",
    billingCycle: "MONTHLY",
    status: "TRIAL",
    currentPeriodEnd: "2024-04-20",
    paymentMethod: null,
  },
];

const planColors: Record<string, string> = {
  STARTER: "bg-zinc-700 text-zinc-300",
  GROWTH: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  ENTERPRISE: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  ACTIVE: { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: <CheckCircle className="h-3 w-3" /> },
  PAST_DUE: { bg: "bg-red-500/20", text: "text-red-400", icon: <XCircle className="h-3 w-3" /> },
  TRIAL: { bg: "bg-amber-500/20", text: "text-amber-400", icon: <Clock className="h-3 w-3" /> },
  CANCELLED: { bg: "bg-zinc-500/20", text: "text-zinc-400", icon: <XCircle className="h-3 w-3" /> },
};

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");

  const filteredSubscriptions = mockSubscriptions.filter(
    (sub) =>
      sub.businessName.toLowerCase().includes(search.toLowerCase()) ||
      sub.plan.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Suscripciones</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestiona los planes y pagos de los negocios
          </p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Suscripción
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-white">156</div>
            <p className="text-xs text-zinc-500 mt-1">Total Suscripciones</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-emerald-400">142</div>
            <p className="text-xs text-zinc-500 mt-1">Activas</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-red-400">8</div>
            <p className="text-xs text-zinc-500 mt-1">Pago Vencido</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-amber-400">€2,450</div>
            <p className="text-xs text-zinc-500 mt-1">Ingresos Mensuales</p>
          </CardContent>
        </Card>
      </div>

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
      <div className="grid gap-3">
        {filteredSubscriptions.map((sub) => (
          <Card key={sub.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white truncate">{sub.businessName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[sub.plan]}`}>
                        {sub.plan}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      {sub.status === "TRIAL" ? (
                        <span className="text-amber-400">Período de prueba</span>
                      ) : (
                        <>
                          €{sub.amount.toFixed(2)}/{sub.billingCycle === "MONTHLY" ? "mes" : "año"}
                          {sub.paymentMethod && (
                            <span className="text-zinc-500 ml-2">• {sub.paymentMethod}</span>
                          )}
                        </>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Próx. cobro: {sub.currentPeriodEnd}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${statusColors[sub.status]?.bg} ${statusColors[sub.status]?.text}`}>
                    {statusColors[sub.status]?.icon}
                    <span className="hidden sm:inline">
                      {sub.status === "ACTIVE" ? "Activa" : sub.status === "TRIAL" ? "Prueba" : sub.status === "PAST_DUE" ? "Vencida" : sub.status}
                    </span>
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}