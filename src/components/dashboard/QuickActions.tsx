"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  onClick?: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <Button
            key={i}
            variant={action.variant || "outline"}
            size="sm"
            className="h-9 gap-2"
            onClick={action.onClick}
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}