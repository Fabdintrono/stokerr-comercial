'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { ModuleGate } from '@/components/modules/ModuleGate'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BatchInventoryItem {
  locationId: string
  quantity: number
}

interface Batch {
  id: string
  lotNumber: string
  expiryDate: string
  inventory: BatchInventoryItem[]
}

function BatchToggleInner({ productId }: { productId: string }) {
  const { t } = useI18n()
  const [batches, setBatches] = useState<Batch[]>([])
  const [hasBatches, setHasBatches] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editExpiry, setEditExpiry] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/batches?productId=${encodeURIComponent(productId)}`)
      if (!res.ok) throw new Error('fetch error')
      const data = await res.json()
      setBatches(data.batches ?? [])
    } catch {
      toast.error(t('common.errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [productId, t])

  // Fetch product hasBatches state from the batch list presence (we infer from a product endpoint)
  // Since the batches API only returns batches, we fetch to populate the list and rely on a separate product call
  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (!res.ok) return
      const data = await res.json()
      setHasBatches(data.product?.hasBatches ?? false)
    } catch {
      // ignore — toggle will still work
    }
  }, [productId])

  useEffect(() => {
    Promise.all([fetchBatches(), fetchProduct()])
  }, [fetchBatches, fetchProduct])

  async function handleToggle(next: boolean) {
    setToggling(true)
    setToggleError(null)
    try {
      const res = await fetch('/api/batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, hasBatches: next }),
      })
      if (res.status === 409) {
        setToggleError(t('batches.cannotWithVariants'))
        return
      }
      if (!res.ok) throw new Error('toggle error')
      const data = await res.json()
      setHasBatches(data.product?.hasBatches ?? next)
      toast.success(t('common.save'))
    } catch {
      toast.error(t('common.errorSaving'))
    } finally {
      setToggling(false)
    }
  }

  function startEdit(b: Batch) {
    setEditingId(b.id)
    const d = b.expiryDate ? new Date(b.expiryDate).toISOString().slice(0, 10) : ''
    setEditExpiry(d)
  }

  async function handlePatchBatch(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/batches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryDate: editExpiry }),
      })
      if (!res.ok) throw new Error('patch error')
      toast.success(t('common.save'))
      setEditingId(null)
      await fetchBatches()
    } catch {
      toast.error(t('common.errorSaving'))
    } finally {
      setSaving(false)
    }
  }

  function totalStock(b: Batch) {
    return b.inventory.reduce((s, i) => s + i.quantity, 0)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-white">{t('batches.manageLots')}</h3>

      {/* Toggle */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-200">{t('batches.manageLots')}</p>
          {toggleError && (
            <p className="text-xs text-red-400 mt-1">{toggleError}</p>
          )}
        </div>
        <button
          type="button"
          disabled={toggling || hasBatches === null}
          onClick={() => handleToggle(!hasBatches)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
            hasBatches ? 'bg-emerald-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              hasBatches ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Batch list */}
      {loading ? (
        <p className="text-sm text-zinc-400">{t('common.loading')}</p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">{t('batches.noData')}</p>
      ) : (
        <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
          {batches.map(b => (
            <div key={b.id} className="px-4 py-3 bg-zinc-900">
              {editingId === b.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-300">{t('batches.lotNumber')}: {b.lotNumber}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={editExpiry}
                      onChange={e => setEditExpiry(e.target.value)}
                      className="w-48"
                    />
                    <Button size="sm" onClick={() => handlePatchBatch(b.id)} disabled={saving}>
                      {saving ? t('common.saving') : t('common.save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {t('batches.lotNumber')}: {b.lotNumber}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {t('batches.expiryDate')}: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
                      {' · '}
                      {t('batches.quantity')}: {totalStock(b)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => startEdit(b)}>
                    {t('common.edit')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function BatchToggle({ productId }: { productId: string }) {
  return (
    <ModuleGate module="BATCHES">
      <BatchToggleInner productId={productId} />
    </ModuleGate>
  )
}
