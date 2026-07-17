import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { requireModule, ModuleForbiddenError } from '@/lib/modules/guard';

// ── Unit conversion ──────────────────────────────────────────────────────────
// Returns quantity expressed in the product's base unit.
// e.g. toBaseUnit(50, 'G', 'KG') = 0.05
export function toBaseUnit(quantity: number, recipeUnit: string, productUnit: string): number {
  if (recipeUnit === productUnit) return quantity;
  const key = `${recipeUnit}->${productUnit}`;
  const factors: Record<string, number> = {
    'G->KG':   1 / 1000,
    'KG->G':   1000,
    'ML->L':   1 / 1000,
    'L->ML':   1000,
    'G->G':    1,
    'KG->KG':  1,
    'L->L':    1,
    'ML->ML':  1,
  };
  return quantity * (factors[key] ?? 1);
}

// Compatible display units per product base unit
export const COMPATIBLE_UNITS: Record<string, string[]> = {
  KG:      ['KG', 'G'],
  G:       ['G', 'KG'],
  L:       ['L', 'ML'],
  ML:      ['ML', 'L'],
  UNIT:    ['UNIT'],
  BOX:     ['BOX'],
  CASE:    ['CASE'],
  GARRAFA: ['GARRAFA'],
};

// ── Schema ───────────────────────────────────────────────────────────────────
const createRecipeSchema = z.object({
  productId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  yield: z.number().min(0.01).default(1),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    unit: z.string().optional(),
  })).min(1),
});

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 });

    if (businessId) {
      try {
        await requireModule(prisma, businessId, 'RESTAURANT');
      } catch (e) {
        if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 });
        throw e;
      }
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const recipes = await prisma.recipe.findMany({
      where: { businessId, ...(productId ? { productId } : {}) },
      include: {
        product: {
          select: {
            id: true, name: true, unit: true, sku: true,
            salePrice: true, vatRate: true,
            inventory: { select: { quantity: true } },
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, unit: true, sku: true,
                costPrice: true,
                inventory: { select: { quantity: true } },
              },
            },
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    // Enrich with financial + availability metrics (unit-aware)
    const enriched = recipes.map((recipe) => {
      // Cost: convert each ingredient quantity to its product's base unit before multiplying
      const totalIngredientCost = recipe.items.reduce((sum, item) => {
        const recipeUnit = item.unit || item.product.unit;
        const qtyInBase = toBaseUnit(item.quantity, recipeUnit, item.product.unit);
        return sum + qtyInBase * Number(item.product.costPrice ?? 0);
      }, 0);
      const costPrice = recipe.yield > 0 ? totalIngredientCost / recipe.yield : totalIngredientCost;

      // Available units: min(floor(stock_in_base / needed_in_base)) across all ingredients
      let availableUnits: number | null = null;
      for (const item of recipe.items) {
        const recipeUnit = item.unit || item.product.unit;
        const neededInBase = toBaseUnit(item.quantity, recipeUnit, item.product.unit);
        const totalStock = item.product.inventory.reduce((s, inv) => s + inv.quantity, 0);
        const units = neededInBase > 0 ? Math.floor(totalStock / neededInBase) : Infinity;
        if (availableUnits === null || units < availableUnits) availableUnits = units;
      }
      if (availableUnits === null) availableUnits = 0;

      const salePrice = Number(recipe.product.salePrice ?? 0);
      const vatRate = Number(recipe.product.vatRate ?? 23);
      const salePriceWithVat = salePrice * (1 + vatRate / 100);
      const margin = costPrice > 0 ? ((salePrice - costPrice) / costPrice) * 100 : 0;

      return {
        ...recipe,
        product: { ...recipe.product, salePrice, vatRate },
        items: recipe.items.map((item) => ({
          ...item,
          unit: item.unit || item.product.unit,
          product: { ...item.product, costPrice: Number(item.product.costPrice ?? 0) },
        })),
        metrics: {
          costPrice: Math.round(costPrice * 100) / 100,
          salePrice,
          salePriceWithVat: Math.round(salePriceWithVat * 100) / 100,
          vatRate,
          margin: Math.round(margin * 10) / 10,
          availableUnits,
        },
      };
    });

    return NextResponse.json({ recipes: enriched });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al obtener recetas' }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;
    if (!businessId) return NextResponse.json({ error: 'Sin negocio' }, { status: 400 });

    if (businessId) {
      try {
        await requireModule(prisma, businessId, 'RESTAURANT');
      } catch (e) {
        if (e instanceof ModuleForbiddenError) return NextResponse.json({ error: 'module not enabled' }, { status: 403 });
        throw e;
      }
    }

    const body = await request.json();
    const data = createRecipeSchema.parse(body);

    const product = await prisma.product.findFirst({ where: { id: data.productId, businessId } });
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

    const itemsData = data.items.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      unit: i.unit || null,
    }));

    const existing = await prisma.recipe.findUnique({ where: { productId: data.productId } });

    let recipe;
    if (existing) {
      await prisma.recipeItem.deleteMany({ where: { recipeId: existing.id } });
      recipe = await prisma.recipe.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          description: data.description,
          yield: data.yield,
          items: { create: itemsData },
        },
        include: {
          product: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
      });
    } else {
      recipe = await prisma.recipe.create({
        data: {
          businessId,
          productId: data.productId,
          name: data.name,
          description: data.description,
          yield: data.yield,
          items: { create: itemsData },
        },
        include: {
          product: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, unit: true } } } },
        },
      });
    }

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (e) {
    console.error(e);
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: e.issues }, { status: 400 });
    return NextResponse.json({ error: 'Error al guardar receta' }, { status: 500 });
  }
}
