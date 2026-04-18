"use client";

import { useState, useEffect, ReactNode } from "react";
import { Toaster } from "react-hot-toast";

export default function POSLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initBusiness() {
      try {
        const res = await fetch("/api/auth/business");
        if (res.ok) {
          const data = await res.json();
          const business = data.businesses?.[0];
          if (business) {
            await fetch("/api/auth/select-business", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ businessId: business.id }),
            });

            const restLoc = (business.locations || []).find(
              (l: { type: string; isActive?: boolean }) =>
                l.type === "RESTAURANT" && l.isActive !== false
            );
            if (restLoc) {
              document.cookie = `locationId=${restLoc.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
            }
          }
        }
      } catch { /* silent */ }
      setReady(true);
    }
    initBusiness();
  }, []);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="h-screen overflow-hidden bg-zinc-950">{children}</div>
      <Toaster position="bottom-right" />
    </>
  );
}
