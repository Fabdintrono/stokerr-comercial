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
import { Bell, Globe, User, Settings, LogOut, Moon, Sun, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

interface HeaderProps {
  onMenuClick?: () => void;
}

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/products": "Productos",
  "/inventory": "Inventario",
  "/pos": "POS",
  "/orders": "Pedidos",
  "/reports": "Reportes",
  "/users": "Usuarios",
  "/restaurants": "Restaurantes",
  "/settings": "Configuración",
};

const languageOptions = [
  { code: "pt", name: "PT", flag: "🇧🇷" },
  { code: "es", name: "ES", flag: "🇪🇸" },
];

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { locale, setLocale } = useI18n();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const getPageTitle = () => {
    const route = Object.keys(pageTitles).find(path => {
      if (path === "/") return pathname === "/";
      return pathname.startsWith(path);
    });
    return route ? pageTitles[route] : "Dashboard";
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const currentLanguage = languageOptions.find(l => l.code === locale) || languageOptions[0];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left side - Search */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-sm w-64 hover:border-zinc-700 hover:text-zinc-400 transition-colors cursor-pointer">
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Buscar productos, pedidos...</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-zinc-500">⌘K</kbd>
          </div>
          
          {/* Mobile title */}
          <span className="font-medium md:hidden text-white">{getPageTitle()}</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800">
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">{currentLanguage.flag}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-zinc-900 border-zinc-800">
              {languageOptions.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLocale(lang.code as "pt" | "es")}
                  className="flex items-center justify-between text-sm text-zinc-300 hover:text-white hover:bg-zinc-800"
                >
                  <span>{lang.flag} {lang.name}</span>
                  {locale === lang.code && (
                    <span className="text-emerald-400 text-xs">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-medium text-white shadow-lg shadow-emerald-500/25">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-zinc-900 border-zinc-800">
              <DropdownMenuLabel className="flex items-center justify-between py-2">
                <span className="font-semibold text-white">Notificaciones</span>
                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-zinc-400 hover:text-white">
                  Marcar leídas
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              {[
                { title: "Stock bajo", desc: "5 productos en alerta", time: "5m", color: "bg-amber-500" },
                { title: "Nuevo pedido", desc: "Restaurante La Esquina", time: "15m", color: "bg-emerald-500" },
                { title: "Backup completado", desc: "Sincronización exitosa", time: "1h", color: "bg-blue-500" },
              ].map((notif, i) => (
                <DropdownMenuItem key={i} className="flex items-start gap-3 py-3 cursor-pointer text-zinc-300 hover:text-white hover:bg-zinc-800">
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${notif.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium">{notif.title}</span>
                      <span className="text-[10px] text-zinc-500 shrink-0">{notif.time}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{notif.desc}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 gap-2 px-2 hover:bg-zinc-800">
                <Avatar className="h-6 w-6 border border-zinc-700">
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-xs font-medium leading-none text-white truncate max-w-[80px]">
                    {user?.name?.split(" ")[0] || "Usuario"}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {user?.role || "employee"}
                  </span>
                </div>
                <ChevronDown className="hidden md:block h-3 w-3 text-zinc-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
              <DropdownMenuLabel className="py-2">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center text-sm text-zinc-300 hover:text-white">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center text-sm text-zinc-300 hover:text-white">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem 
                onClick={logout}
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400 text-sm"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}