"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  ChefHat,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { key: "products", icon: Package, label: "Productos" },
  { key: "inventory", icon: Receipt, label: "Inventario" },
  { key: "recipes", icon: ChefHat, label: "Recetas" },
  { key: "orders", icon: ShoppingCart, label: "Pedidos" },
  { key: "reports", icon: BarChart3, label: "Reportes" },
  { key: "settings", icon: Settings, label: "Configuración" },
];

export function RestaurantSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (key: string) => {
    if (key === "dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(`/${key}`);
  };

  return (
    <aside className={cn(
      "flex h-screen flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300",
      collapsed ? "w-[68px]" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-semibold text-white">Stocker</span>
              <span className="text-[10px] text-amber-400 -mt-0.5">Rest</span>
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
              <Link
                key={item.key}
                href={item.key === "dashboard" ? "/dashboard" : `/${item.key}`}
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
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-zinc-800 p-3">
        {user && !collapsed && (
          <div className="mb-2 rounded-lg bg-zinc-900 px-3 py-2">
            <div className="text-sm font-medium text-white truncate">{user.name}</div>
            <div className="text-xs text-amber-400">Gerente</div>
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