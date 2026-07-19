'use client'

import { useEffect, useState } from 'react'
import { variantDisplayName } from '@/lib/variants/displayName'
import { useI18n } from '@/lib/i18n'

interface VariantStock {
  id: string
  attributes: Record<string, string>
  sku: string | null
  quantity: number
}

interface Props {
  productId: string
  locationId: string
}

export function VariantStockRows({ productId, locationId }: Props) {
  const { t } = useI18n()
  const [variants, setVariants] = useState<VariantStock[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setVariants(null)
    setError(null)
    fetch(
      `/api/inventory/variants?productId=${encodeURIComponent(productId)}&locationId=${encodeURIComponent(locationId)}`
    )
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json()
      })
      .then((data: { variants: VariantStock[] }) => setVariants(data.variants))
      .catch(() => setError(t('common.errorLoading')))
  }, [productId, locationId, t])

  if (error) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-1 text-xs text-red-400 italic">
          {error}
        </td>
      </tr>
    )
  }

  if (!variants) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-1 text-xs text-zinc-500 italic">
          {t('common.loading')}
        </td>
      </tr>
    )
  }

  if (variants.length === 0) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-1 text-xs text-zinc-500 italic">
          {t('variants.noVariants')}
        </td>
      </tr>
    )
  }

  return (
    <>
      {variants.map((v) => (
        <tr key={v.id} className="bg-zinc-900/50">
          <td className="pl-8 pr-2 py-1 text-xs text-zinc-300">
            <span className="text-zinc-500 mr-1">↳</span>
            {variantDisplayName(v.attributes)}
          </td>
          <td className="px-2 py-1 text-xs text-zinc-500">
            {v.sku ?? '—'}
          </td>
          <td className="px-2 py-1 text-xs text-zinc-400 text-right">
            {v.quantity}
          </td>
          <td />
        </tr>
      ))}
    </>
  )
}
