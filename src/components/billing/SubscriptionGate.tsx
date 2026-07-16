'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSubscription } from './SubscriptionProvider'
import { useI18n } from '@/lib/i18n'
import { formatDate } from '@/lib/i18n/format'

const ALLOW = ['/billing', '/login', '/select-business']

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { sub, loading } = useSubscription()
  const pathname = usePathname()
  const router = useRouter()
  const { t, locale } = useI18n()
  const exempt = ALLOW.some(p => pathname?.startsWith(p)) || pathname?.startsWith('/super-admin')

  useEffect(() => {
    if (!loading && sub?.status === 'EXPIRED' && !exempt) router.replace('/billing')
  }, [loading, sub, exempt, router])

  return (
    <>
      {sub?.status === 'GRACE' && !exempt && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-sm px-4 py-2 text-center">
          {sub.currentPeriodEnd
            ? t('billing.graceBanner', { date: formatDate(new Date(sub.currentPeriodEnd), locale) })
            : t('billing.expiredBanner')}{' '}
          <a href="/billing" className="underline font-medium">{t('billing.payNow')}</a>
        </div>
      )}
      {children}
    </>
  )
}
