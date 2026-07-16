export type SubStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED'

export function deriveStatus(currentPeriodEnd: Date | null, graceDays: number, now: Date): SubStatus {
  if (!currentPeriodEnd) return 'EXPIRED'
  if (now.getTime() <= currentPeriodEnd.getTime()) return 'ACTIVE'
  const graceEnd = currentPeriodEnd.getTime() + graceDays * 24 * 60 * 60 * 1000
  if (now.getTime() <= graceEnd) return 'GRACE'
  return 'EXPIRED'
}
