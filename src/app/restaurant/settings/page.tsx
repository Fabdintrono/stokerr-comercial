"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { User, Mail, Phone, Lock } from "lucide-react";

export default function RestaurantSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Perfil y preferencias de tu cuenta</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300">Información de cuenta</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 mb-0.5">Nombre</p>
              <p className="text-sm font-medium text-white truncate">{user?.name || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <Mail className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 mb-0.5">Email</p>
              <p className="text-sm font-medium text-white truncate">{user?.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <Lock className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 mb-0.5">Rol</p>
              <p className="text-sm font-medium text-white">Gerente de Restaurante</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
