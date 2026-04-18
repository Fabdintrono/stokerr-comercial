"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2, Calendar, Mail, Users, MapPin, Package, Truck, FileText, Pencil, Trash2, Loader2 } from "lucide-react";
import { ClientModal, CreateClientData, EditClientData } from "@/components/super-admin/ClientModal";
import toast from "react-hot-toast";

interface Client {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  maxRestaurants: number;
  maxUsers: number;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  locationCount: number;
  userCount: number;
  productCount: number;
  supplierCount: number;
  invoiceCount: number;
}

const planColors: Record<string, string> = {
  STARTER: "bg-zinc-700 text-zinc-300",
  GROWTH: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  ENTERPRISE: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (!res.ok) throw new Error("Error fetching clients");
      const data = await res.json();
      setClients(data.clients);
    } catch {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async (data: CreateClientData | EditClientData) => {
    try {
      if ("ownerEmail" in data) {
        const res = await fetch("/api/admin/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al crear");
        }
        toast.success("Cliente creado correctamente");
      } else {
        const { id, ...body } = data;
        const res = await fetch(`/api/admin/clients/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al actualizar");
        }
        toast.success("Cliente actualizado");
      }
      fetchClients();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Desactivar "${name}"? Se desactivaran todos sus usuarios.`)) return;
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al desactivar");
      toast.success("Cliente desactivado");
      fetchClients();
    } catch {
      toast.error("Error al desactivar cliente");
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = clients.filter((c) => c.active).length;
  const totalLocations = clients.reduce((sum, c) => sum + c.locationCount, 0);
  const totalUsers = clients.reduce((sum, c) => sum + c.userCount, 0);

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
        <Button
          onClick={() => { setEditingClient(null); setModalOpen(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-white">{clients.length}</div>
            <p className="text-xs text-zinc-500 mt-1">Total Clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-emerald-400">{activeCount}</div>
            <p className="text-xs text-zinc-500 mt-1">Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-blue-400">{totalLocations}</div>
            <p className="text-xs text-zinc-500 mt-1">Total Locales</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-amber-400">{totalUsers}</div>
            <p className="text-xs text-zinc-500 mt-1">Total Usuarios</p>
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
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          {clients.length === 0 ? "No hay clientes registrados" : "No se encontraron resultados"}
        </div>
      ) : (
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
                        {!client.active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mt-0.5 truncate">
                        <Mail className="h-3 w-3 inline mr-1" />
                        {client.ownerName} ({client.ownerEmail})
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {client.locationCount} locales
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {client.userCount} usuarios
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {client.productCount} productos
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {client.supplierCount} proveedores
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {client.invoiceCount} facturas
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(client.createdAt).toLocaleDateString("es")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-white"
                      onClick={() => { setEditingClient(client); setModalOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {client.active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-red-400"
                        onClick={() => handleDeactivate(client.id, client.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingClient(null); }}
        onSave={handleCreate}
        initialData={editingClient ? {
          id: editingClient.id,
          name: editingClient.name,
          slug: editingClient.slug,
          plan: editingClient.plan,
          maxRestaurants: editingClient.maxRestaurants,
          maxUsers: editingClient.maxUsers,
          active: editingClient.active,
        } : undefined}
      />
    </div>
  );
}
