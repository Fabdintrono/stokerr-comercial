"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Shield, Palette, Database } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // TODO: Conectar con API real
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
    },
    appearance: {
      darkMode: true,
      compactMode: false,
    },
  });

  const handleSave = async () => {
    setLoading(true);
    // TODO: Implementar guardado
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración</h1>
          <p className="text-sm text-zinc-400">
            Ajustes de la plataforma Super Admin
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      {/* Notifications */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-white">Notificaciones</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Configura cómo recibes alertas y actualizaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Notificaciones por email</Label>
              <p className="text-xs text-zinc-400">Recibe alertas importantes por correo</p>
            </div>
            <Switch
              checked={settings.notifications.email}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, email: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Notificaciones push</Label>
              <p className="text-xs text-zinc-400">Alertas en tiempo real en el navegador</p>
            </div>
            <Switch
              checked={settings.notifications.push}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, push: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Notificaciones SMS</Label>
              <p className="text-xs text-zinc-400">Alertas críticas por mensaje de texto</p>
            </div>
            <Switch
              checked={settings.notifications.sms}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, sms: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-white">Seguridad</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Configura opciones de seguridad de la cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Autenticación de dos factores</Label>
              <p className="text-xs text-zinc-400">Añade una capa extra de seguridad</p>
            </div>
            <Switch
              checked={settings.security.twoFactor}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  security: { ...settings.security, twoFactor: checked },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Tiempo de sesión (minutos)</Label>
            <Input
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    sessionTimeout: parseInt(e.target.value) || 30,
                  },
                })
              }
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-white">Apariencia</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Personaliza la interfaz de usuario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Modo oscuro</Label>
              <p className="text-xs text-zinc-400">Reduce el brillo de la pantalla</p>
            </div>
            <Switch
              checked={settings.appearance.darkMode}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, darkMode: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Modo compacto</Label>
              <p className="text-xs text-zinc-400">Reduce el espaciado entre elementos</p>
            </div>
            <Switch
              checked={settings.appearance.compactMode}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, compactMode: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-white">Sistema</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            Información de la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-400">Versión</p>
              <p className="text-white font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-zinc-400">Entorno</p>
              <p className="text-white font-medium">Development</p>
            </div>
            <div>
              <p className="text-zinc-400">Base de datos</p>
              <p className="text-white font-medium">PostgreSQL</p>
            </div>
            <div>
              <p className="text-zinc-400">Última actualización</p>
              <p className="text-white font-medium">{new Date().toLocaleDateString("pt-PT")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}