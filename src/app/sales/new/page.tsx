'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/components/providers/AuthProvider'
import { useI18n } from '@/lib/i18n'
import { variantDisplayName } from '@/lib/variants/displayName'
import { effectivePrice } from '@/lib/variants/pricing'

interface Variant { id: string; attributes: Record<string, string>; sku?: string | null; salePrice?: string | null }
interface Line { productId: string; description: string; quantity: number; unitPrice: number; variantId?: string }

export default function NewInvoicePage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [customers, setCustomers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customerId, setCustomerId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [lines, setLines] = useState<Line[]>([])

  // Variant picker state
  const [pendingProduct, setPendingProduct] = useState<any | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState('')

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
    fetch('/api/locations').then(r => r.json()).then(d => { const l = Array.isArray(d) ? d : (d.locations ?? []); setLocations(l); if (l[0]) setLocationId(l[0].id) })
    fetch('/api/products?locationType=WAREHOUSE').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : (d.products ?? [])))
  }, [])

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

  function addLine(p: any) {
    if (p.hasVariants) {
      setPendingProduct(p)
      setSelectedVariantId('')
      setVariants([])
      setVariantsLoading(true)
      fetch(`/api/variants?productId=${p.id}`)
        .then(r => r.json())
        .then(d => { setVariants(d.variants ?? []); setVariantsLoading(false) })
        .catch(() => setVariantsLoading(false))
      return
    }
    setLines(ls => [...ls, { productId: p.id, description: p.name, quantity: 1, unitPrice: Number(p.salePrice) }])
  }

  function confirmVariant() {
    if (!pendingProduct || !selectedVariantId) return
    const variant = variants.find(v => v.id === selectedVariantId)
    if (!variant) return
    const price = Number(effectivePrice(variant, { salePrice: String(pendingProduct.salePrice) }))
    const label = `${pendingProduct.name} — ${variantDisplayName(variant.attributes)}${variant.sku ? ` (${variant.sku})` : ''}`
    setLines(ls => [...ls, { productId: pendingProduct.id, variantId: variant.id, description: label, quantity: 1, unitPrice: price }])
    setPendingProduct(null)
    setSelectedVariantId('')
    setVariants([])
  }

  async function emit() {
    if (!locationId || lines.length === 0) return toast.error(t('invoicing.chooseLocationAndItems'))
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationId, userId: user?.id, customerId: customerId || undefined,
        items: lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, ...(l.variantId ? { variantId: l.variantId } : {}) })),
      }),
    })
    if (!res.ok) return toast.error(t('invoicing.emitError'))
    const order = await res.json()
    window.open(`/api/sales/${order.id}/pdf`, '_blank')
    toast.success(t('invoicing.voucherEmitted')); setLines([])
  }

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <h1 className="text-2xl font-semibold text-foreground">{t('invoicing.newInvoice')}</h1>
      <div className="flex gap-3">
        <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="flex-1 rounded-md bg-card border border-border p-2">
          <option value="">{t('invoicing.customerOptional')}</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={locationId} onChange={e => setLocationId(e.target.value)} className="flex-1 rounded-md bg-card border border-border p-2">
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="text-sm text-muted-foreground mb-2">{t('invoicing.addProduct')}</div>
        <div className="flex flex-wrap gap-2">
          {products.slice(0, 30).map(p => (
            <button key={p.id} onClick={() => addLine(p)} className="rounded-md border border-border px-3 py-1 text-sm text-foreground">{p.name}</button>
          ))}
        </div>
      </div>

      {/* Variant picker modal */}
      {pendingProduct && (
        <div className="rounded-lg border border-primary bg-card p-4 space-y-3">
          <div className="font-medium text-foreground">{pendingProduct.name} — {t('variants.selectVariant')}</div>
          {variantsLoading ? (
            <div className="text-sm text-muted-foreground">…</div>
          ) : (
            <select
              value={selectedVariantId}
              onChange={e => setSelectedVariantId(e.target.value)}
              className="w-full rounded-md bg-background border border-border p-2"
            >
              <option value="">{t('variants.selectVariant')}</option>
              {variants.map(v => {
                const price = Number(effectivePrice(v, { salePrice: String(pendingProduct.salePrice) }))
                const label = variantDisplayName(v.attributes) + (v.sku ? ` · ${v.sku}` : '') + ` — ${price.toFixed(2)}`
                return <option key={v.id} value={v.id}>{label}</option>
              })}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={confirmVariant}
              disabled={!selectedVariantId}
              className="rounded-md bg-primary px-4 py-1.5 text-primary-foreground text-sm font-medium disabled:opacity-40"
            >
              {t('invoicing.addProduct')}
            </button>
            <button
              onClick={() => { setPendingProduct(null); setVariants([]); setSelectedVariantId('') }}
              className="rounded-md border border-border px-4 py-1.5 text-sm text-foreground"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {lines.map((l, i) => (
          <div key={i} className="p-3 flex items-center gap-3">
            <span className="flex-1 text-foreground">{l.description}</span>
            <input type="number" value={l.quantity} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))} className="w-20 rounded-md bg-background border border-border p-1" />
            <input type="number" value={l.unitPrice} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, unitPrice: Number(e.target.value) } : x))} className="w-24 rounded-md bg-background border border-border p-1" />
            <span className="w-24 text-right text-foreground">{(l.quantity * l.unitPrice).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold text-foreground">{t('invoicing.totalLabel', { amount: total.toFixed(2) })}</span>
        <button onClick={emit} className="rounded-md bg-primary px-6 py-2 text-primary-foreground font-medium">{t('invoicing.emitVoucher')}</button>
      </div>
    </div>
  )
}
