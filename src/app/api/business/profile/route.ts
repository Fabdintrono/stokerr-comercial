import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function bid(req: NextRequest) { return req.headers.get('X-Business-Id') || req.cookies.get('businessId')?.value }
const schema = z.object({
  logoUrl: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  docPrefix: z.string().min(1),
  taxEnabled: z.boolean(),
  defaultTaxRate: z.number().min(0),
  taxLabel: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions); if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = bid(req); if (!id) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const b = await prisma.business.findUnique({ where: { id }, select: { logoUrl: true, address: true, phone: true, taxId: true, docPrefix: true, taxEnabled: true, defaultTaxRate: true, taxLabel: true } })
  return NextResponse.json(b)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions); if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const id = bid(req); if (!id) return NextResponse.json({ error: 'no business' }, { status: 400 })
  const parsed = schema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  const updated = await prisma.business.update({ where: { id }, data: parsed.data })
  return NextResponse.json(updated)
}
