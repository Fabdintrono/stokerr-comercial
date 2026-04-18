"use client";

import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, Receipt, TrendingUp, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface DashboardData {
  stats: {
    totalProducts: number;
    lowStockCount: number;
    pendingInvoices: number;
    monthlyPurchases: number;
    totalSuppliers: number;
  };
  lowStockProducts: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    minStock: number;
    unit: string;
  }[];
  recentInvoices: {
    id: string;
    number: string;
    supplier: string;
    date: string;
    total: number;
    status: string;
  }[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "PAID": return "text-emerald-400 bg-emerald-400/10";
    case "RECEIVED": return "text-blue-400 bg-blue-400/10";
    case "DRAFT": return "text-zinc-400 bg-zinc-400/10";
    case "CANCELLED": return "text-red-400 bg-red-400/10";
    default: return "text-zinc-400 bg-zinc-400/10";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "PAID": return "Pagada";
    case "RECEIVED": return "Recibida";
    case "DRAFT": return "Borrador";
    case "CANCELLED": return "Cancelada";
    default: return status;
  }
};

export default function WarehouseDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/warehouse")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-zinc-800/50 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-zinc-800/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  const { stats, lowStockProducts, recentInvoices } = data;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-400">Resumen del deposito principal</p>
        </div>
        <div className="flex gap-2">
          <Link href="/warehouse/invoices">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
              <Plus className="h-4 w-4" />
              Nueva Factura
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Productos"
          value={stats.totalProducts.toLocaleString()}
          subtitle="Productos en catalogo"
          icon={Package}
        />
        <KPICard
          title="Stock Bajo"
          value={stats.lowStockCount}
          subtitle="Productos bajo minimo"
          icon={AlertTriangle}
          className={stats.lowStockCount > 0 ? "border-red-500/30" : ""}
        />
        <KPICard
          title="Facturas Pendientes"
          value={stats.pendingInvoices}
          subtitle="Por procesar"
          icon={Receipt}
        />
        <KPICard
          title="Compras del Mes"
          value={stats.monthlyPurchases.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
          subtitle="Total facturado"
          icon={TrendingUp}
        />
      </div>

      {/* Low Stock Table */}
      {lowStockProducts.length > 0 && (
        <Card className="border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Productos con Stock Bajo</CardTitle>
            <Link href="/warehouse/products?filter=low-stock">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-1">
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Producto</TableHead>
                    <TableHead className="text-zinc-400">SKU</TableHead>
                    <TableHead className="text-zinc-400 text-right">Stock Actual</TableHead>
                    <TableHead className="text-zinc-400 text-right">Minimo</TableHead>
                    <TableHead className="text-zinc-400 text-right">Deficit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((product) => (
                    <TableRow key={product.id} className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell className="font-medium text-white">{product.name}</TableCell>
                      <TableCell className="text-zinc-400 font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-400 font-medium">{product.currentStock}</span>
                        <span className="text-zinc-500 text-sm ml-1">{product.unit}</span>
                      </TableCell>
                      <TableCell className="text-right text-zinc-400">
                        {product.minStock} {product.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-400 font-medium">
                          -{(product.minStock - product.currentStock).toFixed(0)} {product.unit}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      <Card className="border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Ultimas Facturas</CardTitle>
          <Link href="/warehouse/invoices">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-1">
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No hay facturas registradas</div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Numero</TableHead>
                    <TableHead className="text-zinc-400">Proveedor</TableHead>
                    <TableHead className="text-zinc-400">Fecha</TableHead>
                    <TableHead className="text-zinc-400 text-right">Total</TableHead>
                    <TableHead className="text-zinc-400 text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell className="font-medium text-white font-mono">{invoice.number}</TableCell>
                      <TableCell className="text-zinc-300">{invoice.supplier}</TableCell>
                      <TableCell className="text-zinc-400">
                        {new Date(invoice.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right text-white font-medium">
                        {invoice.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("text-xs px-2 py-1 rounded-full font-medium", getStatusColor(invoice.status))}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
