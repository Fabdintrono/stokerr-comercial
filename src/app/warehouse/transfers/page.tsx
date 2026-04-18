"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Truck, ArrowRight, Clock, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Location {
  id: string;
  name: string;
  type: string;
}

interface TransferItem {
  id: string;
  quantity: number;
  product: { id: string; name: string; sku: string | null; unit: string };
}

interface Transfer {
  id: string;
  reference: string;
  status: string;
  notes: string | null;
  fromLocation: Location;
  toLocation: Location;
  lineItems: TransferItem[];
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: "Pendiente", color: "text-amber-400 bg-amber-400/10", icon: Clock },
  COMPLETED: { label: "Completada", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelada", color: "text-red-400 bg-red-400/10", icon: XCircle },
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([{ productId: "", quantity: 1 }]);

  const fetchData = useCallback(async () => {
    try {
      const [trRes, locRes, prodRes] = await Promise.all([
        fetch("/api/transfers"),
        fetch("/api/locations"),
        fetch("/api/products"),
      ]);
      if (trRes.ok) {
        const d = await trRes.json();
        setTransfers(d.transfers);
      }
      if (locRes.ok) {
        const d = await locRes.json();
        setLocations((d.data || []).filter((l: any) => l.isActive));
      }
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts((d.products || []).filter((p: any) => p.isActive));
      }
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = () => {
    setFromLocationId("");
    setToLocationId("");
    setNotes("");
    setItems([{ productId: "", quantity: 1 }]);
    setModalOpen(true);
  };

  const addItem = () => setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocationId || !toLocationId) { toast.error("Selecciona origen y destino"); return; }
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) { toast.error("Agrega al menos un producto"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromLocationId, toLocationId, notes: notes || undefined, items: validItems }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success("Transferencia creada");
      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al crear");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const label = status === "COMPLETED" ? "completar" : "cancelar";
    if (!confirm(`Seguro que deseas ${label} esta transferencia?`)) return;
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(status === "COMPLETED" ? "Transferencia completada - stock actualizado" : "Transferencia cancelada");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta transferencia?")) return;
    try {
      const res = await fetch(`/api/transfers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Transferencia eliminada");
      fetchData();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const filtered = transfers.filter((t) =>
    t.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.fromLocation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.toLocation.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = transfers.filter((t) => t.status === "PENDING").length;
  const completedCount = transfers.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transferencias</h1>
          <p className="text-sm text-zinc-400">Movimientos de stock entre ubicaciones</p>
        </div>
        <Button onClick={openModal} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <Plus className="h-4 w-4" />
          Nueva Transferencia
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Completadas</p>
                <p className="text-xl font-bold text-white">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Pendientes</p>
                <p className="text-xl font-bold text-white">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Total</p>
                <p className="text-xl font-bold text-white">{transfers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-zinc-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar por referencia, origen o destino..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">{filtered.length} transferencias</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">No se encontraron transferencias</div>
              ) : filtered.map((transfer) => {
                const config = statusConfig[transfer.status] || statusConfig.PENDING;
                const StatusIcon = config.icon;
                return (
                  <div
                    key={transfer.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <span className="text-zinc-500 font-mono text-xs">{transfer.reference}</span>
                        <span className="truncate">{transfer.fromLocation.name}</span>
                        <ArrowRight className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span className="truncate">{transfer.toLocation.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                        <span>{transfer.lineItems.length} producto{transfer.lineItems.length !== 1 ? "s" : ""}</span>
                        <span>-</span>
                        <span>{new Date(transfer.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        {transfer.notes && (
                          <>
                            <span>-</span>
                            <span className="truncate">{transfer.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium", config.color)}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {config.label}
                      </span>
                      {transfer.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() => handleStatusChange(transfer.id, "COMPLETED")}
                          >
                            Completar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleStatusChange(transfer.id, "CANCELLED")}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-zinc-400 hover:text-red-400"
                            onClick={() => handleDelete(transfer.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Transfer Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Truck className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg">Nueva Transferencia</DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-zinc-300">Origen *</Label>
                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Destino *</Label>
                <Select value={toLocationId} onValueChange={setToLocationId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {locations.filter((l) => l.id !== fromLocationId).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Notas</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-white"
                placeholder="Reposicion semanal..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Productos *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-emerald-400 hover:text-emerald-300 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={item.productId} onValueChange={(v) => updateItem(idx, "productId", v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Producto..." /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-20 bg-zinc-800/50 border-zinc-700 text-white"
                    />
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </form>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Transferencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
