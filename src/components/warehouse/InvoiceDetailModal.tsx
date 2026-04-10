"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Building2,
  Receipt,
  Euro,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  vatRate: string;
  vatAmount: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  supplierId: string;
  supplier: string;
  date: string;
  dueDate?: string;
  status: string;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  items: InvoiceItem[];
}

interface InvoiceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "PAID":
      return { label: "Pagada", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "PENDING":
      return { label: "Pendiente", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case "DRAFT":
      return { label: "Borrador", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
    case "CANCELLED":
      return { label: "Cancelada", color: "bg-red-500/10 text-red-400 border-red-500/20" };
    default:
      return { label: status, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
  }
};

const getVatLabel = (rate: string) => {
  switch (rate) {
    case "SIX":
      return "6%";
    case "THIRTEEN":
      return "13%";
    case "TWENTY_THREE":
      return "23%";
    default:
      return rate;
  }
};

export function InvoiceDetailModal({
  open,
  onOpenChange,
  invoice,
}: InvoiceDetailModalProps) {
  if (!invoice) return null;

  const statusConfig = getStatusConfig(invoice.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Receipt className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="font-mono">{invoice.number}</div>
                <div className="text-sm text-zinc-400 font-normal">
                  Factura de Compra
                </div>
              </div>
            </DialogTitle>
            <Badge className={cn("font-medium", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">Proveedor</span>
              </div>
              <div className="text-white font-medium">{invoice.supplier}</div>
              <div className="text-zinc-400 text-sm">{invoice.supplierId}</div>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Fechas</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400 text-sm">Emisión:</span>
                  <span className="text-white text-sm">
                    {new Date(invoice.date).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Vencimiento:</span>
                    <span className="text-white text-sm">
                      {new Date(invoice.dueDate).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Items de Factura</span>
            </div>

            <div className="bg-zinc-800/50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left p-3 text-zinc-400 text-sm">Producto</th>
                    <th className="text-right p-3 text-zinc-400 text-sm">Cant.</th>
                    <th className="text-right p-3 text-zinc-400 text-sm">Precio</th>
                    <th className="text-right p-3 text-zinc-400 text-sm">IVA</th>
                    <th className="text-right p-3 text-zinc-400 text-sm">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr
                      key={index}
                      className="border-b border-zinc-800 last:border-0"
                    >
                      <td className="p-3 text-white">{item.productName}</td>
                      <td className="p-3 text-right text-zinc-300">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-right text-zinc-300">
                        {item.unitPrice.toFixed(2)}€
                      </td>
                      <td className="p-3 text-right text-zinc-400">
                        {getVatLabel(item.vatRate)}
                      </td>
                      <td className="p-3 text-right text-white font-medium">
                        {item.total.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invoice.items.length === 0 && (
              <div className="text-center py-8 text-zinc-400">
                No hay items en esta factura
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Neto</span>
                <span className="text-white">{invoice.totalNet.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">IVA</span>
                <span className="text-white">{invoice.totalVat.toFixed(2)}€</span>
              </div>
              <Separator className="bg-zinc-700" />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-white">Total</span>
                <span className="text-emerald-400 flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  {invoice.totalGross.toFixed(2)}€
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700 text-zinc-300 hover:text-white"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}