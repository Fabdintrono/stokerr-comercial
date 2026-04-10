"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, MoreVertical, Key, Calendar, Building2, CheckCircle, XCircle } from "lucide-react";

// Mock data
const mockLicenses = [
  {
    id: "1",
    key: "STK-CHIADO-2024-001",
    businessName: "Restaurante Chiado",
    plan: "GROWTH",
    maxLocations: 5,
    maxUsers: 10,
    status: "ACTIVE",
    expiresAt: "2025-01-15",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    key: "STK-CENTER-2024-002",
    businessName: "Pizzeria Center",
    plan: "STARTER",
    maxLocations: 2,
    maxUsers: 3,
    status: "ACTIVE",
    expiresAt: "2024-08-20",
    createdAt: "2024-02-20",
  },
  {
    id: "3",
    key: "STK-LISBOA-2024-003",
    businessName: "Café Lisboa",
    plan: "ENTERPRISE",
    maxLocations: 20,
    maxUsers: 50,
    status: "EXPIRED",
    expiresAt: "2024-03-10",
    createdAt: "2023-03-10",
  },
  {
    id: "4",
    key: "STK-PORTO-2024-004",
    businessName: "Taberna Porto",
    plan: "GROWTH",
    maxLocations: 5,
    maxUsers: 10,
    status: "TRIAL",
    expiresAt: "2024-04-20",
    createdAt: "2024-04-06",
  },
];

const planColors: Record<string, string> = {
  STARTER: "bg-zinc-700 text-zinc-300",
  GROWTH: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  ENTERPRISE: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  ACTIVE: { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: <CheckCircle className="h-3 w-3" /> },
  EXPIRED: { bg: "bg-red-500/20", text: "text-red-400", icon: <XCircle className="h-3 w-3" /> },
  TRIAL: { bg: "bg-amber-500/20", text: "text-amber-400", icon: <Calendar className="h-3 w-3" /> },
  SUSPENDED: { bg: "bg-zinc-500/20", text: "text-zinc-400", icon: <XCircle className="h-3 w-3" /> },
};

export default function LicensesPage() {
  const [search, setSearch] = useState("");

  const filteredLicenses = mockLicenses.filter(
    (license) =>
      license.key.toLowerCase().includes(search.toLowerCase()) ||
      license.businessName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Licencias</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestiona las licencias de los negocios
          </p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Licencia
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-white">156</div>
            <p className="text-xs text-zinc-500 mt-1">Total Licencias</p>
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
            <div className="text-xl lg:text-2xl font-bold text-amber-400">8</div>
            <p className="text-xs text-zinc-500 mt-1">Prueba</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-red-400">6</div>
            <p className="text-xs text-zinc-500 mt-1">Expiradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar por clave o negocio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Licenses List */}
      <div className="grid gap-3">
        {filteredLicenses.map((license) => (
          <Card key={license.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <Key className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white font-mono text-sm truncate">{license.key}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[license.plan]}`}>
                        {license.plan}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-0.5 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {license.businessName}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                      <span>{license.maxLocations} locales</span>
                      <span>{license.maxUsers} usuarios</span>
                      <span className="hidden sm:inline">Expira: {license.expiresAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${statusColors[license.status]?.bg} ${statusColors[license.status]?.text}`}>
                    {statusColors[license.status]?.icon}
                    <span className="hidden sm:inline">
                      {license.status === "ACTIVE" ? "Activa" : license.status === "TRIAL" ? "Prueba" : license.status === "EXPIRED" ? "Expirada" : license.status}
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