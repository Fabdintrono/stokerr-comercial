"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";
import { Settings, User, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-zinc-400">Preferencias de tu cuenta y del depósito</p>
      </div>

      {/* Profile */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-400" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-emerald-400">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <p className="font-medium text-white">{user?.name}</p>
              <p className="text-sm text-zinc-400">{user?.email}</p>
              <p className="text-xs text-emerald-400 mt-0.5">Gestor de Depósito</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nombre</Label>
              <Input
                defaultValue={user?.name || ""}
                className="bg-zinc-800/50 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Email</Label>
              <Input
                defaultValue={user?.email || ""}
                disabled
                className="bg-zinc-800/50 border-zinc-700 text-zinc-400"
              />
            </div>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-400" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: "Alertas de stock bajo", desc: "Recibe avisos cuando un producto esté bajo el mínimo", defaultChecked: true },
              { label: "Nuevas facturas", desc: "Notificaciones al recibir nuevas facturas de proveedores", defaultChecked: true },
              { label: "Transferencias completadas", desc: "Avisos cuando se complete una transferencia", defaultChecked: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-zinc-400">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={item.defaultChecked} className="sr-only peer" />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Contraseña actual</Label>
            <Input type="password" placeholder="••••••••" className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nueva contraseña</Label>
              <Input type="password" placeholder="••••••••" className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Confirmar contraseña</Label>
              <Input type="password" placeholder="••••••••" className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500" />
            </div>
          </div>
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
            Cambiar contraseña
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
