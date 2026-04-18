import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/dashboard/warehouse - Stats del depósito
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const businessId = request.headers.get('X-Business-Id') || request.cookies.get('businessId')?.value;

    if (!businessId) {
      return NextResponse.json({ error: 'No hay negocio seleccionado' }, { status: 400 });
    }

    // Total products
    const totalProducts = await prisma.product.count({
      where: { businessId, isActive: true },
    });

    // Low stock products (total stock across all locations < minStock)
    const products = await prisma.product.findMany({
      where: { businessId, isActive: true },
      include: {
        inventory: true,
        category: { select: { name: true } },
      },
    });

    const lowStockProducts = products
      .map((p) => {
        const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku || '',
          currentStock: totalStock,
          minStock: p.minStock,
          unit: p.unit,
          category: p.category.name,
        };
      })
      .filter((p) => p.currentStock < p.minStock)
      .sort((a, b) => (a.currentStock / a.minStock) - (b.currentStock / b.minStock))
      .slice(0, 5);

    // Pending invoices
    const pendingInvoices = await prisma.purchaseInvoice.count({
      where: { businessId, status: { in: ['DRAFT', 'RECEIVED'] } },
    });

    // Monthly purchases (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        businessId,
        createdAt: { gte: startOfMonth },
        status: { not: 'CANCELLED' },
      },
      select: { totalAmount: true, totalVat: true },
    });
    const monthlyPurchases = monthlyInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount) + Number(inv.totalVat),
      0
    );

    // Recent invoices
    const recentInvoices = await prisma.purchaseInvoice.findMany({
      where: { businessId },
      include: {
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Total suppliers
    const totalSuppliers = await prisma.supplier.count({
      where: { businessId, isActive: true },
    });

    return NextResponse.json({
      stats: {
        totalProducts,
        lowStockCount: lowStockProducts.length,
        pendingInvoices,
        monthlyPurchases,
        totalSuppliers,
      },
      lowStockProducts,
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        supplier: inv.supplier.name,
        date: inv.issueDate.toISOString(),
        total: Number(inv.totalAmount) + Number(inv.totalVat),
        status: inv.status,
      })),
    });
  } catch (error) {
    console.error('Error fetching warehouse dashboard:', error);
    return NextResponse.json(
      { error: 'Error al obtener dashboard' },
      { status: 500 }
    );
  }
}
