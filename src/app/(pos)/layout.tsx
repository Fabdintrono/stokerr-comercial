"use client";

import { ReactNode } from "react";
import { POSHeader } from "@/components/layout/POSHeader";

interface POSLayoutProps {
  children: ReactNode;
}

export default function POSLayout({ children }: POSLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">
      <POSHeader />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}