import type { PrismaClient } from '@prisma/client'
import { formatDocNumber } from './docNumber'
import { adjustStock } from '@/lib/inventory/adjustStock'

export async function issueDocument(prisma: PrismaClient, orderId: string): Promise<{ docNumber: string; issuedAt: Date }> {
  return prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        docNumber: true,
        issuedAt: true,
        userId: true,
        locationId: true,
        location: { select: { businessId: true } },
        items: { select: { productId: true, variantId: true, quantity: true } },
      },
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

    // Decrement stock for each line item (first issuance only).
    // Skip products that have a recipe — their ingredients are decremented by the kitchen route.
    const userId = order.userId
    for (const item of order.items ?? []) {
      const hasRecipe = await tx.recipe.findFirst({ where: { productId: item.productId } })
      if (hasRecipe) continue
      await adjustStock(tx, {
        productId: item.productId,
        variantId: item.variantId ?? null,
        locationId: order.locationId,
        delta: -item.quantity,
        type: 'OUT',
        userId,
      })
    }

    return { docNumber, issuedAt }
  })
}
