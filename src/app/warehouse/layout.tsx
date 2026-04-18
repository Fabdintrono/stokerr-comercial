"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { WarehouseSidebar } from "@/components/layout/WarehouseSidebar";
import { WarehouseHeader } from "@/components/layout/WarehouseHeader";
import { Toaster } from "react-hot-toast";

interface WarehouseLayoutProps {
  children: ReactNode;
}

export default function WarehouseLayout({ children }: WarehouseLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessReady, setBusinessReady] = useState(false);
  const router = useRouter();

  // Auto-select business for warehouse managers on mount
  useEffect(() => {
    async function selectBusiness() {
      try {
        // Fetch user's businesses
        const res = await fetch("/api/auth/business");
        if (!res.ok) throw new Error("No se pudo obtener negocios");
        const data = await res.json();

        const businesses = data.businesses || [];
        if (businesses.length === 0) {
          router.push("/login");
          return;
        }

        // Auto-select the first business
        const business = businesses[0];
        await fetch("/api/auth/select-business", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: business.id }),
        });

        setBusinessReady(true);
      } catch (err) {
        console.error("Error auto-selecting business:", err);
        setBusinessReady(true); // Still render even on error
      }
    }

    selectBusiness();
  }, [router]);

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-zinc-950">
        <WarehouseSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <WarehouseHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto">
            {businessReady ? children : (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                  <p className="text-sm text-zinc-400">Cargando...</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </>
  );
}
