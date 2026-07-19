import { PrismaClient, BusinessVertical, Plan, Role, BusinessRole, SubscriptionStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { applyVerticalPreset } from '../src/lib/modules/applyVerticalPreset'

const prisma = new PrismaClient()

const TESTS = [
  {
    name: 'Ferretería El Tornillo',
    slug: 'ferreteria-tornillo',
    vertical: 'HARDWARE' as BusinessVertical,
    email: 'ferreteria@stocker.pt',
    locationName: 'Depósito Principal',
  },
  {
    name: 'Depósito Mayorista Central',
    slug: 'deposito-central',
    vertical: 'WHOLESALE' as BusinessVertical,
    email: 'deposito@stocker.pt',
    locationName: 'Depósito Principal',
  },
  {
    name: 'Farmacia San Rafael',
    slug: 'farmacia-sanrafael',
    vertical: 'PHARMACY' as BusinessVertical,
    email: 'farmacia@stocker.pt',
    locationName: 'Almacén Principal',
  },
]

async function main() {
  const password = await bcrypt.hash('test123', 10)
  const periodEnd = new Date('2027-07-18')

  for (const t of TESTS) {
    // 1. Upsert Business
    const business = await prisma.business.upsert({
      where: { slug: t.slug },
      update: { vertical: t.vertical, plan: Plan.GROWTH, active: true },
      create: {
        name: t.name,
        slug: t.slug,
        plan: Plan.GROWTH,
        vertical: t.vertical,
        active: true,
      },
    })

    // 2. Upsert User
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: `${t.name} Admin`, role: Role.WAREHOUSE_MANAGER, active: true },
      create: {
        email: t.email,
        name: `${t.name} Admin`,
        password,
        role: Role.WAREHOUSE_MANAGER,
        active: true,
        language: 'es',
      },
    })

    // 3. Upsert UserBusiness (unique: userId + businessId)
    await prisma.userBusiness.upsert({
      where: { userId_businessId: { userId: user.id, businessId: business.id } },
      update: { role: BusinessRole.OWNER },
      create: {
        userId: user.id,
        businessId: business.id,
        role: BusinessRole.OWNER,
      },
    })

    // 4. Location — create if not exists
    const existingLocation = await prisma.location.findFirst({
      where: { businessId: business.id, name: t.locationName },
    })
    if (!existingLocation) {
      await prisma.location.create({
        data: {
          name: t.locationName,
          type: 'WAREHOUSE',
          isActive: true,
          businessId: business.id,
        },
      })
    }

    // 5. Apply vertical preset (idempotent via upsert inside)
    await applyVerticalPreset(prisma, business.id, t.vertical)

    // 6. Upsert Subscription (unique: businessId)
    await prisma.subscription.upsert({
      where: { businessId: business.id },
      update: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: periodEnd },
      create: {
        businessId: business.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: periodEnd,
        graceDays: 5,
      },
    })

    console.log(`✓ ${t.name} | vertical: ${t.vertical} | login: ${t.email} / test123`)
  }

  console.log('\nDone. 3 test businesses seeded.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
