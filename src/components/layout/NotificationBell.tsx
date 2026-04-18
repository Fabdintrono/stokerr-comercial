"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Package, Truck, RefreshCcw, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  locationId: string | null;
  entityId: string | null;
  createdAt: string;
}

interface NotificationBellProps {
  locationId?: string | null;
  color?: "emerald" | "amber";
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

const TYPE_ICONS: Record<string, any> = {
  REPLENISHMENT_REQUEST: RefreshCcw,
  REPLENISHMENT_UPDATED: RefreshCcw,
  TRANSFER_INCOMING: Truck,
  LOW_STOCK: AlertTriangle,
};

const TYPE_LINKS: Record<string, string> = {
  REPLENISHMENT_REQUEST: "/warehouse/replenishment",
  REPLENISHMENT_UPDATED: "/restaurant/inventory/replenishment",
  TRANSFER_INCOMING: "/restaurant/transfers",
  LOW_STOCK: "/warehouse/products",
};

const TYPE_COLORS: Record<string, string> = {
  REPLENISHMENT_REQUEST: "text-blue-400",
  REPLENISHMENT_UPDATED: "text-emerald-400",
  TRANSFER_INCOMING: "text-amber-400",
  LOW_STOCK: "text-red-400",
};

export function NotificationBell({ locationId, color = "emerald" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const prevUnreadRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const accentCls = color === "amber"
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

  const fetch_ = useCallback(async () => {
    try {
      const url = locationId ? `/api/notifications?locationId=${locationId}` : "/api/notifications";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const notifs: Notification[] = data.notifications || [];
      setNotifications(notifs);

      const unreadCount = notifs.filter(n => !n.read).length;
      if (unreadCount > prevUnreadRef.current && prevUnreadRef.current !== -1) {
        playBeep();
      }
      prevUnreadRef.current = unreadCount;
    } catch {}
  }, [locationId]);

  useEffect(() => {
    // Initial fetch — don't beep on first load
    prevUnreadRef.current = -1;
    fetch_().then(() => {
      // After first fetch, prevUnreadRef is set to actual count, reset flag
      setTimeout(() => {
        prevUnreadRef.current = notifications.filter(n => !n.read).length;
      }, 100);
    });
    const interval = setInterval(fetch_, 20000);
    return () => clearInterval(interval);
  }, [fetch_]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAllRead() {
    const ids = notifications.filter(n => !n.read).map(n => n.id);
    if (ids.length === 0) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    prevUnreadRef.current = 0;
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className={cn("h-9 w-9 relative", color === "amber" ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white",
            color === "amber" ? "bg-amber-500" : "bg-emerald-500"
          )}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-sm font-semibold text-white">
              Notificaciones {unreadCount > 0 && <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium border", accentCls)}>{unreadCount}</span>}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Leer todo
                </button>
              )}
              <button onClick={() => setOpen(false)} className="ml-2 text-zinc-600 hover:text-zinc-400">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">Sin notificaciones</div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                const iconCls = TYPE_COLORS[n.type] || "text-zinc-400";
                const href = TYPE_LINKS[n.type];
                return (
                  <div
                    key={n.id}
                    className={cn("flex items-start gap-3 px-4 py-3 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-800/50 transition-colors", !n.read && "bg-zinc-800/30")}
                    onClick={() => { markOneRead(n.id); setOpen(false); }}
                  >
                    <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800", !n.read && "bg-zinc-700")}>
                      <Icon className={cn("h-3.5 w-3.5", iconCls)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-xs font-medium truncate", n.read ? "text-zinc-400" : "text-white")}>{n.title}</p>
                        {!n.read && <div className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", color === "amber" ? "bg-amber-500" : "bg-emerald-500")} />}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {new Date(n.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
