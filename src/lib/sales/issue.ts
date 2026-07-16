import type { PrismaClient } from '@prisma/client'
import { formatDocNumber } from './docNumber'

export async function issueDocument(prisma: PrismaClient, orderId: string): Promise<{ docNumber: string; issuedAt: Date }> {
  return prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, docNumber: true, issuedAt: true, location: { select: { businessId: true } } },
    })
    if (!order) throw new Error('order not found')
    if (order.docNumber && order.issuedAt) return { docNumber: order.docNumber, issuedAt: order.issuedAt }
    const businessId = order.location.businessId
    const business = await tx.business.findUnique({ where: { id: businessId }, select: { docPrefix: true, docNextNumber: true } })
    const n = business.docNextNumber
    const docNumber = formatDocNumber(business.docPrefix, n)
    const issuedAt = new Date()
    await tx.business.update({ where: { id: businessId }, data: { docNextNumber: n + 1 } })
    await tx.order.update({ where: { id: orderId }, data: { docNumber, issuedAt } })
    return { docNumber, issuedAt }
  })
}
