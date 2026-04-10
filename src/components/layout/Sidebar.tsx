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
  Warehouse,
  Receipt,
  Users,
  Store,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = {
  main: [
    { key: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  ],
  operations: [
    { key: "pos", icon: ShoppingCart, label: "POS" },
    { key: "products", icon: Package, label: "Productos" },
    { key: "inventory", icon: Warehouse, label: "Inventario" },
    { key: "orders", icon: Receipt, label: "Pedidos" },
  ],
  management: [
    { key: "users", icon: Users, label: "Usuarios" },
    { key: "restaurants", icon: Store, label: "Restaurantes" },
  ],
  admin: [
    { key: "reports", icon: BarChart3, label: "Reportes" },
    { key: "settings", icon: Settings, label: "Configuración" },
  ],
};

const roleNavKeys: Record<string, string[]> = {
  ADMIN: ["main", "operations", "management", "admin"],
  WAREHOUSE_MANAGER: ["main", "operations"],
  RESTAURANT_MANAGER: ["main", "operations"],
  CASHIER: ["main", "pos"],
  VIEWER: ["main"],
};

const sectionLabels: Record<string, string> = {
  operations: "Operaciones",
  management: "Gestión",
  admin: "Administración",
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role || "VIEWER";
  const allowedSections = roleNavKeys[role] || ["main"];

  const isActive = (key: string) => {
    if (key === "dashboard") return pathname === "/";
    return pathname.startsWith(`/${key}`);
  };

  const getNavHref = (key: string) => (key === "dashboard" ? "/" : `/${key}`);

  return (
    <aside className={cn(
      "flex h-screen flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300",
      collapsed ? "w-[68px]" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-base font-semibold text-white">Stocker</span>
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
        {allowedSections.map((section, sectionIndex) => {
          const items = navItems[section as keyof typeof navItems] || [];
          if (!items.length) return null;

          return (
            <div key={section} className={cn(sectionIndex > 0 && "mt-4")}>
              {!collapsed && section !== "main" && (
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {sectionLabels[section]}
                </div>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.key);

                  return (
                    <Link
                      key={item.key}
                      href={getNavHref(item.key)}
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
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-zinc-800 p-3">
        {user && !collapsed && (
          <div className="mb-2 rounded-lg bg-zinc-900 px-3 py-2">
            <div className="text-sm font-medium text-white truncate">
              {user.name}
            </div>
            <div className="text-xs text-zinc-500">
              {role}
            </div>
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