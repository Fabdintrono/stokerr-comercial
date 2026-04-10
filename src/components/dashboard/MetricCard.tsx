"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
    label?: string;
  };
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = "text-primary",
  className,
}: MetricCardProps) {
  const TrendIcon = change?.type === "increase" 
    ? TrendingUp 
    : change?.type === "decrease" 
      ? TrendingDown 
      : Minus;

  const trendColor = change?.type === "increase"
    ? "text-emerald-500"
    : change?.type === "decrease"
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {change && (
                <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(change.value)}%</span>
                </div>
              )}
            </div>
            {change?.label && (
              <p className="text-xs text-muted-foreground">{change.label}</p>
            )}
          </div>
          <div className={cn("rounded-lg bg-primary/10 p-2.5", iconColor.replace('text-', 'bg-').replace(/text-.*/, 'bg-primary/10'))}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
        {/* Subtle gradient accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </CardContent>
    </Card>
  );
}