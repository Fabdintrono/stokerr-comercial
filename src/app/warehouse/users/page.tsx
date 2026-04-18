"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Users, UserPlus, MapPin, Pencil, Trash2, Loader2, Shield } from "lucide-react";
import toast from "react-hot-toast";

interface Location {
  id: string;
  name: string;
  type: string;
}

interface BusinessUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  businessRole: string;
  active: boolean;
  createdAt: string;
  locations: Location[];
}

interface UserForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
  businessRole: string;
  locationIds: string[];
}

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "RESTAURANT_MANAGER",
  businessRole: "EMPLOYEE",
  locationIds: [],
};

const roleLabels: Record<string, string> = {
  WAREHOUSE_MANAGER: "Gerente Deposito",
  RESTAURANT_MANAGER: "Gerente Restaurante",
  CASHIER: "Cajero",
};

const roleColors: Record<string, string> = {
  WAREHOUSE_MANAGER: "bg-amber-500/20 text-amber-400",
  RESTAURANT_MANAGER: "bg-emerald-500/20 text-emerald-400",
  CASHIER: "bg-blue-500/20 text-blue-400",
};

const businessRoleLabels: Record<string, string> = {
  OWNER: "Propietario",
  MANAGER: "Gerente",
  EMPLOYEE: "Empleado",
};

export default function UsersPage() {
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<BusinessUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, locsRes] = await Promise.all([
        fetch("/api/business/users"),
        fetch("/api/locations"),
      ]);
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users);
      }
      if (locsRes.ok) {
        const d = await locsRes.json();
        setLocations((d.data || []).filter((l: any) => l.isActive));
      }
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (user: BusinessUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      role: user.role,
      businessRole: user.businessRole,
      locationIds: user.locations.map((l) => l.id),
    });
    setModalOpen(true);
  };

  const toggleLocation = (locId: string) => {
    setForm((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(locId)
        ? prev.locationIds.filter((id) => id !== locId)
        : [...prev.locationIds, locId],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.locationIds.length === 0) {
      toast.error("Selecciona al menos una ubicacion");
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        const body: any = {
          name: form.name,
          phone: form.phone,
          role: form.role,
          businessRole: form.businessRole,
          locationIds: form.locationIds,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/business/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        toast.success("Usuario actualizado");
      } else {
        const res = await fetch("/api/business/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        toast.success("Usuario creado");
      }
      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Desactivar a "${name}"?`)) return;
    try {
      const res = await fetch(`/api/business/users/${id}`, { method: "DELETE" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success("Usuario desactivado");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al desactivar");
    }
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter((u) => u.active).length;
  const managerCount = users.filter((u) => u.role === "RESTAURANT_MANAGER" && u.active).length;
  const cashierCount = users.filter((u) => u.role === "CASHIER" && u.active).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <p className="text-sm text-zinc-400">Gestiona el equipo de tu negocio</p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <UserPlus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Activos</p>
                <p className="text-xl font-bold text-white">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Gerentes Rest.</p>
                <p className="text-xl font-bold text-white">{managerCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Cajeros</p>
                <p className="text-xl font-bold text-white">{cashierCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-emerald-500"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          {users.length === 0 ? "No hay usuarios registrados" : "No se encontraron resultados"}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((user) => (
            <Card key={user.id} className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white truncate">{user.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[user.role] || "bg-zinc-700 text-zinc-300"}`}>
                          {roleLabels[user.role] || user.role}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">
                          {businessRoleLabels[user.businessRole] || user.businessRole}
                        </span>
                        {!user.active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Inactivo</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mt-0.5 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {user.locations.map((loc) => (
                          <span key={loc.id} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {loc.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {user.businessRole !== "OWNER" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {user.active && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400" onClick={() => handleDeactivate(user.id, user.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <UserPlus className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg">
                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                required
              />
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label className="text-zinc-300">Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">{editingUser ? "Nueva Contrasena" : "Contrasena *"}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  placeholder={editingUser ? "Dejar vacio..." : "Min 6 chars"}
                  {...(!editingUser && { required: true, minLength: 6 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Telefono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  placeholder="+351 ..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Rol del Sistema *</Label>
                <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESTAURANT_MANAGER">Gerente Restaurante</SelectItem>
                    <SelectItem value="CASHIER">Cajero</SelectItem>
                    <SelectItem value="WAREHOUSE_MANAGER">Gerente Deposito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Rol en Negocio</Label>
                <Select value={form.businessRole} onValueChange={(v) => setForm((p) => ({ ...p, businessRole: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">Gerente</SelectItem>
                    <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Ubicaciones asignadas *</Label>
              <div className="grid grid-cols-1 gap-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => toggleLocation(loc.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      form.locationIds.includes(loc.id)
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                        : "bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{loc.name}</span>
                    <span className="text-xs opacity-60 ml-auto">
                      {loc.type === "WAREHOUSE" ? "Deposito" : "Restaurante"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </form>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingUser ? "Guardar" : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
