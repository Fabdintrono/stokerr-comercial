import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function superAdmin() {
  const s = await getServerSession(authOptions)
  return s && s.user.role === 'SUPER_ADMIN' ? s : null
}
const schema = z.object({ plan: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']), monthlyPrice: z.number().min(0) })

export async function GET() {
  if (!(await superAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json(await prisma.planPrice.findMany({ orderBy: { plan: 'asc' } }))
}
export async function PUT(req: NextRequest) {
  if (!(await superAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const updated = await prisma.planPrice.upsert({
    where: { plan: parsed.data.plan },
    update: { monthlyPrice: parsed.data.monthlyPrice },
    create: { plan: parsed.data.plan, monthlyPrice: parsed.data.monthlyPrice },
  })
  return NextResponse.json(updated)
}
