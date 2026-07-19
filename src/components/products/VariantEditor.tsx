'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { ModuleGate } from '@/components/modules/ModuleGate'
import { variantDisplayName } from '@/lib/variants/displayName'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ProductVariant {
  id: string
  productId: string
  attributes: Record<string, string>
  sku: string | null
  barcode: string | null
  costPrice: number | null
  salePrice: number | null
  isActive: boolean
  createdAt: string
}

interface AttributePair {
  name: string
  value: string
}

interface EditState {
  sku: string
  salePrice: string
  costPrice: string
}

function VariantEditorInner({ productId }: { productId: string }) {
  const { t } = useI18n()
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Add-form state
  const [attrPairs, setAttrPairs] = useState<AttributePair[]>([{ name: '', value: '' }])
  const [newSku, setNewSku] = useState('')
  const [newSalePrice, setNewSalePrice] = useState('')
  const [newCostPrice, setNewCostPrice] = useState('')

  // Edit state per variant
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ sku: '', salePrice: '', costPrice: '' })

  const fetchVariants = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/variants?productId=${encodeURIComponent(productId)}`)
      if (!res.ok) throw new Error('fetch error')
      const data = await res.json()
      setVariants(data.variants ?? [])
    } catch {
      toast.error(t('common.errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [productId, t])

  useEffect(() => {
    fetchVariants()
  }, [fetchVariants])

  function addAttrPair() {
    setAttrPairs(prev => [...prev, { name: '', value: '' }])
  }

  function updateAttrPair(index: number, field: 'name' | 'value', val: string) {
    setAttrPairs(prev => prev.map((p, i) => i === index ? { ...p, [field]: val } : p))
  }

  function removeAttrPair(index: number) {
    setAttrPairs(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const attributes: Record<string, string> = {}
    for (const pair of attrPairs) {
      if (pair.name.trim() && pair.value.trim()) {
        attributes[pair.name.trim()] = pair.value.trim()
      }
    }
    if (Object.keys(attributes).length === 0) return

    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { productId, attributes }
      if (newSku.trim()) body.sku = newSku.trim()
      if (newSalePrice.trim()) body.salePrice = parseFloat(newSalePrice)
      if (newCostPrice.trim()) body.costPrice = parseFloat(newCostPrice)

      const res = await fetch('/api/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('create error')
      toast.success(t('common.save'))
      setAttrPairs([{ name: '', value: '' }])
      setNewSku('')
      setNewSalePrice('')
      setNewCostPrice('')
      await fetchVariants()
    } catch {
      toast.error(t('common.errorSaving'))
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(v: ProductVariant) {
    setEditingId(v.id)
    setEditState({
      sku: v.sku ?? '',
      salePrice: v.salePrice != null ? String(v.salePrice) : '',
      costPrice: v.costPrice != null ? String(v.costPrice) : '',
    })
  }

  async function handlePatch(id: string) {
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {}
      body.sku = editState.sku.trim() || null
      if (editState.salePrice.trim()) body.salePrice = parseFloat(editState.salePrice)
      else body.salePrice = null
      if (editState.costPrice.trim()) body.costPrice = parseFloat(editState.costPrice)
      else body.costPrice = null

      const res = await fetch(`/api/variants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('patch error')
      toast.success(t('common.save'))
      setEditingId(null)
      await fetchVariants()
    } catch {
      toast.error(t('common.errorSaving'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm(t('variants.deactivate') + '?')) return
    try {
      const res = await fetch(`/api/variants/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete error')
      await fetchVariants()
    } catch {
      toast.error(t('common.errorSaving'))
    }
  }

  const activeVariants = variants.filter(v => v.isActive)

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-white">{t('variants.title')}</h3>

      {/* Variant list */}
      {loading ? (
        <p className="text-sm text-zinc-400">{t('common.loading')}</p>
      ) : activeVariants.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">{t('variants.noVariants')}</p>
      ) : (
        <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
          {activeVariants.map(v => (
            <div key={v.id} className="px-4 py-3 bg-zinc-900">
              {editingId === v.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-300">{variantDisplayName(v.attributes)}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder={t('variants.sku')}
                      value={editState.sku}
                      onChange={e => setEditState(s => ({ ...s, sku: e.target.value }))}
                    />
                    <Input
                      type="number"
                      placeholder={t('variants.salePrice')}
                      value={editState.salePrice}
                      onChange={e => setEditState(s => ({ ...s, salePrice: e.target.value }))}
                    />
                    <Input
                      type="number"
                      placeholder={t('variants.costPrice')}
                      value={editState.costPrice}
                      onChange={e => setEditState(s => ({ ...s, costPrice: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handlePatch(v.id)} disabled={submitting}>
                      {t('variants.save')}
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
                      {variantDisplayName(v.attributes)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {v.sku ? `SKU: ${v.sku}` : ''}
                      {v.sku && (v.salePrice != null) ? ' · ' : ''}
                      {v.salePrice != null ? `${t('variants.salePrice')}: ${v.salePrice}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => startEdit(v)}>
                      {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeactivate(v.id)}>
                      {t('variants.deactivate')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add variant form */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
        <h4 className="text-sm font-semibold text-zinc-300">{t('variants.addVariant')}</h4>
        <form onSubmit={handleAdd} className="space-y-3">
          {/* Dynamic attribute pairs */}
          <div className="space-y-2">
            {attrPairs.map((pair, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  placeholder={t('variants.attributeName')}
                  value={pair.name}
                  onChange={e => updateAttrPair(idx, 'name', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder={t('variants.attributeValue')}
                  value={pair.value}
                  onChange={e => updateAttrPair(idx, 'value', e.target.value)}
                  className="flex-1"
                />
                {attrPairs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAttrPair(idx)}
                    className="text-zinc-500 hover:text-red-400 transition-colors text-lg leading-none px-1"
                    aria-label="remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={addAttrPair}>
            + {t('variants.addAttribute')}
          </Button>

          {/* Optional fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              placeholder={t('variants.sku')}
              value={newSku}
              onChange={e => setNewSku(e.target.value)}
            />
            <Input
              type="number"
              placeholder={t('variants.salePrice')}
              value={newSalePrice}
              onChange={e => setNewSalePrice(e.target.value)}
            />
            <Input
              type="number"
              placeholder={t('variants.costPrice')}
              value={newCostPrice}
              onChange={e => setNewCostPrice(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={submitting} size="sm">
            {submitting ? t('common.saving') : t('variants.save')}
          </Button>
        </form>
      </div>
    </div>
  )
}

export function VariantEditor({ productId }: { productId: string }) {
  return (
    <ModuleGate module="VARIANTS">
      <VariantEditorInner productId={productId} />
    </ModuleGate>
  )
}
