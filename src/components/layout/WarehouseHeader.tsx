"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { User, Settings, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useI18n } from "@/lib/i18n";

interface WarehouseHeaderProps {
  onMenuToggle?: () => void;
}

export function WarehouseHeader({ onMenuToggle }: WarehouseHeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [warehouseLocationId, setWarehouseLocationId] = useState<string | null>(null);
  const [vertical, setVertical] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/business")
      .then((r) => r.json())
      .then((data) => {
        const biz = data.businesses?.[0];
        if (biz?.vertical) setVertical(biz.vertical);
        const wh = (biz?.locations || []).find(
          (l: any) => l.type === "WAREHOUSE" && l.isActive !== false
        );
        if (wh) setWarehouseLocationId(wh.id);
      })
      .catch(() => {});
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "W";

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left side - Menu + Title */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="md:hidden h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <h1 className="text-base md:text-lg font-semibold text-white truncate">
            {t(`vertical.shellTitle.${vertical ?? 'RETAIL'}`)}
          </h1>
        </div>

        {/* Right side - Notifications + User */}
        <div className="flex items-center gap-1 md:gap-2">
          <NotificationBell locationId={warehouseLocationId} color="emerald" />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2 hover:bg-zinc-800">
                <Avatar className="h-7 w-7 border border-zinc-700">
                  <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium text-white truncate max-w-[100px]">
                  {user?.name?.split(" ")[0] || "Usuario"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800">
              <DropdownMenuLabel className="py-2">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem asChild className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem 
                onClick={logout} 
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}