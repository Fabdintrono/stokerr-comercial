'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useSubscription } from '@/components/billing/SubscriptionProvider'

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  GRACE: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  EXPIRED: 'text-red-400 bg-red-500/10 border-red-500/30',
}

export default function BillingPage() {
  const { sub, loading } = useSubscription()
  const [paying, setPaying] = useState(false)

  async function pay() {
    setPaying(true)
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const d = await res.json()
      if (res.ok && d.invoiceUrl) window.location.href = d.invoiceUrl
      else toast.error(d.error || 'Error al iniciar el pago')
    } finally { setPaying(false) }
  }

  if (loading) return <div className="min-h-screen bg-background p-8 text-muted-foreground">Cargando…</div>

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <img src="/stocker-icon.png" alt="Stocker" className="h-10 w-10 rounded-lg" />
          <h1 className="text-2xl font-semibold text-foreground">Mi suscripción</h1>
        </div>

        {sub && (
          <>
            <div className={`inline-flex rounded-full border px-3 py-1 text-sm ${STATUS_STYLE[sub.status]}`}>
              {sub.status === 'ACTIVE' ? 'Activa' : sub.status === 'GRACE' ? 'En gracia' : 'Vencida'}
            </div>

            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <div className="flex justify-between text-foreground"><span>Plan {sub.plan}</span><span>${sub.planPrice}</span></div>
              {sub.addons.map((a, i) => (
                <div key={i} className="flex justify-between text-muted-foreground text-sm"><span>+ {a.name}</span><span>${a.price}</span></div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between font-semibold text-foreground">
                <span>Total mensual</span><span>${sub.amount}</span>
              </div>
            </div>

            {sub.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">Próximo vencimiento: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
            )}

            <button onClick={pay} disabled={paying}
              className="w-full rounded-lg bg-primary py-3 text-primary-foreground font-medium disabled:opacity-60">
              {paying ? 'Redirigiendo…' : 'Pagar en USDT'}
            </button>
            <p className="text-center text-xs text-muted-foreground">Pago seguro en USDT (TRC-20) vía NOWPayments</p>
          </>
        )}
      </div>
    </div>
  )
}
