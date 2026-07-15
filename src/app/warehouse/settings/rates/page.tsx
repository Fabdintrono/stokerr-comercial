'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CurrencyCode = 'USD' | 'VES' | 'BRL'
type RateSource = 'AUTO_BCV' | 'AUTO_FOREX' | 'MANUAL'

interface ExchangeRate {
  id: string
  currency: CurrencyCode
  rate: string
  source: RateSource
  date: string
}

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: 'Dólar (USD)',
  VES: 'Bolívar (VES)',
  BRL: 'Real (BRL)',
}

const SOURCE_LABELS: Record<RateSource, string> = {
  AUTO_BCV: 'BCV',
  AUTO_FOREX: 'Forex',
  MANUAL: 'Manual',
}

const ALL_CURRENCIES: CurrencyCode[] = ['USD', 'VES', 'BRL']

export default function DailyRatesPage() {
  const [loading, setLoading] = useState(true)
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{ currency: CurrencyCode; rate: string }>({
    currency: 'VES',
    rate: '',
  })

  async function loadRates() {
    try {
      const res = await fetch('/api/rates')
      if (!res.ok) throw new Error('Error al cargar')
      const json = await res.json()
      setRates(json.data)
    } catch {
      toast.error('No se pudo cargar las tasas del día')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRates()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.rate || isNaN(Number(form.rate)) || Number(form.rate) <= 0) {
      toast.error('Ingresa una tasa válida mayor a cero')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: form.currency, rate: form.rate }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al guardar')
      toast.success(`Tasa ${form.currency} actualizada`)
      setForm((p) => ({ ...p, rate: '' }))
      await loadRates()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6" data-tour="daily-rates">
      <div>
        <h1 className="text-2xl font-bold text-white">Tasas del Día</h1>
        <p className="text-sm text-zinc-400">
          Consulta o sobreescribe manualmente la tasa de cambio de hoy
        </p>
      </div>

      {/* Current rates table */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Tasas actuales (hoy)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded bg-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : rates.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">
              No hay tasas registradas para hoy. Agrega una manualmente.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-800">
                  <th className="pb-2 text-left font-medium">Moneda</th>
                  <th className="pb-2 text-right font-medium">Tasa (vs USD base)</th>
                  <th className="pb-2 text-right font-medium">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800 last:border-0">
                    <td className="py-3 text-white font-medium">
                      {CURRENCY_LABELS[r.currency] ?? r.currency}
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-mono">
                      {r.rate}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          r.source === 'MANUAL'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {SOURCE_LABELS[r.source] ?? r.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Override form */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-400" />
            Sobrescribir tasa manualmente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-zinc-300">Moneda</Label>
                <div className="flex gap-2 flex-wrap">
                  {ALL_CURRENCIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, currency: c }))}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                        form.currency === c
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate-input" className="text-zinc-300">
                  Tasa (valor en {form.currency} por 1 USD base)
                </Label>
                <Input
                  id="rate-input"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="ej. 36.50"
                  value={form.rate}
                  onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={saving || !form.rate}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saving ? 'Guardando…' : 'Guardar tasa'}
              </Button>
              <p className="text-xs text-zinc-500">
                Sobrescribe la tasa automática y la marca como &quot;Manual&quot;
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
