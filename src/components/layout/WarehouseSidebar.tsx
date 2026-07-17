"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  LayoutDashboard, Package, Receipt, Truck, Building2,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  X, MapPin, Users, RefreshCcw, ChevronDown, Tag, Bookmark,
  ClipboardList, SlidersHorizontal, ShoppingCart, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModules } from "@/components/modules/ModulesProvider";
import type { ModuleKey } from "@/lib/modules/registry";

interface WarehouseSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface SubItem { key: string; label: string; href: string; icon: any; module?: ModuleKey }
interface NavItem { key: string; icon: any; label: string; href: string; children?: SubItem[]; section?: string; module?: ModuleKey }

const navItems: NavItem[] = [
  // ── Operaciones ──────────────────────────────
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard", href: "/warehouse/dashboard", section: "Operaciones" },
  {
    key: "inventory", icon: Receipt, label: "Inventario", href: "/warehouse/inventory",
    children: [
      { key: "products",      label: "Productos",   href: "/warehouse/products",                icon: Package },
      { key: "replenishment", label: "Solicitudes", href: "/warehouse/replenishment",             icon: RefreshCcw, module: 'RESTAURANT' },
      { key: "inv-adjustments",label: "Ajustes",   href: "/warehouse/inventory/adjustments",     icon: Pencil },
    ],
  },
  { key: "transfers", icon: Truck, label: "Transferencias", href: "/warehouse/transfers" },

  // ── Compras ───────────────────────────────────
  { key: "suppliers", icon: Building2, label: "Proveedores", href: "/warehouse/suppliers", section: "Compras" },
  { key: "invoices",  icon: Receipt,   label: "Facturas",    href: "/warehouse/invoices" },

  // ── Administración ────────────────────────────
  { key: "locations", icon: MapPin,    label: "Locales",       href: "/warehouse/locations", section: "Administración" },
  { key: "users",     icon: Users,     label: "Usuarios",      href: "/warehouse/users" },
  {
    key: "reports",
    icon: BarChart3,
    label: "Reportes",
    href: "/warehouse/reports",
    children: [
      { key: "rep-inventory",   label: "Inventario",     href: "/warehouse/reports/inventory",    icon: ClipboardList },
      { key: "rep-adjustments", label: "Ajustes",        href: "/warehouse/reports/adjustments",  icon: SlidersHorizontal },
      { key: "rep-transfers",   label: "Transferencias", href: "/warehouse/reports/transfers",    icon: Truck },
      { key: "rep-purchases",   label: "Compras",        href: "/warehouse/reports/purchases",    icon: ShoppingCart },
    ],
  },
  { key: "settings",  icon: Settings,  label: "Configuración", href: "/warehouse/settings" },
];

export function WarehouseSidebar({ isOpen = false, onClose }: WarehouseSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { has, loading: modLoading } = useModules();
  const visibleItems = navItems.filter(i => !i.module || modLoading || has(i.module));

  const isActive = (key: string) =>
    pathname === `/warehouse/${key}` || pathname.startsWith(`/warehouse/${key}/`);

  const isParentOfActive = (item: NavItem) =>
    item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) ?? false;

  const toggleMenu = (key: string) =>
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={cn(
      "flex h-full flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-300",
      mobile ? "w-60" : collapsed ? "w-[68px]" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-zinc-800 px-3 flex-shrink-0">
        <Link href="/warehouse/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          {(!collapsed || mobile) && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-semibold text-white truncate">Stocker</span>
              <span className="text-[10px] text-emerald-400 -mt-0.5">Depósito</span>
            </div>
          )}
        </Link>

        {mobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800 ml-auto shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800 shrink-0",
              collapsed ? "mx-auto" : "ml-auto"
            )}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.key);
            const parentActive = isParentOfActive(item);
            const isOpen_ = openMenus[item.key] ?? parentActive;

            if (item.children && (!collapsed || mobile)) {
              return (
                <div key={item.key}>
                  {item.section && (
                    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                      {item.section}
                    </p>
                  )}
                  <button
                    onClick={() => toggleMenu(item.key)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      (active || parentActive)
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen_ && "rotate-180")} />
                  </button>
                  {isOpen_ && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-zinc-800 pl-3">
                      <Link
                        href={item.href}
                        onClick={mobile ? onClose : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all",
                          pathname === item.href
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                        )}
                      >
                        Lista
                      </Link>
                      {item.children.filter(c => !c.module || modLoading || has(c.module)).map(child => {
                        const ChildIcon = child.icon;
                        const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                        return (
                          <Link
                            key={child.key}
                            href={child.href}
                            onClick={mobile ? onClose : undefined}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-all",
                              childActive
                                ? "text-emerald-400 bg-emerald-500/10"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5" />
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
                {item.section && (!collapsed || mobile) && (
                  <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    {item.section}
                  </p>
                )}
                <Link
                  href={item.href}
                  onClick={mobile ? onClose : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
                    !mobile && collapsed && "justify-center px-2"
                  )}
                  title={!mobile && collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-zinc-800 p-3 flex-shrink-0">
        {user && (!collapsed || mobile) && (
          <div className="mb-2 rounded-lg bg-zinc-900 px-3 py-2 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name || "Usuario"}</div>
            <div className="text-xs text-emerald-400">Almacén</div>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10",
            collapsed && !mobile ? "justify-center px-2" : "justify-start gap-3"
          )}
          onClick={logout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || mobile) && <span>Cerrar sesión</span>}
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: in-flow sidebar */}
      <div className="hidden md:flex h-full">
        <SidebarContent />
      </div>

      {/* Mobile: fixed drawer */}
      {isOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 z-50">
            <SidebarContent mobile />
          </div>
        </div>
      )}
    </>
  );
}
