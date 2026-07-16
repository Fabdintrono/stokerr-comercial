import { describe, it, expect, vi } from 'vitest'
import { applyPayment } from './subscription'

function prismaMock(payment: any, sub: any) {
  const db = {
    billingPayment: {
      findUnique: vi.fn().mockResolvedValue(payment),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...payment, ...data })),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(sub),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...sub, ...data })),
    },
  }
  return { $transaction: (fn: any) => fn(db), _db: db } as any
}

describe('applyPayment', () => {
  it('extends the period once for a finished payment', async () => {
    const prisma = prismaMock(
      { id: 'p1', subscriptionId: 's1', appliedAt: null },
      { id: 's1', currentPeriodEnd: null },
    )
    await applyPayment(prisma, 'nowpid', new Date('2026-07-20T00:00:00Z'))
    expect(prisma._db.subscription.update).toHaveBeenCalled()
  })
  it('is idempotent: already-applied payment does not extend again', async () => {
    const prisma = prismaMock(
      { id: 'p1', subscriptionId: 's1', appliedAt: new Date('2026-07-01T00:00:00Z') },
      { id: 's1', currentPeriodEnd: new Date('2026-08-01T00:00:00Z') },
    )
    await applyPayment(prisma, 'nowpid', new Date('2026-07-20T00:00:00Z'))
    expect(prisma._db.subscription.update).not.toHaveBeenCalled()
  })
})
