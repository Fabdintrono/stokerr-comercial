"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2 } from "lucide-react";

export default function BusinessDashboardRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }

    switch (user.role) {
      case "SUPER_ADMIN":        router.push("/super-admin/clients"); break;
      case "WAREHOUSE_MANAGER":  router.push("/warehouse/dashboard"); break;
      case "RESTAURANT_MANAGER": router.push("/restaurant"); break;
      case "CASHIER":            router.push("/pos"); break;
      case "WAITER":             router.push("/waiter"); break;
      default:                   router.push("/business/select-business"); break;
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
    </div>
  );
}
