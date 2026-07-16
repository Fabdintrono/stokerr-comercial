'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n'

interface Customer { id?: string; name: string; taxId?: string; address?: string; phone?: string; email?: string }

export default function CustomersPage() {
  const { t } = useI18n()
  const [rows, setRows] = useState<Customer[]>([])
  const [draft, setDraft] = useState<Customer>({ name: '' })

  async function load() { setRows(await fetch('/api/customers').then(r => r.json())) }
  useEffect(() => { load() }, [])

  async function create() {
    if (!draft.name) return toast.error(t('invoicing.nameRequired'))
    const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
    if (res.ok) { toast.success(t('invoicing.customerCreated')); setDraft({ name: '' }); load() }
    else toast.error(t('common.errorSaving'))
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{t('invoicing.customers')}</h1>
      <div className="rounded-lg border border-border bg-card p-4 grid grid-cols-2 gap-3">
        {(['name', 'taxId', 'phone', 'address', 'email'] as const).map(f => (
          <input key={f} placeholder={f === 'name' ? t('invoicing.namePlaceholder') : f} value={(draft as any)[f] ?? ''}
            onChange={e => setDraft(d => ({ ...d, [f]: e.target.value }))}
            className="rounded-md bg-background border border-border p-2" />
        ))}
        <button onClick={create} className="rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium">{t('invoicing.add')}</button>
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {rows.length === 0 && <div className="p-4 text-muted-foreground">{t('invoicing.noCustomers')}</div>}
        {rows.map(c => (
          <div key={c.id} className="p-3 flex justify-between">
            <span className="text-foreground">{c.name}</span>
            <span className="text-muted-foreground text-sm">{c.taxId} {c.phone}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
