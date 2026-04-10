"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: KPICardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition-all duration-200",
      "hover:border-emerald-500/30 hover:bg-zinc-900",
      className
    )}>
      {/* Top glow on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-400 mb-1.5">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-white">
              {value}
            </h3>
            {trend && (
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trend.isPositive ? "text-emerald-400" : "text-red-400"
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          "bg-emerald-500/10 text-emerald-400 transition-transform group-hover:scale-105"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}