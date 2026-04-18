"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RestaurantSidebar } from "@/components/layout/RestaurantSidebar";
import { RestaurantHeader } from "@/components/layout/RestaurantHeader";
import { Toaster } from "react-hot-toast";

interface RestaurantLayoutProps {
  children: ReactNode;
}

export default function RestaurantLayout({ children }: RestaurantLayoutProps) {
  const [businessReady, setBusinessReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function selectBusiness() {
      try {
        const res = await fetch("/api/auth/business");
        if (!res.ok) throw new Error("No se pudo obtener negocios");
        const data = await res.json();

        const businesses = data.businesses || [];
        if (businesses.length === 0) {
          router.push("/login");
          return;
        }

        const business = businesses[0];

        await fetch("/api/auth/select-business", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: business.id }),
        });

        // Store the restaurant locationId in a client-accessible cookie
        // so child pages can read it synchronously without a second fetch
        const restLoc = (business.locations || []).find(
          (l: { type: string; isActive?: boolean }) => l.type === "RESTAURANT" && l.isActive !== false
        );
        if (restLoc) {
          document.cookie = `locationId=${restLoc.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
        }

        setBusinessReady(true);
      } catch (err) {
        console.error("Error auto-selecting business:", err);
        setBusinessReady(true);
      }
    }

    selectBusiness();
  }, [router]);

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-zinc-950">
        <RestaurantSidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <RestaurantHeader />
          <main className="flex-1 overflow-y-auto">
            {businessReady ? children : (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
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
