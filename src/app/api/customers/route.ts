import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function businessId(req: NextRequest) {
  return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value
}
const schema = z.object({
  name: z.string().min(1),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = businessId(req)
  if (!id) return NextResponse.json([])
  const customers = await prisma.customer.findMany({ where: { businessId: id, isActive: true }, orderBy: { name: 'asc' } })
  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = businessId(req)
  if (!id) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const created = await prisma.customer.create({ data: { ...parsed.data, businessId: id } })
  return NextResponse.json(created, { status: 201 })
}
