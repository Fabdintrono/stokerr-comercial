"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BusinessSidebar } from "@/components/layout/BusinessSidebar";
import { BusinessHeader } from "@/components/layout/BusinessHeader";

interface BusinessLayoutProps {
  children: ReactNode;
}

export default function BusinessLayout({ children }: BusinessLayoutProps) {
  const pathname = usePathname();

  // select-business is a standalone page — no sidebar/header
  if (pathname === "/business/select-business") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <BusinessSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BusinessHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
