"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DataTableProps {
  title: string;
  headers: string[];
  rows: (string | ReactNode)[][];
  action?: ReactNode;
  className?: string;
}

export function DataTable({ title, headers, rows, action, className }: DataTableProps) {
  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-border/50">
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="hover:bg-muted/50 transition-colors"
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        "px-6 py-3 text-sm",
                        j === 0 ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}