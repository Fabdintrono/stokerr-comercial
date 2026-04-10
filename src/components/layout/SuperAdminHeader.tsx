"use client";

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
import { Bell, User, Settings, LogOut, ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { LanguageSelector } from "./LanguageSelector";

interface SuperAdminHeaderProps {
  onMenuToggle?: () => void;
}

export function SuperAdminHeader({ onMenuToggle }: SuperAdminHeaderProps) {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SA";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        {/* Left - Menu button (mobile) + Title */}
        <div className="flex items-center gap-3">
          {/* Botón hamburguesa para mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <h1 className="text-lg font-semibold text-white">
            Panel de Administración
          </h1>
          <span className="hidden sm:inline-flex text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Super Admin
          </span>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <LanguageSelector />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] bg-red-500 text-white rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-zinc-800">
              <DropdownMenuLabel className="py-2">
                <p className="text-sm font-medium text-white">Notificaciones</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <div className="max-h-64 overflow-y-auto">
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800">
                  <span className="text-sm">Nueva suscripción activada</span>
                  <span className="text-xs text-zinc-500">Restaurante Chiado - hace 5 min</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800">
                  <span className="text-sm">Licencia próxima a expirar</span>
                  <span className="text-xs text-zinc-500">Pizzeria Center - hace 1 hora</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800">
                  <span className="text-sm">Nuevo ticket de soporte</span>
                  <span className="text-xs text-zinc-500">Café Lisboa - hace 2 horas</span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem className="text-sm text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800 justify-center">
                Ver todas las notificaciones
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-2 px-2 hover:bg-zinc-800">
                <Avatar className="h-6 w-6 border border-zinc-700">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-xs font-medium text-white">{user?.name?.split(" ")[0] || "Admin"}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800">
              <DropdownMenuLabel className="py-2">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="text-sm text-zinc-300 hover:text-white">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="text-sm text-zinc-300 hover:text-white">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={logout} className="text-red-400 hover:bg-red-500/10 text-sm">
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