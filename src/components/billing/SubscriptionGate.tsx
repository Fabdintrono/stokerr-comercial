'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSubscription } from './SubscriptionProvider'

const ALLOW = ['/billing', '/login', '/select-business']

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { sub, loading } = useSubscription()
  const pathname = usePathname()
  const router = useRouter()
  const exempt = ALLOW.some(p => pathname?.startsWith(p)) || pathname?.startsWith('/super-admin')

  useEffect(() => {
    if (!loading && sub?.status === 'EXPIRED' && !exempt) router.replace('/billing')
  }, [loading, sub, exempt, router])

  return (
    <>
      {sub?.status === 'GRACE' && !exempt && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-sm px-4 py-2 text-center">
          Tu suscripción venció. Paga antes de que termine el período de gracia para no perder acceso.{' '}
          <a href="/billing" className="underline font-medium">Pagar ahora</a>
        </div>
      )}
      {children}
    </>
  )
}
