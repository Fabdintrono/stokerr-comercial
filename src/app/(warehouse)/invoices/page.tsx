"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Receipt, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Filter,
  ChevronDown,
  Calendar,
  Building2,
  Euro
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock data - será reemplazado con useInvoices hook
const mockInvoices = [
  {
    id: "1",
    number: "FAC-2024-0892",
    supplier: "Distribuidora Central",
    date: "2024-04-08",
    dueDate: "2024-05-08",
    status: "PENDING",
    totalNet: 2000.00,
    totalVat: 260.00,
    totalGross: 2260.00,
  },
  {
    id: "2",
    number: "FAC-2024-0891",
    supplier: "Aceites del Sur",
    date: "2024-04-07",
    dueDate: "2024-05-07",
    status: "PAID",
    totalNet: 890.50,
    totalVat: 53.43,
    totalGross: 943.93,
  },
  {
    id: "3",
    number: "FAC-2024-0890",
    supplier: "Carnes Premium",
    date: "2024-04-06",
    dueDate: "2024-05-06",
    status: "PAID",
    totalNet: 3200.00,
    totalVat: 736.00,
    totalGross: 3936.00,
  },
];

const getStatusConfig = (status: string) => {
  switch (status) {
    case "PAID":
      return { label: "Pagada", color: "text-emerald-400 bg-emerald-400/10" };
    case "PENDING":
      return { label: "Pendiente", color: "text-amber-400 bg-amber-400/10" };
    case "DRAFT":
      return { label: "Borrador", color: "text-zinc-400 bg-zinc-400/10" };
    case "CANCELLED":
      return { label: "Cancelada", color: "text-red-400 bg-red-400/10" };
    default:
      return { label: status, color: "text-zinc-400 bg-zinc-400/10" };
  }
};

export default function InvoicesPage() {
  const [invoices] = useState(mockInvoices);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totals = {
    total: invoices.reduce((sum, inv) => sum + inv.totalGross, 0),
    pending: invoices
      .filter((inv) => inv.status === "PENDING")
      .reduce((sum, inv) => sum + inv.totalGross, 0),
    paid: invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.totalGross, 0),
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturas de Compra</h1>
          <p className="text-sm text-zinc-400">
            Gestiona las facturas de proveedores
          </p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Euro className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Total Facturado</p>
                <p className="text-xl font-bold text-white">
                  {totals.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Pendiente de Pago</p>
                <p className="text-xl font-bold text-white">
                  {totals.pending.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Proveedores Activos</p>
                <p className="text-xl font-bold text-white">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Buscar por número o proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2">
                  <Filter className="h-4 w-4" />
                  Estado
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "all"}
                  onCheckedChange={() => setStatusFilter("all")}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                >
                  Todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "DRAFT"}
                  onCheckedChange={() => setStatusFilter("DRAFT")}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                >
                  Borradores
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "PENDING"}
                  onCheckedChange={() => setStatusFilter("PENDING")}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                >
                  Pendientes
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "PAID"}
                  onCheckedChange={() => setStatusFilter("PAID")}
                  className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                >
                  Pagadas
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredInvoices.length} factura{filteredInvoices.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                  <TableHead className="text-zinc-400">Número</TableHead>
                  <TableHead className="text-zinc-400 hidden md:table-cell">Proveedor</TableHead>
                  <TableHead className="text-zinc-400 hidden lg:table-cell">Fecha</TableHead>
                  <TableHead className="text-zinc-400 text-right">Neto</TableHead>
                  <TableHead className="text-zinc-400 text-right hidden sm:table-cell">IVA</TableHead>
                  <TableHead className="text-zinc-400 text-right">Total</TableHead>
                  <TableHead className="text-zinc-400 text-right">Estado</TableHead>
                  <TableHead className="text-zinc-400 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const statusConfig = getStatusConfig(invoice.status);
                  
                  return (
                    <TableRow key={invoice.id} className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-white font-mono">{invoice.number}</div>
                            <div className="text-sm text-zinc-400 md:hidden">{invoice.supplier}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-zinc-300">
                        {invoice.supplier}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(invoice.date).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {invoice.totalNet.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-zinc-400">
                        {invoice.totalVat.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-white font-medium">
                          {invoice.totalGross.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          statusConfig.color
                        )}>
                          {statusConfig.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-zinc-300 focus:text-white focus:bg-zinc-800">
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-zinc-800">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Receipt className="h-12 w-12 text-zinc-600" />
                        <div className="text-zinc-400">No se encontraron facturas</div>
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchQuery("")}
                            className="text-zinc-500 hover:text-white"
                          >
                            Limpiar búsqueda
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}