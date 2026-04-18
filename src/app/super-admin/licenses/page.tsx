"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Key, Building2, CheckCircle, XCircle, Loader2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  createdAt: string;
}

const planColors: Record<string, string> = {
  STARTER: "bg-zinc-700 text-zinc-300",
  GROWTH: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  ENTERPRISE: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

export default function LicensesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ plan: "", maxRestaurants: 0, maxUsers: 0 });
  const [saving, setSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClients(data.clients);
    } catch {
      toast.error("Error al cargar licencias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setEditForm({ plan: client.plan, maxRestaurants: client.maxRestaurants, maxUsers: client.maxUsers });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      toast.success("Licencia actualizada");
      setEditingId(null);
      fetchClients();
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const planCounts = {
    STARTER: clients.filter((c) => c.plan === "STARTER" && c.active).length,
    GROWTH: clients.filter((c) => c.plan === "GROWTH" && c.active).length,
    ENTERPRISE: clients.filter((c) => c.plan === "ENTERPRISE" && c.active).length,
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Licencias</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Gestiona los planes y limites de los negocios
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-white">{clients.length}</div>
            <p className="text-xs text-zinc-500 mt-1">Total Licencias</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-zinc-300">{planCounts.STARTER}</div>
            <p className="text-xs text-zinc-500 mt-1">Starter</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-blue-400">{planCounts.GROWTH}</div>
            <p className="text-xs text-zinc-500 mt-1">Growth</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-4 pb-4">
            <div className="text-xl lg:text-2xl font-bold text-purple-400">{planCounts.ENTERPRISE}</div>
            <p className="text-xs text-zinc-500 mt-1">Enterprise</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar por negocio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Licenses List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredClients.map((client) => {
            const isEditing = editingId === client.id;
            return (
              <Card key={client.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Key className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white truncate">{client.name}</h3>
                          {client.active ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Activo
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> Inactivo
                            </span>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Select value={editForm.plan} onValueChange={(v) => setEditForm((p) => ({ ...p, plan: v }))}>
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STARTER">Starter</SelectItem>
                                <SelectItem value="GROWTH">Growth</SelectItem>
                                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-zinc-500">Locales:</span>
                              <Input
                                type="number"
                                min={1}
                                value={editForm.maxRestaurants}
                                onChange={(e) => setEditForm((p) => ({ ...p, maxRestaurants: parseInt(e.target.value) || 1 }))}
                                className="w-16 h-8 text-xs bg-zinc-800/50 border-zinc-700 text-white"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-zinc-500">Usuarios:</span>
                              <Input
                                type="number"
                                min={1}
                                value={editForm.maxUsers}
                                onChange={(e) => setEditForm((p) => ({ ...p, maxUsers: parseInt(e.target.value) || 1 }))}
                                className="w-16 h-8 text-xs bg-zinc-800/50 border-zinc-700 text-white"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => saveEdit(client.id)}
                              disabled={saving}
                              className="h-8 bg-emerald-500 hover:bg-emerald-600 text-xs"
                            >
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              className="h-8 text-xs text-zinc-400"
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[client.plan]}`}>
                                {client.plan}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 flex-wrap">
                              <span>
                                <Building2 className="h-3 w-3 inline mr-1" />
                                {client.locationCount}/{client.maxRestaurants} locales
                              </span>
                              <span>{client.userCount}/{client.maxUsers} usuarios</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white text-xs shrink-0"
                        onClick={() => startEdit(client)}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
