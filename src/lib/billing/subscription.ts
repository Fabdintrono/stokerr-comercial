import type { PrismaClient } from '@prisma/client'
import { nextPeriodEnd } from './period'

/** Idempotently apply a finished payment: extend the subscription's period by one month. */
export async function applyPayment(prisma: PrismaClient, providerPaymentId: string, now: Date): Promise<void> {
  await prisma.$transaction(async (tx: any) => {
    const payment = await tx.billingPayment.findUnique({ where: { providerPaymentId } })
    if (!payment) throw new Error('payment not found')
    if (payment.appliedAt) return // already applied — idempotent
    const sub = await tx.subscription.findUnique({ where: { id: payment.subscriptionId } })
    if (!sub) throw new Error('subscription not found')
    const newEnd = nextPeriodEnd(sub.currentPeriodEnd ?? null, now)
    await tx.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: newEnd, status: 'ACTIVE', lastPaymentAt: now } })
    await tx.billingPayment.update({ where: { id: payment.id }, data: { appliedAt: now, paidAt: now, status: 'finished' } })
  })
}
