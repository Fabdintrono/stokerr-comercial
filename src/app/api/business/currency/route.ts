import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const currencyEnum = z.enum(['USD', 'VES', 'BRL']);

const currencySettingsSchema = z.object({
  baseCurrency: currencyEnum,
  secondaryCurrency: currencyEnum.nullable().optional(),
  enabledCurrencies: z.array(currencyEnum).min(1),
  multiCurrency: z.boolean(),
  rateSource: z.enum(['AUTO_BCV', 'AUTO_FOREX', 'MANUAL']),
});

// GET /api/business/currency - Return tenant currency settings
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

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        baseCurrency: true,
        secondaryCurrency: true,
        enabledCurrencies: true,
        multiCurrency: true,
        rateSource: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: business });
  } catch (error) {
    console.error('Error fetching currency settings:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración de moneda' },
      { status: 500 }
    );
  }
}

// PUT /api/business/currency - Update tenant currency settings
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
    const parsed = currencySettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // baseCurrency must be in enabledCurrencies
    if (!data.enabledCurrencies.includes(data.baseCurrency)) {
      return NextResponse.json(
        { error: 'La moneda base debe estar incluida en las monedas habilitadas' },
        { status: 422 }
      );
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        baseCurrency: data.baseCurrency,
        secondaryCurrency: data.secondaryCurrency ?? null,
        enabledCurrencies: data.enabledCurrencies,
        multiCurrency: data.multiCurrency,
        rateSource: data.rateSource,
      },
      select: {
        baseCurrency: true,
        secondaryCurrency: true,
        enabledCurrencies: true,
        multiCurrency: true,
        rateSource: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating currency settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar configuración de moneda' },
      { status: 500 }
    );
  }
}
