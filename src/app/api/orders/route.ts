import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { effectiveRate } from '@/lib/rates/rateEngine';
import { makeRateLoader } from '@/lib/rates/loadRates';
import type { CurrencyCode } from '@/lib/currency';
import { effectivePrice } from '@/lib/variants/pricing';

const createOrderSchema = z.object({
  locationId: z.string(),
  tableId: z.string().optional(),
  userId: z.string(),
  notes: z.string().optional(),
  currency: z.enum(['USD', 'VES', 'BRL']).optional(),
  customerId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0),
  })).min(1),
});

// GET /api/orders - List orders for a location
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!locationId) {
      return NextResponse.json({ error: 'locationId requerido' }, { status: 400 });
    }

    const where: any = { locationId };
    if (status) where.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: { select: { number: true } },
        user: { select: { name: true } },
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
  }
}

// POST /api/orders - Create order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    // Resolve businessId: prefer header/cookie, fall back to location lookup
    const businessIdHeader =
      request.headers.get('X-Business-Id') ||
      request.cookies.get('businessId')?.value;

    let businessId: string;
    if (businessIdHeader) {
      businessId = businessIdHeader;
    } else {
      const location = await prisma.location.findUnique({
        where: { id: validated.locationId },
        select: { businessId: true },
      });
      if (!location) {
        return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 400 });
      }
      businessId = location.businessId;
    }

    // Load business currency settings
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { baseCurrency: true },
    });
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 });
    }

    const orderCurrency: CurrencyCode = (validated.currency ?? business.baseCurrency) as CurrencyCode;
    const baseCurrency: CurrencyCode = business.baseCurrency as CurrencyCode;

    // Compute frozen rate (1 if same as base, else load from exchange rates)
    let rateToBase: string;
    try {
      const rate = await effectiveRate(
        orderCurrency,
        baseCurrency,
        new Date(),
        makeRateLoader(prisma, businessId)
      );
      rateToBase = rate.toString();
    } catch {
      return NextResponse.json(
        { error: `no exchange rate set for ${orderCurrency} today` },
        { status: 422 }
      );
    }

    // Generate order number
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.order.count({
      where: {
        locationId: validated.locationId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const number = `P-${datePrefix}-${String(count + 1).padStart(3, '0')}`;

    // Resolve effective unit price for each item.
    // For variant lines: load variant + product and use effectivePrice.
    // For simple lines: keep the caller-supplied unitPrice as-is.
    const resolvedItems = await Promise.all(
      validated.items.map(async (item) => {
        if (item.variantId) {
          const variant = await prisma.productVariant.findUnique({
            where: { id: item.variantId },
            select: { salePrice: true, product: { select: { salePrice: true } } },
          });
          if (variant) {
            const priceStr = effectivePrice(
              { salePrice: variant.salePrice?.toString() ?? null },
              { salePrice: variant.product.salePrice.toString() }
            );
            return { ...item, unitPrice: parseFloat(priceStr) };
          }
        }
        return item;
      })
    );

    const totalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const order = await prisma.order.create({
      data: {
        number,
        locationId: validated.locationId,
        tableId: validated.tableId,
        userId: validated.userId,
        notes: validated.notes,
        totalAmount,
        currency: orderCurrency as any,
        rateToBase,
        customerId: validated.customerId,
        items: {
          create: resolvedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        table: { select: { number: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
  }
}
