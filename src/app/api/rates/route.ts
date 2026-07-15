import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const upsertRateSchema = z.object({
  currency: z.enum(['USD', 'VES', 'BRL']),
  rate: z.string().regex(/^\d+(\.\d+)?$/, 'rate must be a valid decimal number'),
});

function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

// GET /api/rates - Return today's exchange rates for the current business
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId =
      request.headers.get('X-Business-Id') ||
      request.cookies.get('businessId')?.value;

    if (!businessId) {
      return NextResponse.json(
        { error: 'No hay negocio seleccionado' },
        { status: 400 }
      );
    }

    const today = todayUtcMidnight();

    const rates = await prisma.exchangeRate.findMany({
      where: { businessId, date: today },
      orderBy: { currency: 'asc' },
    });

    return NextResponse.json({ data: rates });
  } catch (error) {
    console.error('Error fetching rates:', error);
    return NextResponse.json(
      { error: 'Error al obtener tasas de cambio' },
      { status: 500 }
    );
  }
}

// PUT /api/rates - Upsert today's rate for a currency (manual override)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId =
      request.headers.get('X-Business-Id') ||
      request.cookies.get('businessId')?.value;

    if (!businessId) {
      return NextResponse.json(
        { error: 'No hay negocio seleccionado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = upsertRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { currency, rate } = parsed.data;
    const today = todayUtcMidnight();

    const upserted = await prisma.exchangeRate.upsert({
      where: {
        businessId_currency_date: {
          businessId,
          currency: currency as any,
          date: today,
        },
      },
      create: {
        businessId,
        currency: currency as any,
        rate,
        date: today,
        source: 'MANUAL',
      },
      update: {
        rate,
        source: 'MANUAL',
      },
    });

    return NextResponse.json({ data: upserted });
  } catch (error) {
    console.error('Error upserting rate:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar tasa de cambio' },
      { status: 500 }
    );
  }
}
