"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ChevronRight, Store, Warehouse, Loader2 } from "lucide-react";

interface BusinessLocation {
  id: string;
  name: string;
  type: string;
}

interface Business {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  role: string;
  locations: BusinessLocation[];
}

function getRedirectPath(userRole: string): string {
  if (userRole === "SUPER_ADMIN") return "/super-admin/clients";
  if (userRole === "WAREHOUSE_MANAGER") return "/warehouse/dashboard";
  if (userRole === "RESTAURANT_MANAGER") return "/restaurant";
  if (userRole === "CASHIER") return "/pos";
  return "/warehouse/dashboard";
}

export default function SelectBusinessPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch session and businesses in parallel
        const [sessionRes, bizRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/auth/business"),
        ]);

        if (sessionRes.ok) {
          const session = await sessionRes.json();
          if (session?.user?.role) setUserRole(session.user.role);
        }

        if (bizRes.ok) {
          const data = await bizRes.json();
          const active = (data.businesses || []).filter((b: Business) => b.active);
          setBusinesses(active);

          if (active.length === 1) {
            // Get role from session before auto-selecting
            const session = await fetch("/api/auth/session").then((r) => r.json());
            const role = session?.user?.role || "";
            await doSelect(active[0].id, role);
          }
        }
      } catch {
        console.error("Error fetching data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const doSelect = async (businessId: string, role: string) => {
    try {
      const res = await fetch("/api/auth/select-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (res.ok) {
        router.push(getRedirectPath(role));
      }
    } catch {
      // ignore
    }
  };

  const handleSelect = async (businessId: string) => {
    setSelecting(businessId);
    try {
      await doSelect(businessId, userRole);
    } catch {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Sin acceso</h1>
          <p className="text-zinc-400 mt-2">No tienes negocios asignados. Contacta al administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950 to-zinc-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-2xl p-6 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Selecciona tu negocio</h1>
          <p className="text-zinc-400 mt-2">Tienes acceso a los siguientes negocios</p>
        </div>

        <div className="space-y-4">
          {businesses.map((business) => (
            <Card
              key={business.id}
              className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer"
              onClick={() => !selecting && handleSelect(business.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Store className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">{business.name}</CardTitle>
                      <CardDescription className="text-zinc-500">
                        {business.role === "OWNER" ? "Propietario" : business.role === "MANAGER" ? "Gerente" : "Empleado"}
                        {" - "}
                        <span className="text-emerald-400">{business.plan}</span>
                      </CardDescription>
                    </div>
                  </div>
                  {selecting === business.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-zinc-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {business.locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800 text-xs text-zinc-400"
                    >
                      {location.type === "WAREHOUSE" ? (
                        <Warehouse className="h-3 w-3" />
                      ) : (
                        <Building2 className="h-3 w-3" />
                      )}
                      {location.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
