"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Receipt, MoreHorizontal, Eye, Trash2, Filter, ChevronDown, Calendar, Building2, Euro,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { InvoiceModal } from "@/components/warehouse/InvoiceModal";
import toast from "react-hot-toast";

interface LineItem {
  id: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalAmount: number;
  product: { id: string; name: string; sku: string };
}

interface Invoice {
  id: string;
  number: string;
  issueDate: string;
  dueDate?: string;
  totalAmount: number;
  totalVat: number;
  status: string;
  notes?: string;
  supplier: { id: string; name: string; vatNumber?: string };
  lineItems: LineItem[];
}

interface Supplier {
  id: string;
  name: string;
  vatNumber?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "PAID": return { label: "Pagada", color: "text-emerald-400 bg-emerald-400/10" };
    case "RECEIVED": return { label: "Recibida", color: "text-blue-400 bg-blue-400/10" };
    case "DRAFT": return { label: "Borrador", color: "text-zinc-400 bg-zinc-400/10" };
    case "CANCELLED": return { label: "Cancelada", color: "text-red-400 bg-red-400/10" };
    default: return { label: status, color: "text-zinc-400 bg-zinc-400/10" };
  }
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, supRes, prodRes] = await Promise.all([
        fetch("/api/purchase-invoices"),
        fetch("/api/suppliers"),
        fetch("/api/products"),
      ]);
      const invData = await invRes.json();
      const supData = await supRes.json();
      const prodData = await prodRes.json();
      setInvoices(invData.invoices || []);
      setSuppliers((supData.suppliers || []).filter((s: any) => s.isActive));
      setProducts((prodData.products || []).filter((p: any) => p.isActive));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (data: any) => {
    try {
      // Map VAT rate values to percentages
      const vatMap: Record<string, number> = { SIX: 6, THIRTEEN: 13, TWENTY_THREE: 23 };

      const body = {
        number: data.number || `FAC-${Date.now()}`,
        supplierId: data.supplierId,
        date: data.date,
        dueDate: data.dueDate || undefined,
        notes: data.notes || undefined,
        lineItems: (data.items || []).map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: vatMap[item.vatRate] || 13,
        })),
      };

      const res = await fetch("/api/purchase-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Factura creada");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Eliminar factura "${invoice.number}"?`)) return;
    try {
      const res = await fetch(`/api/purchase-invoices/${invoice.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Factura eliminada");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const handleStatusChange = async (invoice: Invoice, status: string) => {
    try {
      const res = await fetch(`/api/purchase-invoices/${invoice.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Estado cambiado a ${getStatusConfig(status).label}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado");
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.supplier.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = {
    total: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount) + Number(inv.totalVat), 0),
    pending: invoices
      .filter((inv) => inv.status === "DRAFT" || inv.status === "RECEIVED")
      .reduce((sum, inv) => sum + Number(inv.totalAmount) + Number(inv.totalVat), 0),
    paid: invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + Number(inv.totalAmount) + Number(inv.totalVat), 0),
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturas de Compra</h1>
          <p className="text-sm text-zinc-400">Gestiona las facturas de proveedores</p>
        </div>
        <Button
          onClick={() => { setEditingInvoice(null); setModalOpen(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
        >
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
                <p className="text-xl font-bold text-white">{suppliers.length}</p>
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
                placeholder="Buscar por numero o proveedor..."
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
                <DropdownMenuCheckboxItem checked={statusFilter === "all"} onCheckedChange={() => setStatusFilter("all")} className="text-zinc-300">Todos</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuCheckboxItem checked={statusFilter === "DRAFT"} onCheckedChange={() => setStatusFilter("DRAFT")} className="text-zinc-300">Borradores</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === "RECEIVED"} onCheckedChange={() => setStatusFilter("RECEIVED")} className="text-zinc-300">Recibidas</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === "PAID"} onCheckedChange={() => setStatusFilter("PAID")} className="text-zinc-300">Pagadas</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === "CANCELLED"} onCheckedChange={() => setStatusFilter("CANCELLED")} className="text-zinc-300">Canceladas</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">
            {loading ? "Cargando..." : `${filteredInvoices.length} factura${filteredInvoices.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-zinc-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Numero</TableHead>
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
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <Receipt className="h-12 w-12 text-zinc-600" />
                          <div className="text-zinc-400">No se encontraron facturas</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.map((invoice) => {
                    const statusConfig = getStatusConfig(invoice.status);
                    const total = Number(invoice.totalAmount) + Number(invoice.totalVat);
                    return (
                      <TableRow key={invoice.id} className="border-zinc-800 hover:bg-zinc-900/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                              <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-medium text-white font-mono">{invoice.number}</div>
                              <div className="text-sm text-zinc-400 md:hidden">{invoice.supplier.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-zinc-300">
                          {invoice.supplier.name}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(invoice.issueDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-zinc-300">
                          {Number(invoice.totalAmount).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell text-zinc-400">
                          {Number(invoice.totalVat).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-white font-medium">
                            {total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("text-xs px-2 py-1 rounded-full font-medium", statusConfig.color)}>
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
                              {invoice.status === "DRAFT" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(invoice, "RECEIVED")} className="text-zinc-300">
                                  Marcar como Recibida
                                </DropdownMenuItem>
                              )}
                              {(invoice.status === "DRAFT" || invoice.status === "RECEIVED") && (
                                <DropdownMenuItem onClick={() => handleStatusChange(invoice, "PAID")} className="text-emerald-400">
                                  Marcar como Pagada
                                </DropdownMenuItem>
                              )}
                              {invoice.status !== "CANCELLED" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(invoice, "CANCELLED")} className="text-amber-400">
                                  Cancelar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-zinc-800" />
                              <DropdownMenuItem onClick={() => handleDelete(invoice)} className="text-red-400 focus:text-red-300">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        invoice={editingInvoice}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, nif: s.vatNumber || "" }))}
        products={products.map((p) => ({ id: p.id, name: p.name, sku: (p as any).sku || "", unit: (p as any).unit || "" }))}
        onSave={handleSave}
      />
    </div>
  );
}
