"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, Store, Warehouse } from "lucide-react";

// Mock data - en producción vendría de la API
const mockBusinesses = [
  {
    id: "cmnr579lz000094pjbliw909u",
    name: "Restaurante Demo",
    slug: "demo",
    role: "OWNER",
    locations: [
      { id: "1", name: "Armazém Central", type: "WAREHOUSE" },
      { id: "2", name: "Restaurante Chiado", type: "RESTAURANT" },
      { id: "3", name: "Restaurante Bairro Alto", type: "RESTAURANT" },
    ],
  },
];

export default function SelectBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectBusiness = (businessId: string) => {
    setLoading(businessId);
    // En producción, guardar el businessId en session/cookie
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950 to-zinc-950" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-2xl p-6 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Selecciona tu negocio</h1>
          <p className="text-zinc-400 mt-2">Tienes acceso a los siguientes negocios</p>
        </div>

        <div className="space-y-4">
          {mockBusinesses.map((business) => (
            <Card
              key={business.id}
              className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer"
              onClick={() => handleSelectBusiness(business.id)}
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
                        {business.role === "OWNER" ? "Propietario" : business.role === "MANAGER" ? "Gerente" : "Contador"}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-500" />
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

        <p className="text-center text-sm text-zinc-500 mt-6">
          ¿Necesitas acceso a otro negocio?{" "}
          <a href="/support" className="text-emerald-400 hover:text-emerald-300">
            Solicitar acceso
          </a>
        </p>
      </div>
    </div>
  );
}