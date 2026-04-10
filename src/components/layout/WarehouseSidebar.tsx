"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { LayoutDashboard, Package, Receipt, Truck, Building2, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WarehouseSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { key: "products", icon: Package, label: "Productos", href: "/products" },
  { key: "inventory", icon: Receipt, label: "Inventario", href: "/inventory" },
  { key: "transfers", icon: Truck, label: "Transferencias", href: "/transfers" },
  { key: "suppliers", icon: Building2, label: "Proveedores", href: "/suppliers" },
  { key: "invoices", icon: Receipt, label: "Facturas", href: "/invoices" },
  { key: "reports", icon: BarChart3, label: "Reportes", href: "/reports" },
  { key: "settings", icon: Settings, label: "Configuración", href: "/settings" },
];

export function WarehouseSidebar({ isOpen = false, onClose }: WarehouseSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isActive = (key: string) => {
    if (key === "dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(`/${key}`);
  };

  const sidebarWidth = collapsed ? 68 : 240;

  // Solo ocultar en mobile cuando isOpen es false
  const shouldHideSidebar = isMobile && !isOpen;

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          style={{ display: isMobile ? 'block' : 'none' }}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-800 bg-zinc-950"
        style={{
          width: `${sidebarWidth}px`,
          transform: shouldHideSidebar ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-zinc-800 px-3">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-semibold text-white truncate">Stocker</span>
                <span className="text-[10px] text-emerald-400 -mt-0.5">Depósito</span>
              </div>
            )}
          </Link>
          
          {/* Desktop collapse button */}
          {!isMobile && (
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
          
          {/* Mobile close button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800 ml-auto shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.key);

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={isMobile ? onClose : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
                    collapsed && !isMobile && "justify-center px-2"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-zinc-800 p-3">
          {user && !collapsed && (
            <div className="mb-2 rounded-lg bg-zinc-900 px-3 py-2 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name || "Usuario"}</div>
              <div className="text-xs text-emerald-400">Almacén</div>
            </div>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10",
              collapsed && !isMobile ? "justify-center px-2" : "justify-start gap-3"
            )}
            onClick={logout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
