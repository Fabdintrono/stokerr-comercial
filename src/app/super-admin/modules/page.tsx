"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Package } from "lucide-react";
import toast from "react-hot-toast";
import { MODULE_KEYS, MODULE_REGISTRY } from "@/lib/modules/registry";
import type { ModuleKey } from "@/lib/modules/registry";
import { useI18n } from "@/lib/i18n";

const PLANS = ["STARTER", "GROWTH", "ENTERPRISE"] as const;
type Plan = (typeof PLANS)[number];

interface ModuleConfig {
  key: ModuleKey;
  label: string;
  description: string;
  active: boolean;
  addOnPrice: number;
  priceCurrency: "USD" | "VES" | "BRL";
  includedInPlans: Plan[];
  status?: string;
}

export default function SuperAdminModulesPage() {
  const [configs, setConfigs] = useState<ModuleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ModuleKey | null>(null);
  const { t } = useI18n();

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/modules");
      if (!res.ok) throw new Error();
      const data = await res.json();
      // data is an array or record — normalise to array
      const raw: ModuleConfig[] = Array.isArray(data) ? data : Object.values(data);
      // Ensure every registry key is present
      const merged: ModuleConfig[] = MODULE_KEYS.map((k) => {
        const found = raw.find((r) => r.key === k);
        return (
          found ?? {
            key: k,
            label: MODULE_REGISTRY[k].label,
            description: MODULE_REGISTRY[k].description,
            active: true,
            addOnPrice: 0,
            priceCurrency: "USD" as const,
            includedInPlans: [],
          }
        );
      });
      setConfigs(merged);
    } catch {
      toast.error(t('modules.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const updateLocal = (key: ModuleKey, patch: Partial<ModuleConfig>) => {
    setConfigs((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c))
    );
  };

  const togglePlan = (key: ModuleKey, plan: Plan) => {
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        const has = c.includedInPlans.includes(plan);
        return {
          ...c,
          includedInPlans: has
            ? c.includedInPlans.filter((p) => p !== plan)
            : [...c.includedInPlans, plan],
        };
      })
    );
  };

  const saveModule = async (cfg: ModuleConfig) => {
    setSaving(cfg.key);
    try {
      const res = await fetch("/api/admin/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: cfg.key,
          active: cfg.active,
          addOnPrice: Number(cfg.addOnPrice),
          priceCurrency: cfg.priceCurrency,
          includedInPlans: cfg.includedInPlans,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('modules.updated'));
    } catch {
      toast.error(t('modules.saveError'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('modules.title')}</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {t('modules.configDesc')}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid gap-4">
          {configs.map((cfg) => (
            <Card key={cfg.key} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: icon + info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{cfg.label}</span>
                        {cfg.status === 'COMING_SOON' && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{t('modules.comingSoon')}</span>
                        )}
                        <code className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {cfg.key}
                        </code>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{cfg.description}</p>
                    </div>
                  </div>

                  {/* Right: active toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-zinc-500">{t('modules.active')}</span>
                    <Switch
                      checked={cfg.active}
                      onCheckedChange={(v) => updateLocal(cfg.key, { active: v })}
                    />
                  </div>
                </div>

                {/* Config row */}
                <div className="mt-4 flex flex-wrap items-end gap-4">
                  {/* Price */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">{t('modules.addonPrice')}</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={cfg.addOnPrice}
                      onChange={(e) =>
                        updateLocal(cfg.key, { addOnPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-28 h-8 text-xs bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </div>

                  {/* Currency */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">{t('modules.currency')}</span>
                    <div className="flex gap-1">
                      {(["USD", "VES", "BRL"] as const).map((c) => (
                        <button
                          key={c}
                          onClick={() => updateLocal(cfg.key, { priceCurrency: c })}
                          className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
                            cfg.priceCurrency === c
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Plans */}
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">{t('modules.includedInPlans')}</span>
                    <div className="flex gap-2 flex-wrap">
                      {PLANS.map((plan) => (
                        <label key={plan} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cfg.includedInPlans.includes(plan)}
                            onChange={() => togglePlan(cfg.key, plan)}
                            className="w-3.5 h-3.5 accent-emerald-500"
                          />
                          <span className="text-xs text-zinc-300">{plan}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Save */}
                  <Button
                    size="sm"
                    onClick={() => saveModule(cfg)}
                    disabled={saving === cfg.key}
                    className="h-8 bg-emerald-500 hover:bg-emerald-600 text-xs ml-auto"
                  >
                    {saving === cfg.key ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    {t('common.save')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
