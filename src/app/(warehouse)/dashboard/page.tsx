"use client";

import { KPICard } from "@/components/dashboard/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, Receipt, TrendingUp, Plus, ArrowRight, Activity } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ActivityFeed } from "@/components/warehouse/ActivityFeed";
import { useState, useEffect } from "react";

// Mock data - will be replaced with real API calls
const stats = {
  totalProducts: 1248,
  lowStockCount: 23,
  pendingInvoices: 5,
  monthlyPurchases: 45670.89,
};

const lowStockProducts = [
  { id: "1", name: "Harina de Trigo", sku: "HAR-001", currentStock: 12, minStock: 50, unit: "kg" },
  { id: "2", name: "Aceite de Oliva", sku: "ACE-015", currentStock: 8, minStock: 30, unit: "L" },
  { id: "3", name: "Arroz Basmati", sku: "ARR-003", currentStock: 25, minStock: 100, unit: "kg" },
  { id: "4", name: "Pasta Spaghetti", sku: "PAS-007", currentStock: 45, minStock: 80, unit: "kg" },
  { id: "5", name: "Tomate Frito", sku: "TOM-012", currentStock: 15, minStock: 60, unit: "L" },
];

const recentInvoices = [
  { id: "1", number: "FAC-2024-0892", supplier: "Distribuidora Central", date: "2024-04-08", total: 2450.00, status: "PENDING" },
  { id: "2", number: "FAC-2024-0891", supplier: "Aceites del Sur", date: "2024-04-07", total: 890.50, status: "PAID" },
  { id: "3", number: "FAC-2024-0890", supplier: "Carnes Premium", date: "2024-04-06", total: 3200.00, status: "PAID" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "PAID":
      return "text-emerald-400 bg-emerald-400/10";
    case "PENDING":
      return "text-amber-400 bg-amber-400/10";
    case "DRAFT":
      return "text-zinc-400 bg-zinc-400/10";
    case "CANCELLED":
      return "text-red-400 bg-red-400/10";
    default:
      return "text-zinc-400 bg-zinc-400/10";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "PAID":
      return "Pagada";
    case "PENDING":
      return "Pendiente";
    case "DRAFT":
      return "Borrador";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
};

export default function WarehouseDashboard() {
  // Simulate loading state
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-zinc-800/50 rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>

        <div className="h-64 bg-zinc-800/50 rounded-lg animate-pulse" />
        <div className="h-80 bg-zinc-800/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white animate-in fade-in slide-in-from-left-4 duration-500">Dashboard</h1>
          <p className="text-sm text-zinc-400 animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
            Resumen del depósito principal
          </p>
        </div>
        <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
          <Link href="/invoices">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
              <Plus className="h-4 w-4" />
              Nueva Factura
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-700 delay-200">
        <KPICard
          title="Total Productos"
          value={stats.totalProducts.toLocaleString()}
          subtitle="Productos en catálogo"
          icon={Package}
          trend={{ value: 5.2, isPositive: true }}
        />
        <KPICard
          title="Stock Bajo"
          value={stats.lowStockCount}
          subtitle="Productos bajo mínimo"
          icon={AlertTriangle}
          className="border-red-500/30"
        />
        <KPICard
          title="Facturas Pendientes"
          value={stats.pendingInvoices}
          subtitle="Por procesar"
          icon={Receipt}
        />
        <KPICard
          title="Compras del Mes"
          value={`${stats.monthlyPurchases.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`}
          subtitle="Total facturado"
          icon={TrendingUp}
          trend={{ value: 12.3, isPositive: true }}
        />
      </div>

      {/* Low Stock Table */}
      <Card className="border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Productos con Stock Bajo</CardTitle>
          <Link href="/products?filter=low-stock">
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
                <TableRow className="border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                  <TableHead className="text-zinc-400">Producto</TableHead>
                  <TableHead className="text-zinc-400">SKU</TableHead>
                  <TableHead className="text-zinc-400 text-right">Stock Actual</TableHead>
                  <TableHead className="text-zinc-400 text-right">Mínimo</TableHead>
                  <TableHead className="text-zinc-400 text-right">Déficit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((product, i) => (
                  <TableRow 
                    key={product.id} 
                    className="border-zinc-800 hover:bg-zinc-900/50 transition-colors animate-in fade-in duration-300 delay-[100ms]"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
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
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-red-400 font-medium">
                          -{product.minStock - product.currentStock} {product.unit}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                          {Math.round(((product.minStock - product.currentStock) / product.minStock) * 100)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <ActivityFeed />

      {/* Recent Invoices */}
      <Card className="border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Últimas Facturas</CardTitle>
          <Link href="/invoices">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-1">
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                  <TableHead className="text-zinc-400">Número</TableHead>
                  <TableHead className="text-zinc-400">Proveedor</TableHead>
                  <TableHead className="text-zinc-400">Fecha</TableHead>
                  <TableHead className="text-zinc-400 text-right">Total</TableHead>
                  <TableHead className="text-zinc-400 text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((invoice, i) => (
                  <TableRow 
                    key={invoice.id} 
                    className="border-zinc-800 hover:bg-zinc-900/50 transition-colors animate-in fade-in duration-300 delay-[100ms]"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <TableCell className="font-medium text-white font-mono">{invoice.number}</TableCell>
                    <TableCell className="text-zinc-300">{invoice.supplier}</TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(invoice.date).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right text-white font-medium">
                      {invoice.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium transition-colors",
                        getStatusColor(invoice.status)
                      )}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}