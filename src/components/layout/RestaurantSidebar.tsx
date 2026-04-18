"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Landmark,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChefHat,
  Armchair,
  Users,
  ArrowRightLeft,
  BookOpen,
  Boxes,
  ChevronDown,
  RefreshCcw,
  Package,
  UtensilsCrossed,
  Tag,
  ClipboardList,
  TrendingUp,
  SlidersHorizontal,
  Star,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubItem {
  key: string;
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface NavItem {
  key: string;
  icon: React.ElementType;
  label: string;
  href: string;
  roles: string[];
  children?: SubItem[];
  section?: string; // section label shown above this item
}

const navItems: NavItem[] = [
  // ── Operaciones ────────────────────────────────
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard",  href: "/restaurant",        roles: ["RESTAURANT_MANAGER", "CASHIER"], section: "Operaciones" },
  { key: "orders",    icon: ShoppingCart,    label: "StokerPOS",  href: "/pos",               roles: ["RESTAURANT_MANAGER", "CASHIER"] },
  { key: "tables",    icon: Armchair,        label: "Mesas",      href: "/restaurant/tables", roles: ["RESTAURANT_MANAGER", "CASHIER"] },
  { key: "caja",      icon: Landmark,        label: "Caja",       href: "/restaurant/caja",   roles: ["RESTAURANT_MANAGER", "CASHIER"] },

  // ── Cocina ─────────────────────────────────────
  {
    key: "menu",
    icon: UtensilsCrossed,
    label: "Menú",
    href: "/restaurant/recipes",
    roles: ["RESTAURANT_MANAGER"],
    section: "Cocina",
    children: [
      { key: "recipes",    label: "Recetas",    href: "/restaurant/recipes",             icon: BookOpen },
      { key: "categories", label: "Categorías", href: "/restaurant/products/categories", icon: Tag },
    ],
  },

  // ── Stock ──────────────────────────────────────
  {
    key: "inventory",
    icon: Boxes,
    label: "Inventario",
    href: "/restaurant/inventory",
    roles: ["RESTAURANT_MANAGER"],
    section: "Stock",
    children: [
      { key: "products-list",  label: "Productos",  href: "/restaurant/products",                    icon: Package },
      { key: "replenishment",  label: "Reposición", href: "/restaurant/inventory/replenishment",     icon: RefreshCcw },
      { key: "inv-adjustments",label: "Ajustes",    href: "/restaurant/inventory/adjustments",       icon: Pencil },
    ],
  },
  { key: "transfers", icon: ArrowRightLeft, label: "Transferencias", href: "/restaurant/transfers", roles: ["RESTAURANT_MANAGER"] },

  // ── Administración ─────────────────────────────
  { key: "staff",    icon: Users,    label: "Personal",      href: "/restaurant/staff",    roles: ["RESTAURANT_MANAGER"], section: "Administración" },
  {
    key: "reports",
    icon: BarChart3,
    label: "Reportes",
    href: "/restaurant/reports",
    roles: ["RESTAURANT_MANAGER"],
    children: [
      { key: "rep-sales",       label: "Ventas",              href: "/restaurant/reports/sales",         icon: TrendingUp },
      { key: "rep-top",         label: "Más vendidos",        href: "/restaurant/reports/top-products",  icon: Star },
      { key: "rep-registers",   label: "Cierres de Caja",     href: "/restaurant/reports/registers",     icon: Landmark },
      { key: "rep-inventory",   label: "Inventario",          href: "/restaurant/reports/inventory",     icon: ClipboardList },
      { key: "rep-adjustments", label: "Ajustes",             href: "/restaurant/reports/adjustments",   icon: SlidersHorizontal },
      { key: "rep-transfers",   label: "Transferencias",      href: "/restaurant/reports/transfers",     icon: ArrowRightLeft },
    ],
  },
  { key: "settings", icon: Settings,  label: "Configuración", href: "/restaurant/settings", roles: ["RESTAURANT_MANAGER"] },
];

const roleLabels: Record<string, string> = {
  RESTAURANT_MANAGER: "Gerente",
  CASHIER: "Cajero",
  SUPER_ADMIN: "Super Admin",
};

export function RestaurantSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const userRole = user?.role || "CASHIER";

  const visibleItems = isLoading
    ? navItems
    : navItems.filter((item) => item.roles.includes(userRole) || userRole === "SUPER_ADMIN");

  const isActive = (item: NavItem) => {
    if (item.key === "dashboard") return pathname === "/restaurant";
    if (item.key === "orders") return pathname === "/pos";
    if (item.children) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const isChildActive = (child: SubItem) => pathname.startsWith(child.href);

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Auto-open parent if a child is active
  const isParentOfActive = (item: NavItem) =>
    item.children?.some((c) => pathname.startsWith(c.href)) ?? false;

  return (
    <aside className={cn(
      "flex h-screen flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300",
      collapsed ? "w-[68px]" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-3">
        <Link href="/restaurant" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-semibold text-white">Stocker</span>
              <span className="text-[10px] text-amber-400 -mt-0.5">Restaurante</span>
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
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const hasChildren = !!item.children?.length;
            const parentActive = isParentOfActive(item);
            const menuOpen = openMenus[item.key] ?? parentActive;

            if (hasChildren && !collapsed) {
              return (
                <div key={item.key}>
                  {/* Section label */}
                  {item.section && (
                    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                      {item.section}
                    </p>
                  )}
                  {/* Parent row — navigates AND toggles submenu */}
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                        (active || parentActive)
                          ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                    <button
                      onClick={() => toggleMenu(item.key)}
                      className="p-1 text-zinc-500 hover:text-white"
                    >
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", menuOpen && "rotate-180")} />
                    </button>
                  </div>

                  {/* Submenu */}
                  {menuOpen && (
                    <div className="ml-6 mt-0.5 space-y-0.5 border-l border-zinc-800 pl-3">
                      {item.children!.map((child) => {
                        const ChildIcon = child.icon || RefreshCcw;
                        return (
                          <Link
                            key={child.key}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all",
                              isChildActive(child)
                                ? "text-emerald-400 font-medium"
                                : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            <ChildIcon className="h-3 w-3 shrink-0" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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
            <div className="text-xs text-amber-400">{roleLabels[userRole] || userRole}</div>
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
