"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  Users, Plus, X, Check, Loader2, Eye, EyeOff,
  UserCheck, UserX, ChefHat, UtensilsCrossed, CreditCard,
  MapPin,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Location {
  id: string;
  name: string;
  type: string;
}

interface StaffUser {
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

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLES = [
  { value: "WAITER",             label: "Mesonero",   icon: UtensilsCrossed, color: "text-orange-400" },
  { value: "CASHIER",            label: "Cajero",      icon: CreditCard,      color: "text-emerald-400" },
  { value: "RESTAURANT_MANAGER", label: "Gerente",     icon: ChefHat,         color: "text-blue-400" },
];

function roleInfo(role: string) {
  return ROLES.find(r => r.value === role) || { value: role, label: role, icon: Users, color: "text-zinc-400" };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { user: me } = useAuth();

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [myLocation, setMyLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", role: "WAITER",
  });
  const [showPass, setShowPass] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Resolve manager's location ──
  const resolveMyLocation = useCallback(async (): Promise<Location | null> => {
    try {
      const res = await fetch("/api/auth/business");
      if (!res.ok) return null;
      const data = await res.json();
      const biz = data.businesses?.[0];
      if (!biz) return null;
      // Find the restaurant location the current user is assigned to
      // We'll use the first RESTAURANT location of the business (same logic as auto-select)
      const restLoc = (biz.locations || []).find((l: Location & { isActive?: boolean }) => l.type === "RESTAURANT" && l.isActive !== false);
      return restLoc || null;
    } catch {
      return null;
    }
  }, []);

  // ── Load staff ──
  const load = useCallback(async (locationId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/business/users?locationId=${locationId}`);
      if (res.ok) {
        const d = await res.json();
        setStaff(d.users || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    resolveMyLocation().then(loc => {
      setMyLocation(loc);
      if (loc) load(loc.id);
      else setLoading(false);
    });
  }, [resolveMyLocation, load]);

  // ── Toggle active ──
  const toggleActive = async (u: StaffUser) => {
    setTogglingId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !u.active }),
      });
      if (res.ok) {
        setStaff(prev => prev.map(s => s.id === u.id ? { ...s, active: !s.active } : s));
        toast.success(u.active ? "Usuario desactivado" : "Usuario activado");
      } else {
        toast.error("Error al actualizar usuario");
      }
    } catch { toast.error("Error de conexión"); }
    setTogglingId(null);
  };

  // ── Create staff ──
  const handleCreate = async () => {
    setFormError("");
    if (!form.name || !form.email || !form.password) {
      setFormError("Nombre, email y contraseña son obligatorios");
      return;
    }
    if (!myLocation) {
      setFormError("No se pudo determinar el local");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/business/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          role: form.role,
          businessRole: "EMPLOYEE",
          locationIds: [myLocation.id],
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setFormError(d.error || "Error al crear usuario");
        setSaving(false);
        return;
      }
      toast.success(`${form.name} creado correctamente`);
      setShowModal(false);
      resetForm();
      if (myLocation) load(myLocation.id);
    } catch { setFormError("Error de conexión"); }
    setSaving(false);
  };

  const resetForm = () => {
    setForm({ name: "", email: "", password: "", phone: "", role: "WAITER" });
    setFormError("");
    setShowPass(false);
  };

  // ── Filter: only restaurant roles ──
  const restaurantStaff = staff.filter(s => ["WAITER", "CASHIER", "RESTAURANT_MANAGER"].includes(s.role));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Personal</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Mesoneros, cajeros y gerentes del restaurante</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="h-4 w-4" />
          Añadir personal
        </button>
      </div>

      {/* Location badge */}
      {myLocation && (
        <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-sm text-zinc-300">{myLocation.name}</span>
          <span className="text-xs text-zinc-600">— personal de este local</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {ROLES.map(r => {
          const count = restaurantStaff.filter(s => s.role === r.value && s.active).length;
          const Icon = r.icon;
          return (
            <div key={r.value} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center", r.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{count}</div>
                <div className="text-xs text-zinc-500">{r.label}{count !== 1 ? "s" : ""} activos</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {restaurantStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Users className="h-12 w-12 mb-3" />
            <p className="text-sm">Sin personal registrado</p>
            <p className="text-xs mt-1">Añade mesoneros, cajeros o gerentes</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden sm:table-cell">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {restaurantStaff.map(u => {
                const ri = roleInfo(u.role);
                const Icon = ri.icon;
                return (
                  <tr key={u.id} className={cn(
                    "border-b border-zinc-800/50 last:border-0 transition-colors",
                    !u.active && "opacity-50"
                  )}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{u.name}</div>
                          <div className="text-xs text-zinc-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("flex items-center gap-1.5 text-sm font-semibold", ri.color)}>
                        <Icon className="h-3.5 w-3.5" />
                        {ri.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-xs font-semibold",
                        u.active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      )}>
                        {u.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {u.id !== me?.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={togglingId === u.id}
                          title={u.active ? "Desactivar" : "Activar"}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all",
                            u.active
                              ? "bg-red-500/5 border-red-500/20 text-red-400 hover:bg-red-500/10"
                              : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                          )}
                        >
                          {togglingId === u.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : u.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[480px] max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-white">Añadir personal</h2>
                {myLocation && (
                  <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    Se asignará a <span className="text-emerald-400 font-medium">{myLocation.name}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Role selector */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2 block">Rol</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.value}
                        onClick={() => setForm(prev => ({ ...prev, role: r.value }))}
                        className={cn(
                          "p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                          form.role === r.value
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", form.role === r.value ? r.color : "text-zinc-500")} />
                        <span className={cn("text-xs font-semibold", form.role === r.value ? "text-white" : "text-zinc-500")}>
                          {r.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5 block">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Carlos Pereira"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5 block">Email</label>
                <input
                  type="email"
                  placeholder="carlos@restaurante.pt"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5 block">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5 block">
                  Teléfono <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+351 910 000 000"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/60"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={saving}
                onClick={handleCreate}
                className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Crear personal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
