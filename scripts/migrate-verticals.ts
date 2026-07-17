// scripts/migrate-verticals.ts
import { PrismaClient } from '@prisma/client'
import { decideVertical } from '../src/lib/modules/decideVertical'
import { applyVerticalPreset } from '../src/lib/modules/applyVerticalPreset'

const prisma = new PrismaClient()

async function main() {
  const businesses = await prisma.business.findMany({ select: { id: true, name: true, locations: { select: { type: true } } } })
  for (const b of businesses) {
    const vertical = decideVertical(b.locations)
    await prisma.business.update({ where: { id: b.id }, data: { vertical } })
    await applyVerticalPreset(prisma as any, b.id, vertical)
    console.log(`[verticals] ${b.name} → ${vertical}`)
  }
  console.log(`[verticals] done: ${businesses.length} businesses`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
