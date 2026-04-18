import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_SETTINGS: Record<string, string> = {
  'platform.name': 'Stocker',
  'platform.supportEmail': 'suporte@stocker.pt',
  'platform.maxTrialDays': '14',
  'billing.currency': 'EUR',
  'billing.priceStarter': '19.90',
  'billing.priceGrowth': '49.90',
  'billing.priceEnterprise': '199.00',
  'notifications.newClient': 'true',
  'notifications.lowStock': 'true',
  'notifications.payments': 'true',
};

export async function GET() {
  try {
    const stored = await prisma.setting.findMany();
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const s of stored) result[s.key] = s.value;
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, string>;
    const ops = Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );
    await prisma.$transaction(ops);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}
