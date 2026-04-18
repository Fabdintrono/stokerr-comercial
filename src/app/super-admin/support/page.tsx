"use client";

import { useState, useEffect } from "react";
import { Users, Building2, ArrowLeftRight, Activity, Loader2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityData {
  recentBusinesses: { id: string; name: string; plan: string; active: boolean; createdAt: string; owner: { name: string; email: string } | null }[];
  recentUsers: { id: string; name: string; email: string; role: string; active: boolean; createdAt: string }[];
  health: { activeUsers: number; inactiveBusinesses: number; pendingTransfers: number };
  auditLogs: { id: string; action: string; entity: string; entityId: string | null; user: { name: string; email: string; role: string } | null; business: string | null; createdAt: string }[];
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  WAREHOUSE_MANAGER: "Gerente Dep.",
  RESTAURANT_MANAGER: "Gerente Rest.",
  CASHIER: "Cajero",
  USER: "Usuario",
};

const planColors: Record<string, string> = {
  STARTER: "text-zinc-400 bg-zinc-400/10",
  GROWTH: "text-blue-400 bg-blue-400/10",
  ENTERPRISE: "text-amber-400 bg-amber-400/10",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  if (h < 24) return `hace ${h}h`;
  return `hace ${d}d`;
}

type Tab = "businesses" | "users" | "activity";

export default function SupportPage() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("businesses");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/activity");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Actividad del Sistema</h1>
          <p className="text-sm text-zinc-400">Registro de clientes, usuarios y acciones recientes</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {/* Health indicators */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Usuarios activos", value: data.health.activeUsers, icon: Users, color: "text-emerald-400 bg-emerald-400/10", ok: true },
          { label: "Negocios inactivos", value: data.health.inactiveBusinesses, icon: Building2, color: data.health.inactiveBusinesses > 0 ? "text-amber-400 bg-amber-400/10" : "text-zinc-400 bg-zinc-400/10", ok: data.health.inactiveBusinesses === 0 },
          { label: "Transferencias pendientes", value: data.health.pendingTransfers, icon: ArrowLeftRight, color: data.health.pendingTransfers > 0 ? "text-blue-400 bg-blue-400/10" : "text-zinc-400 bg-zinc-400/10", ok: true },
        ].map((h) => (
          <div key={h.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", h.color)}>
              <h.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{h.value}</p>
              <p className="text-xs text-zinc-500">{h.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1 w-fit">
        {([
          { key: "businesses", label: "Negocios recientes", icon: Building2 },
          { key: "users", label: "Usuarios recientes", icon: Users },
          { key: "activity", label: "Actividad", icon: Activity },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              tab === t.key
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Businesses tab */}
      {tab === "businesses" && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
            <span className="text-sm font-medium text-white">{data.recentBusinesses.length} negocios más recientes</span>
          </div>
          <div className="divide-y divide-zinc-800">
            {data.recentBusinesses.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">Sin negocios registrados</div>
            ) : data.recentBusinesses.map((biz) => (
              <div key={biz.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", biz.active ? "bg-emerald-500/10" : "bg-zinc-800")}>
                    <Building2 className={cn("h-4 w-4", biz.active ? "text-emerald-400" : "text-zinc-500")} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{biz.name}</p>
                      {!biz.active && <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">Inactivo</span>}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {biz.owner ? `${biz.owner.name} · ${biz.owner.email}` : "Sin propietario"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className={cn("text-xs px-2 py-0.5 rounded font-medium", planColors[biz.plan] || "text-zinc-400 bg-zinc-400/10")}>
                    {biz.plan}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="h-3 w-3" />
                    {timeAgo(biz.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
            <span className="text-sm font-medium text-white">{data.recentUsers.length} usuarios más recientes</span>
          </div>
          <div className="divide-y divide-zinc-800">
            {data.recentUsers.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">Sin usuarios</div>
            ) : data.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 shrink-0 text-sm font-bold text-zinc-400">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      {user.active
                        ? <CheckCircle className="h-3 w-3 text-emerald-400" />
                        : <XCircle className="h-3 w-3 text-red-400" />
                      }
                    </div>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                    {roleLabels[user.role] || user.role}
                  </span>
                  <span className="text-xs text-zinc-500">{timeAgo(user.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity tab */}
      {tab === "activity" && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
            <span className="text-sm font-medium text-white">{data.auditLogs.length} acciones recientes</span>
          </div>
          {data.auditLogs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">Sin actividad registrada</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {data.auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 shrink-0 mt-0.5">
                    <Activity className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">{log.action}</span>
                      <span className="text-xs text-zinc-500">{log.entity}{log.entityId ? ` #${log.entityId.slice(-6)}` : ""}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {log.user ? `${log.user.name} (${roleLabels[log.user.role] || log.user.role})` : "Sistema"}
                      {log.business ? ` · ${log.business}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0">{timeAgo(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
