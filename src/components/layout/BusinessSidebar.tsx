"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  LayoutDashboard,
  Package,
  Receipt,
  ChefHat,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Warehouse,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems: { key: string; icon: any; label: string; href: string; section?: string }[] = [
  // ── Visión general ────────────────────────────
  { key: "dashboard",   icon: LayoutDashboard, label: "Dashboard",    href: "/business/dashboard",   section: "Visión general" },

  // ── Operaciones ───────────────────────────────
  { key: "warehouse",   icon: Warehouse,       label: "Depósito",     href: "/business/warehouse",   section: "Operaciones" },
  { key: "restaurants", icon: Building2,       label: "Restaurantes", href: "/business/restaurants" },

  // ── Menú ──────────────────────────────────────
  { key: "products",    icon: Package,         label: "Productos",    href: "/business/products",    section: "Menú" },
  { key: "recipes",     icon: ChefHat,         label: "Recetas",      href: "/business/recipes" },

  // ── Compras ───────────────────────────────────
  { key: "suppliers",   icon: Truck,           label: "Proveedores",  href: "/business/suppliers",   section: "Compras" },

  // ── Administración ────────────────────────────
  { key: "staff",       icon: Users,           label: "Personal",     href: "/business/staff",       section: "Administración" },
  { key: "reports",     icon: BarChart3,       label: "Reportes",     href: "/business/reports" },
  { key: "settings",    icon: Settings,        label: "Configuración", href: "/business/settings" },
];

export function BusinessSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // En producción, esto vendría del contexto del negocio seleccionado
  const businessName = "Restaurante Demo";

  const isActive = (key: string) => {
    if (key === "dashboard") return pathname === "/business/dashboard" || pathname === "/";
    return pathname.startsWith(`/business/${key}`);
  };

  return (
    <aside className={cn(
      "flex h-screen flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300",
      collapsed ? "w-[68px]" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-3">
        <Link href="/business/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
            <Store className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-semibold text-white">Stocker</span>
              <span className="text-[10px] text-zinc-400 -mt-0.5 truncate max-w-[120px]">{businessName}</span>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800",
            collapsed ? "mx-auto mt-0" : "ml-auto"
          )}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.key);

            return (
              <div key={item.key}>
                {item.section && !collapsed && (
                  <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    {item.section}
                  </p>
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-zinc-800 p-3">
        {user && !collapsed && (
          <div className="mb-2 rounded-lg bg-zinc-900 px-3 py-2">
            <div className="text-sm font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-emerald-400">Dueño</div>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10",
            collapsed ? "justify-center px-2" : "justify-start gap-3"
          )}
          onClick={logout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </Button>
      </div>
    </aside>
  );
}