import { describe, it, expect, vi } from 'vitest'
import Decimal from 'decimal.js'
import { makeRateLoader } from './loadRates'

const fakePrisma = {
  exchangeRate: {
    findFirst: vi.fn().mockResolvedValue({ rate: new Decimal('0.025') }),
  },
} as any

describe('makeRateLoader', () => {
  it('queries latest rate on/before date for a business', async () => {
    const load = makeRateLoader(fakePrisma, 'biz_1')
    const r = await load('VES', new Date('2026-07-15'))
    expect(r?.toString()).toBe('0.025')
    expect(fakePrisma.exchangeRate.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ businessId: 'biz_1', currency: 'VES' }),
      orderBy: { date: 'desc' },
    }))
  })
})
