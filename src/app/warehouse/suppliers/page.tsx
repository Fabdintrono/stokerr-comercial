"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, Building2, Filter, MoreHorizontal, Phone, Mail, MapPin, Pencil, Trash2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SupplierModal } from "@/components/warehouse/SupplierModal";
import toast from "react-hot-toast";

interface Supplier {
  id: string;
  name: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  isActive: boolean;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = useCallback(() => {
    setLoading(true);
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data) => setSuppliers(data.suppliers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleSave = async (data: { id?: string; name: string; nif: string; email: string; phone: string; city: string; active: boolean }) => {
    try {
      const body = {
        name: data.name,
        vatNumber: data.nif,
        email: data.email || undefined,
        phone: data.phone || undefined,
        city: data.city || undefined,
        isActive: data.active,
      };

      if (data.id) {
        const res = await fetch(`/api/suppliers/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Proveedor actualizado");
      } else {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("Proveedor creado");
      }
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Desactivar proveedor "${supplier.name}"?`)) return;
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Proveedor desactivado");
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.vatNumber || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.isActive) ||
      (statusFilter === "inactive" && !s.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Proveedores</h1>
          <p className="text-sm text-zinc-400">Gestiona los proveedores de tu negocio</p>
        </div>
        <Button
          onClick={() => { setEditingSupplier(null); setModalOpen(true); }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Total Proveedores</p>
                <p className="text-xl font-bold text-white">{suppliers.length}</p>
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
                <p className="text-sm text-zinc-400">Activos</p>
                <p className="text-xl font-bold text-white">{suppliers.filter((s) => s.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Ciudades</p>
                <p className="text-xl font-bold text-white">
                  {new Set(suppliers.map((s) => s.city).filter(Boolean)).size}
                </p>
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
                placeholder="Buscar por nombre o NIF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-zinc-700 text-zinc-300 gap-2">
                  <Filter className="h-4 w-4" />
                  Estado
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem onClick={() => setStatusFilter("all")} className="text-zinc-300">Todos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")} className="text-zinc-300">Activos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("inactive")} className="text-zinc-300">Inactivos</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">
            {loading ? "Cargando..." : `${filteredSuppliers.length} proveedores`}
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
                    <TableHead className="text-zinc-400">Proveedor</TableHead>
                    <TableHead className="text-zinc-400 hidden md:table-cell">Contacto</TableHead>
                    <TableHead className="text-zinc-400 hidden lg:table-cell">Ciudad</TableHead>
                    <TableHead className="text-zinc-400 text-right">Estado</TableHead>
                    <TableHead className="text-zinc-400 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                        No se encontraron proveedores
                      </TableCell>
                    </TableRow>
                  ) : filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            supplier.isActive ? "bg-emerald-500/10" : "bg-zinc-700/50"
                          )}>
                            <Building2 className={cn("h-5 w-5", supplier.isActive ? "text-emerald-400" : "text-zinc-500")} />
                          </div>
                          <div>
                            <div className="font-medium text-white">{supplier.name}</div>
                            {supplier.vatNumber && (
                              <div className="text-sm text-zinc-400 font-mono">{supplier.vatNumber}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          {supplier.email && (
                            <div className="flex items-center gap-2 text-zinc-400 text-sm">
                              <Mail className="h-3.5 w-3.5" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-2 text-zinc-400 text-sm">
                              <Phone className="h-3.5 w-3.5" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-zinc-300">
                        {supplier.city || "\u2014"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          supplier.isActive ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-400 bg-zinc-400/10"
                        )}>
                          {supplier.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem
                              onClick={() => { setEditingSupplier(supplier); setModalOpen(true); }}
                              className="text-zinc-300"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(supplier)}
                              className="text-red-400 focus:text-red-300"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Desactivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSupplier(null); }}
        onSave={handleSave}
        initialData={editingSupplier ? {
          id: editingSupplier.id,
          name: editingSupplier.name,
          nif: editingSupplier.vatNumber || "",
          email: editingSupplier.email || "",
          phone: editingSupplier.phone || "",
          city: editingSupplier.city || "",
          active: editingSupplier.isActive,
        } : undefined}
      />
    </div>
  );
}
