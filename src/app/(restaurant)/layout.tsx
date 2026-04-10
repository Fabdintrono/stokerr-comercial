"use client";

import { ReactNode } from "react";
import { RestaurantSidebar } from "@/components/layout/RestaurantSidebar";
import { RestaurantHeader } from "@/components/layout/RestaurantHeader";

interface RestaurantLayoutProps {
  children: ReactNode;
}

export default function RestaurantLayout({ children }: RestaurantLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <RestaurantSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <RestaurantHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}