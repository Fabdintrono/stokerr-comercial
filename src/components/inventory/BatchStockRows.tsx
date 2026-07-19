'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'

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

interface Props {
  productId: string
  locationId: string
}

export function BatchStockRows({ productId, locationId }: Props) {
  const { t } = useI18n()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/batches?productId=${encodeURIComponent(productId)}`)
      if (!res.ok) return
      const data = await res.json()
      setBatches(data.batches ?? [])
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const locationBatches = batches
    .map(b => ({
      ...b,
      stock: b.inventory.find(i => i.locationId === locationId)?.quantity ?? 0,
    }))
    .filter(b => b.stock > 0)

  if (loading) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-2 text-xs text-zinc-500">{t('common.loading')}</td>
      </tr>
    )
  }

  if (locationBatches.length === 0) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-2 text-xs text-zinc-500 italic">{t('batches.noData')}</td>
      </tr>
    )
  }

  return (
    <>
      {locationBatches.map(b => (
        <tr key={b.id} className="bg-zinc-950/50 border-t border-zinc-800/50">
          <td className="px-4 py-2 pl-8 text-xs text-zinc-400">
            {t('batches.lotNumber')}: <span className="font-medium text-zinc-300">{b.lotNumber}</span>
          </td>
          <td className="px-4 py-2 text-xs text-zinc-400">
            {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
          </td>
          <td className="px-4 py-2 text-right text-xs font-mono text-zinc-300">{b.stock}</td>
          <td />
        </tr>
      ))}
    </>
  )
}
