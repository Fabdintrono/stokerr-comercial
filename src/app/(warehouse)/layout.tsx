"use client";

import { useState, ReactNode } from "react";
import { WarehouseSidebar } from "@/components/layout/WarehouseSidebar";
import { WarehouseHeader } from "@/components/layout/WarehouseHeader";
import { Toaster } from "react-hot-toast";

interface WarehouseLayoutProps {
  children: ReactNode;
}

export default function WarehouseLayout({ children }: WarehouseLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-zinc-950">
        {/* Sidebar - hidden on mobile by default */}
        <WarehouseSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <WarehouseHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </>
  );
}