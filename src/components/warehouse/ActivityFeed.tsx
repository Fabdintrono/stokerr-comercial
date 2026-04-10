"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Package, Receipt, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "product" | "invoice" | "stock";
  title: string;
  description: string;
  date: string;
  icon: React.ElementType;
  color: string;
}

const mockActivities: ActivityItem[] = [
  { id: "1", type: "product", title: "Nuevo producto agregado", description: "Harina de Trigo (HAR-001)", date: "Hace 2 horas", icon: Package, color: "bg-emerald-500/10 text-emerald-400" },
  { id: "2", type: "invoice", title: "Factura recibida", description: "FAC-2024-0892 - Distribuidora Central", date: "Hace 4 horas", icon: Receipt, color: "bg-blue-500/10 text-blue-400" },
  { id: "3", type: "stock", title: "Ajuste de stock", description: "Harina de Trigo: +50 kg", date: "Ayer", icon: Activity, color: "bg-amber-500/10 text-amber-400" },
  { id: "4", type: "product", title: "Stock bajo detectado", description: "Aceite de Oliva - Nivel crítico", date: "Ayer", icon: TrendingUp, color: "bg-red-500/10 text-red-400" },
  { id: "5", type: "invoice", title: "Factura pagada", description: "FAC-2024-0890 - Carnes Premium", date: "Hace 2 días", icon: Receipt, color: "bg-emerald-500/10 text-emerald-400" },
];

export function ActivityFeed() {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Actividad Reciente</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-zinc-400">En vivo</span>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-4">
          {mockActivities.map((activity, index) => (
            <div
              key={activity.id}
              className="relative pl-6 pb-4 last:pb-0"
            >
              {/* Line connector */}
              {index !== mockActivities.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-0 w-px bg-zinc-800" />
              )}
              
              {/* Dot */}
              <div className={cn(
                "absolute left-0 top-1 h-5 w-5 rounded-full border-2 border-zinc-900",
                activity.color
              )}>
                <activity.icon className="h-2.5 w-2.5" />
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-zinc-200">
                    {activity.title}
                  </div>
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    {activity.date}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  {activity.description}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <button className="w-full text-center text-sm text-zinc-400 hover:text-emerald-400 transition-colors">
            Ver todas las actividades
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
