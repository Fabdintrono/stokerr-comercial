"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

const languages = [
  { code: "pt-PT", label: "Português", flag: "🇵🇹" },
  { code: "es-ES", label: "Español", flag: "🇪🇸" },
  { code: "en-GB", label: "English", flag: "🇬🇧" },
];

export function LanguageSelector() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  // Usar el idioma seleccionado localmente o el del usuario
  const currentLangCode = selectedLang || user?.language || "pt-PT";
  const currentLang = languages.find((l) => l.code === currentLangCode) || languages[0];

  const handleChangeLanguage = async (code: string) => {
    if (code === currentLangCode) return;

    setLoading(true);
    try {
      const response = await fetch("/api/users/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: code }),
      });

      if (!response.ok) throw new Error("Error al guardar");

      // Actualizar el estado local inmediatamente
      setSelectedLang(code);
      
      // Guardar en localStorage para persistencia
      localStorage.setItem("userLanguage", code);
      
      // Actualizar el atributo lang del documento HTML
      document.documentElement.lang = code.split("-")[0];
      
      toast.success("Idioma actualizado");
    } catch (error) {
      toast.error("Error al guardar el idioma");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
          disabled={loading}
        >
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-zinc-900 border-zinc-800">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChangeLanguage(lang.code)}
            className="text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center justify-between"
          >
            <span>
              {lang.flag} {lang.label}
            </span>
            {currentLang.code === lang.code && (
              <Check className="h-4 w-4 text-emerald-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}