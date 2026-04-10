"use client";

import { useState, ReactNode } from "react";
import { SuperAdminSidebar } from "@/components/layout/SuperAdminSidebar";
import { SuperAdminHeader } from "@/components/layout/SuperAdminHeader";
import { Toaster } from "react-hot-toast";

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="flex h-screen bg-zinc-950">
        {/* Sidebar */}
        <SuperAdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <SuperAdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </>
  );
}