"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Building2,
  Filter,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock data - será reemplazado con API real
const mockSuppliers = [
  { id: "1", name: "Distribuidora Central", nif: "B-12345678", email: "contacto@central.pt", phone: "+351 210 123 456", city: "Lisboa", active: true },
  { id: "2", name: "Aceites del Sur", nif: "B-87654321", email: "info@aceites.pt", phone: "+351 289 654 321", city: "Faro", active: true },
  { id: "3", name: "Carnes Premium", nif: "B-11223344", email: "vendas@carnes.pt", phone: "+351 220 987 654", city: "Porto", active: true },
  { id: "4", name: "Lácteos del Norte", nif: "B-55667788", email: "contacto@lacteos.pt", phone: "+351 220 456 789", city: "Braga", active: false },
];

export default function SuppliersPage() {
  const [suppliers] = useState(mockSuppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.nif.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && supplier.active) ||
      (statusFilter === "inactive" && !supplier.active);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Proveedores</h1>
          <p className="text-sm text-zinc-400">Gestiona los proveedores de tu negocio</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
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
                <p className="text-xl font-bold text-white">{suppliers.filter(s => s.active).length}</p>
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
                <p className="text-xl font-bold text-white">{new Set(suppliers.map(s => s.city)).size}</p>
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
                <DropdownMenuItem onClick={() => setStatusFilter("all")} className="text-zinc-300">
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")} className="text-zinc-300">
                  Activos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("inactive")} className="text-zinc-300">
                  Inactivos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">{filteredSuppliers.length} proveedores</CardTitle>
        </CardHeader>
        <CardContent>
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
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="border-zinc-800">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          supplier.active ? "bg-emerald-500/10" : "bg-zinc-700/50"
                        )}>
                          <Building2 className={cn(
                            "h-5 w-5",
                            supplier.active ? "text-emerald-400" : "text-zinc-500"
                          )} />
                        </div>
                        <div>
                          <div className="font-medium text-white">{supplier.name}</div>
                          <div className="text-sm text-zinc-400 font-mono">{supplier.nif}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                          <Mail className="h-3.5 w-3.5" />
                          {supplier.email}
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                          <Phone className="h-3.5 w-3.5" />
                          {supplier.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-zinc-300">
                      {supplier.city}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        supplier.active
                          ? "text-emerald-400 bg-emerald-400/10"
                          : "text-zinc-400 bg-zinc-400/10"
                      )}>
                        {supplier.active ? "Activo" : "Inactivo"}
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
                          <DropdownMenuItem className="text-zinc-300">Ver detalles</DropdownMenuItem>
                          <DropdownMenuItem className="text-zinc-300">Editar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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