"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { ShoppingCart, LogOut, Clock } from "lucide-react";
import { useState, useEffect } from "react";

export function POSHeader() {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6">
      {/* Left - Logo & Restaurant */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white">Stocker POS</span>
          <span className="text-xs text-zinc-500">Restaurante Chiado</span>
        </div>
      </div>

      {/* Center - Time */}
      <div className="flex items-center gap-2 text-zinc-400">
        <Clock className="h-4 w-4" />
        <span className="text-lg font-mono">
          {currentTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Right - User & Actions */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-white">{user?.name?.split(" ")[0] || "Cajero"}</div>
          <div className="text-xs text-zinc-500">{user?.role || "CASHIER"}</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}