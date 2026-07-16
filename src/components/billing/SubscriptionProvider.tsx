'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface SubSummary { status: 'ACTIVE' | 'GRACE' | 'EXPIRED'; plan: string; planPrice: string; addons: { name: string; price: string }[]; amount: string; currentPeriodEnd: string | null; graceDays: number }
interface Ctx { sub: SubSummary | null; loading: boolean; refresh: () => void }
const C = createContext<Ctx>({ sub: null, loading: true, refresh: () => {} })

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [sub, setSub] = useState<SubSummary | null>(null)
  const [loading, setLoading] = useState(true)
  function refresh() {
    fetch('/api/me/subscription').then(r => r.ok ? r.json() : null).then(d => setSub(d)).catch(() => setSub(null)).finally(() => setLoading(false))
  }
  useEffect(() => { refresh() }, [])
  return <C.Provider value={{ sub, loading, refresh }}>{children}</C.Provider>
}
export const useSubscription = () => useContext(C)
