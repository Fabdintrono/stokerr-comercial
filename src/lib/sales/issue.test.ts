import { describe, it, expect, vi } from 'vitest'
import { issueDocument } from './issue'

function makePrisma(order: any) {
  const tx = {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...order, ...data })),
    },
    business: {
      findUnique: vi.fn().mockResolvedValue({ docPrefix: 'F-', docNextNumber: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
  }
  return { $transaction: (fn: any) => fn(tx), _tx: tx } as any
}

describe('issueDocument', () => {
  it('assigns the tenant next number formatted with prefix', async () => {
    const prisma = makePrisma({ id: 'o1', docNumber: null, issuedAt: null, location: { businessId: 'b1' } })
    const r = await issueDocument(prisma, 'o1')
    expect(r.docNumber).toBe('F-000001')
    expect(prisma._tx.business.update).toHaveBeenCalled()
  })
  it('is idempotent: an already-issued order keeps its number', async () => {
    const prisma = makePrisma({ id: 'o1', docNumber: 'F-000005', issuedAt: new Date('2026-01-01'), location: { businessId: 'b1' } })
    const r = await issueDocument(prisma, 'o1')
    expect(r.docNumber).toBe('F-000005')
    expect(prisma._tx.business.update).not.toHaveBeenCalled()
  })
})
