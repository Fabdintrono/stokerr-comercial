"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, DollarSign, Globe, Database, Loader2, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Settings = Record<string, string>;

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
        <Icon className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => setSettings(d.data || {}))
      .catch(() => toast.error("Error al cargar configuración"))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const setBool = (key: string, value: boolean) => set(key, value ? "true" : "false");
  const bool = (key: string) => settings[key] === "true";
  const val = (key: string) => settings[key] || "";

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        toast.success("Configuración guardada");
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error("Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración</h1>
          <p className="text-sm text-zinc-400">Ajustes globales de la plataforma</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className={cn("gap-2", saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-500 hover:bg-emerald-600")}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
        </Button>
      </div>

      {/* Platform */}
      <Section title="Plataforma" icon={Globe}>
        <SettingRow label="Nombre de la plataforma" description="Aparece en emails y documentos">
          <Input
            value={val("platform.name")}
            onChange={e => set("platform.name", e.target.value)}
            className="w-48 bg-zinc-800/50 border-zinc-700 text-white text-sm"
          />
        </SettingRow>
        <SettingRow label="Email de soporte" description="Dirección de contacto para clientes">
          <Input
            type="email"
            value={val("platform.supportEmail")}
            onChange={e => set("platform.supportEmail", e.target.value)}
            className="w-48 bg-zinc-800/50 border-zinc-700 text-white text-sm"
          />
        </SettingRow>
        <SettingRow label="Días de prueba gratuita" description="Para nuevos registros">
          <Input
            type="number"
            min="0"
            max="90"
            value={val("platform.maxTrialDays")}
            onChange={e => set("platform.maxTrialDays", e.target.value)}
            className="w-24 bg-zinc-800/50 border-zinc-700 text-white text-sm"
          />
        </SettingRow>
      </Section>

      {/* Billing */}
      <Section title="Facturación" icon={DollarSign}>
        <SettingRow label="Moneda" description="Moneda para todas las transacciones">
          <select
            value={val("billing.currency")}
            onChange={e => set("billing.currency", e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-white text-sm"
          >
            <option value="EUR">EUR — Euro</option>
            <option value="USD">USD — Dólar</option>
            <option value="BRL">BRL — Real</option>
          </select>
        </SettingRow>
        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Precios por plan (mensuales)</p>
          {[
            { key: "billing.priceStarter", label: "STARTER" },
            { key: "billing.priceGrowth", label: "GROWTH" },
            { key: "billing.priceEnterprise", label: "ENTERPRISE" },
          ].map((p) => (
            <SettingRow key={p.key} label={p.label}>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-sm">€</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={val(p.key)}
                  onChange={e => set(p.key, e.target.value)}
                  className="w-28 bg-zinc-800/50 border-zinc-700 text-white text-sm"
                />
                <span className="text-zinc-500 text-xs">/mes</span>
              </div>
            </SettingRow>
          ))}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notificaciones del sistema" icon={Bell}>
        <SettingRow label="Nuevo cliente registrado" description="Alerta cuando se crea un nuevo negocio">
          <Switch checked={bool("notifications.newClient")} onCheckedChange={v => setBool("notifications.newClient", v)} />
        </SettingRow>
        <SettingRow label="Alertas de stock bajo" description="Notificación cuando productos caen bajo mínimo">
          <Switch checked={bool("notifications.lowStock")} onCheckedChange={v => setBool("notifications.lowStock", v)} />
        </SettingRow>
        <SettingRow label="Resumen de pagos" description="Reporte diario de ventas procesadas">
          <Switch checked={bool("notifications.payments")} onCheckedChange={v => setBool("notifications.payments", v)} />
        </SettingRow>
      </Section>

      {/* System info */}
      <Section title="Información del sistema" icon={Database}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {[
            { label: "Versión", value: "1.0.0" },
            { label: "Entorno", value: process.env.NODE_ENV || "development" },
            { label: "Base de datos", value: "PostgreSQL (Supabase)" },
            { label: "Framework", value: "Next.js 15 + Turbopack" },
            { label: "ORM", value: "Prisma" },
            { label: "Auth", value: "NextAuth.js (JWT)" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-zinc-500 text-xs">{item.label}</p>
              <p className="text-white font-medium mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
