"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useI18n } from "@/lib/i18n";
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
import { Bell, Globe, User, Settings, LogOut, Search, ChevronDown } from "lucide-react";
import Link from "next/link";

export function AdminHeader() {
  const { user, logout } = useAuth();
  const { locale, setLocale } = useI18n();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-6">
        {/* Left - Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">
            Panel de Administración
          </h1>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800">
                <Globe className="h-3.5 w-3.5" />
                <span className="text-xs">{locale === 'pt' ? '🇧🇷' : '🇪🇸'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={() => setLocale('pt')} className="text-sm text-zinc-300 hover:text-white hover:bg-zinc-800">
                🇧🇷 Português
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('es')} className="text-sm text-zinc-300 hover:text-white hover:bg-zinc-800">
                🇪🇸 Español
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
            <Bell className="h-4 w-4" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-2 px-2 hover:bg-zinc-800">
                <Avatar className="h-6 w-6 border border-zinc-700">
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">
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