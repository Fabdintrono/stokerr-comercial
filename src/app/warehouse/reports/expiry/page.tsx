'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface ExpiryItem {
  productName: string
  lotNumber: string
  locationName: string
  quantity: number
  expiryDate: string
  status: 'EXPIRED' | 'NEAR' | 'OK'
}

interface ExpirySummary {
  nearCount: number
  expiredCount: number
  nearQty: number
  expiredQty: number
}

type StatusFilter = 'ALL' | 'EXPIRED' | 'NEAR' | 'OK'

const STATUS_STYLES: Record<string, string> = {
  EXPIRED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  NEAR: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  OK: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
}

export default function ExpiryReportPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<ExpiryItem[]>([])
  const [summary, setSummary] = useState<ExpirySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('ALL')

  useEffect(() => {
    setLoading(true)
    fetch('/api/reports/expiry')
      .then(r => r.json())
      .then(d => {
        setItems(d.items ?? [])
        setSummary(d.summary ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? items : items.filter(i => i.status === filter)

  const filterButtons: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: t('common.filter') + ': ' + 'All' },
    { value: 'EXPIRED', label: t('batches.expired') },
    { value: 'NEAR', label: t('batches.near') },
    { value: 'OK', label: t('batches.ok') },
  ]

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-lg font-semibold text-white">{t('batches.expiryReport')}</h1>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-red-500/10">
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t('batches.expired')}</p>
              <p className="text-lg font-bold text-white">{summary.expiredCount}</p>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t('batches.near')}</p>
              <p className="text-lg font-bold text-white">{summary.nearCount}</p>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-red-500/10">
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t('batches.expired')} ({t('batches.quantity')})</p>
              <p className="text-lg font-bold text-white">{summary.expiredQty}</p>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-500/10">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{t('batches.near')} ({t('batches.quantity')})</p>
              <p className="text-lg font-bold text-white">{summary.nearQty}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex gap-1 flex-wrap">
        {filterButtons.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === value
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">{t('batches.product')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">{t('batches.lotNumber')}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">{t('batches.location')}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">{t('batches.quantity')}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">{t('batches.expiryDate')}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400">{t('batches.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">{t('batches.noData')}</td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{item.productName}</td>
                    <td className="px-4 py-3 text-zinc-400">{item.lotNumber}</td>
                    <td className="px-4 py-3 text-zinc-400">{item.locationName}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLES[item.status] ?? ''}`}>
                        {item.status === 'EXPIRED' ? t('batches.expired')
                          : item.status === 'NEAR' ? t('batches.near')
                          : t('batches.ok')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
