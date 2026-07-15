import Decimal from 'decimal.js'
import type { PrismaClient } from '@prisma/client'
import { CurrencyCode } from '@/lib/currency'
import { RateLoader } from './rateEngine'

export function makeRateLoader(prisma: PrismaClient, businessId: string): RateLoader {
  return async (currency: CurrencyCode, date: Date) => {
    const row = await prisma.exchangeRate.findFirst({
      where: { businessId, currency: currency as any, date: { lte: date } },
      orderBy: { date: 'desc' },
    })
    return row ? new Decimal(row.rate.toString()) : null
  }
}
