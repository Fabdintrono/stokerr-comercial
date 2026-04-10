"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MessageCircle, Clock, User, Building2, AlertCircle, CheckCircle, Hourglass } from "lucide-react";

// Mock data
const mockTickets = [
  {
    id: "1",
    subject: "No puedo acceder a mi cuenta",
    businessName: "Restaurante Chiado",
    userName: "María García",
    userEmail: "maria@chiado.pt",
    priority: "HIGH",
    status: "OPEN",
    createdAt: "2024-04-09 14:30",
    lastMessage: "2024-04-09 15:45",
  },
  {
    id: "2",
    subject: "Error en sincronización de inventario",
    businessName: "Pizzeria Center",
    userName: "Pedro Silva",
    userEmail: "pedro@center.pt",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    createdAt: "2024-04-09 10:15",
    lastMessage: "2024-04-09 16:00",
  },
  {
    id: "3",
    subject: "Consulta sobre facturación",
    businessName: "Café Lisboa",
    userName: "Ana Costa",
    userEmail: "ana@lisboa.pt",
    priority: "LOW",
    status: "WAITING",
    createdAt: "2024-04-08 09:00",
    lastMessage: "2024-04-09 11:30",
  },
  {
    id: "4",
    subject: "Solicitud de upgrade a Enterprise",
    businessName: "Taberna Porto",
    userName: "João Fernandes",
    userEmail: "joao@porto.pt",
    priority: "MEDIUM",
    status: "RESOLVED",
    createdAt: "2024-04-07 16:00",
    lastMessage: "2024-04-08 10:00",
  },
];

const priorityColors: Record<string, string> = {
  LOW: "bg-zinc-700 text-zinc-300",
  MEDIUM: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  HIGH: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  URGENT: "bg-red-500/20 text-red-400 border border-red-500/30",
};

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  OPEN: { bg: "bg-red-500/20", text: "text-red-400", icon: <AlertCircle className="h-3 w-3" /> },
  IN_PROGRESS: { bg: "bg-blue-500/20", text: "text-blue-400", icon: <Hourglass className="h-3 w-3" /> },
  WAITING: { bg: "bg-amber-500/20", text: "text-amber-400", icon: <Clock className="h-3 w-3" /> },
  RESOLVED: { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: <CheckCircle className="h-3 w-3" /> },
};

export default function SupportPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTickets = mockTickets.filter(
    (ticket) =>
      (statusFilter === "all" || ticket.status === statusFilter) &&
      (ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
        ticket.businessName.toLowerCase().includes(search.toLowerCase()) ||
        ticket.userName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Soporte</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestiona los tickets de soporte de los clientes
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-white">24</div>
            <p className="text-xs text-zinc-500 mt-1">Total Abiertos</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-red-400">8</div>
            <p className="text-xs text-zinc-500 mt-1">Sin Responder</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-blue-400">12</div>
            <p className="text-xs text-zinc-500 mt-1">En Progreso</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-emerald-400">156</div>
            <p className="text-xs text-zinc-500 mt-1">Resueltos (este mes)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { value: "all", label: "Todos" },
            { value: "OPEN", label: "Abiertos" },
            { value: "IN_PROGRESS", label: "En Progreso" },
            { value: "WAITING", label: "Esperando" },
            { value: "RESOLVED", label: "Resueltos" },
          ].map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              className={statusFilter === filter.value ? "bg-emerald-500 hover:bg-emerald-600" : "border-zinc-700 text-zinc-400"}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid gap-3">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white truncate">{ticket.subject}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[ticket.priority]}`}>
                        {ticket.priority === "HIGH" ? "Alta" : ticket.priority === "MEDIUM" ? "Media" : "Baja"}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-0.5 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ticket.userName} <span className="text-zinc-600">•</span> {ticket.userEmail}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {ticket.businessName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ticket.createdAt}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${statusColors[ticket.status]?.bg} ${statusColors[ticket.status]?.text}`}>
                    {statusColors[ticket.status]?.icon}
                    <span className="hidden sm:inline">
                      {ticket.status === "OPEN" ? "Abierto" : ticket.status === "IN_PROGRESS" ? "En Progreso" : ticket.status === "WAITING" ? "Esperando" : "Resuelto"}
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}