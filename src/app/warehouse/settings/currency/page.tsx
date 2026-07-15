'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { DollarSign, Globe, ToggleLeft, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { runTour } from '@/components/tour/TourProvider'
import { currencyTourSteps } from '@/components/tour/steps.currency'

type CurrencyCode = 'USD' | 'VES' | 'BRL'

interface CurrencySettings {
  baseCurrency: CurrencyCode
  secondaryCurrency: CurrencyCode | null
  enabledCurrencies: CurrencyCode[]
  multiCurrency: boolean
  rateSource: 'AUTO_BCV' | 'AUTO_FOREX' | 'MANUAL'
}

const ALL_CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'USD', label: 'Dólar estadounidense (USD)', symbol: '$' },
  { code: 'VES', label: 'Bolívar venezolano (VES)', symbol: 'Bs' },
  { code: 'BRL', label: 'Real brasileño (BRL)', symbol: 'R$' },
]

const RATE_SOURCE_LABELS: Record<CurrencySettings['rateSource'], string> = {
  AUTO_BCV: 'BCV (automático)',
  AUTO_FOREX: 'Forex (automático)',
  MANUAL: 'Manual',
}

export default function CurrencySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<CurrencySettings>({
    baseCurrency: 'USD',
    secondaryCurrency: null,
    enabledCurrencies: ['USD'],
    multiCurrency: false,
    rateSource: 'MANUAL',
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/business/currency')
        if (!res.ok) throw new Error('Error al cargar')
        const json = await res.json()
        setSettings(json.data)
      } catch {
        toast.error('No se pudo cargar la configuración de moneda')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function toggleEnabled(code: CurrencyCode) {
    setSettings((prev) => {
      const isEnabled = prev.enabledCurrencies.includes(code)
      // baseCurrency cannot be disabled
      if (isEnabled && code === prev.baseCurrency) return prev
      return {
        ...prev,
        enabledCurrencies: isEnabled
          ? prev.enabledCurrencies.filter((c) => c !== code)
          : [...prev.enabledCurrencies, code],
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/business/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al guardar')
      setSettings(json.data)
      toast.success('Configuración de moneda guardada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <div className="h-7 w-48 rounded bg-zinc-800 animate-pulse" />
          <div className="h-4 w-64 rounded bg-zinc-800 animate-pulse mt-2" />
        </div>
        <div className="h-48 rounded-lg bg-zinc-800 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6" data-tour="currency-settings">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración de Moneda</h1>
          <p className="text-sm text-zinc-400">
            Define la moneda base, secundaria y las tasas de cambio de tu negocio
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => runTour(currencyTourSteps)}
          className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2"
        >
          <BookOpen className="h-4 w-4" />
          Ver tour
        </Button>
      </div>

      {/* Multi-currency toggle */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ToggleLeft className="h-4 w-4 text-emerald-400" />
            Multi-moneda
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-white">Habilitar multi-moneda</p>
            <p className="text-xs text-zinc-400">
              Muestra precios en la moneda base y secundaria simultáneamente
            </p>
          </div>
          <Switch
            checked={settings.multiCurrency}
            onCheckedChange={(v) => setSettings((p) => ({ ...p, multiCurrency: v }))}
            className="data-[state=checked]:bg-emerald-500"
          />
        </CardContent>
      </Card>

      {/* Base & secondary currency */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Moneda base y secundaria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-zinc-300">Moneda base</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_CURRENCIES.filter((c) =>
                settings.enabledCurrencies.includes(c.code)
              ).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() =>
                    setSettings((p) => ({ ...p, baseCurrency: c.code }))
                  }
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    settings.baseCurrency === c.code
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              La moneda base es la referencia principal para todos los precios
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Moneda secundaria</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setSettings((p) => ({ ...p, secondaryCurrency: null }))
                }
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  settings.secondaryCurrency === null
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                Ninguna
              </button>
              {ALL_CURRENCIES.filter(
                (c) =>
                  settings.enabledCurrencies.includes(c.code) &&
                  c.code !== settings.baseCurrency
              ).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() =>
                    setSettings((p) => ({ ...p, secondaryCurrency: c.code }))
                  }
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    settings.secondaryCurrency === c.code
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Se muestra junto a la base en la vista dual (muted)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Enabled currencies */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-400" />
            Monedas habilitadas
          </CardTitle>
        </CardHeader>
        <CardContent data-tour="enabled-currencies">
          <div className="space-y-3">
            {ALL_CURRENCIES.map((c) => {
              const enabled = settings.enabledCurrencies.includes(c.code)
              const isBase = settings.baseCurrency === c.code
              return (
                <div
                  key={c.code}
                  className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {c.label}
                      {isBase && (
                        <span className="ml-2 text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          base
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400">Símbolo: {c.symbol}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={isBase}
                    onCheckedChange={() => toggleEnabled(c.code)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              )
            })}
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            La moneda base no puede deshabilitarse
          </p>
        </CardContent>
      </Card>

      {/* Rate source */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Fuente de tasas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(
              ['AUTO_BCV', 'AUTO_FOREX', 'MANUAL'] as const
            ).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setSettings((p) => ({ ...p, rateSource: src }))}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  settings.rateSource === src
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                {RATE_SOURCE_LABELS[src]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
