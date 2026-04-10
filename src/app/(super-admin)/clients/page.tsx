"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, MoreVertical, Mail, Phone, Building2, Calendar } from "lucide-react";

// Mock data - en producción vendría de la API
const mockClients = [
  {
    id: "1",
    name: "Restaurante Chiado",
    slug: "chiado",
    plan: "GROWTH",
    status: "ACTIVE",
    locations: 3,
    users: 5,
    createdAt: "2024-01-15",
    email: "maria@chiado.pt",
  },
  {
    id: "2",
    name: "Pizzeria Center",
    slug: "pizzeria-center",
    plan: "STARTER",
    status: "ACTIVE",
    locations: 2,
    users: 3,
    createdAt: "2024-02-20",
    email: "pedro@center.pt",
  },
  {
    id: "3",
    name: "Café Lisboa",
    slug: "cafe-lisboa",
    plan: "ENTERPRISE",
    status: "PAST_DUE",
    locations: 5,
    users: 12,
    createdAt: "2024-03-10",
    email: "ana@lisboa.pt",
  },
];

const planColors: Record<string, string> = {
  STARTER: "bg-zinc-700 text-zinc-300",
  GROWTH: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ENTERPRISE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const statusColors: Record<string, string> = {
  ACTIVE: "text-emerald-400",
  PAST_DUE: "text-amber-400",
  CANCELLED: "text-red-400",
  EXPIRED: "text-zinc-500",
};

export default function ClientsPage() {
  const [search, setSearch] = useState("");

  const filteredClients = mockClients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestiona los negocios registrados en la plataforma
          </p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-white">156</div>
            <p className="text-xs text-zinc-500 mt-1">Total Clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-emerald-400">142</div>
            <p className="text-xs text-zinc-500 mt-1">Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-amber-400">8</div>
            <p className="text-xs text-zinc-500 mt-1">Pago Vencido</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-blue-400">6</div>
            <p className="text-xs text-zinc-500 mt-1">Prueba Gratis</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Clients List */}
      <div className="grid gap-3">
        {filteredClients.map((client) => (
          <Card key={client.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white truncate">{client.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[client.plan]}`}>
                        {client.plan}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-0.5 truncate">{client.email}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {client.locations} locales
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {client.users} usuarios
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {client.createdAt}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs sm:text-sm font-medium ${statusColors[client.status]}`}>
                    {client.status === "ACTIVE" ? "Activo" : client.status === "PAST_DUE" ? "Vencido" : client.status}
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