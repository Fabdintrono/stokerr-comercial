export type BatchStatus = 'EXPIRED' | 'NEAR' | 'OK'

export function batchStatus(expiryDate: Date, today: Date, expiryAlertDays: number): BatchStatus {
  const day = 24 * 60 * 60 * 1000
  const diffDays = Math.floor((expiryDate.getTime() - today.getTime()) / day)
  if (diffDays < 0) return 'EXPIRED'
  if (diffDays <= expiryAlertDays) return 'NEAR'
  return 'OK'
}
