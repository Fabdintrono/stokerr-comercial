"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Plus, Loader2, Users, X, QrCode, ExternalLink,
  Monitor, RefreshCw, Download, Copy, Check,
} from "lucide-react";
import toast from "react-hot-toast";
import QRCode from "qrcode";

interface Table {
  id: string;
  number: string;
  capacity: number;
  isActive: boolean;
  qrToken: string;
  orders: { id: string; status: string }[];
}

interface LocationInfo {
  id: string;
  kitchenToken: string;
  name: string;
}

function useBaseUrl() {
  const [base, setBase] = useState("");
  useEffect(() => { setBase(window.location.origin); }, []);
  return base;
}

export default function TablesPage() {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [creating, setCreating] = useState(false);

  // QR overlay
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copiedKitchen, setCopiedKitchen] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const baseUrl = useBaseUrl();

  // Load location + tables
  const fetchAll = useCallback(async () => {
    try {
      const bizRes = await fetch("/api/auth/business");
      if (!bizRes.ok) return;
      const bizData = await bizRes.json();
      const biz = bizData.businesses?.[0];
      const loc = biz?.locations?.find((l: any) => l.type === "RESTAURANT");
      if (!loc) return;

      setLocation({ id: loc.id, kitchenToken: loc.kitchenToken, name: loc.name });

      const tabRes = await fetch(`/api/tables?locationId=${loc.id}`);
      if (tabRes.ok) {
        const d = await tabRes.json();
        setTables(d.data || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Generate QR canvas when table is selected
  useEffect(() => {
    if (!qrTable || !baseUrl) return;
    const url = `${baseUrl}/mesa/${qrTable.qrToken}`;
    QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: "#ffffff", light: "#18181b" },
    }).then(setQrDataUrl).catch(() => {});
  }, [qrTable, baseUrl]);

  const createTable = async () => {
    if (!newNumber || !location) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: newNumber, capacity: parseInt(newCapacity) || 4, locationId: location.id }),
      });
      if (res.ok) {
        toast.success(`Mesa ${newNumber} creada`);
        setShowCreate(false);
        setNewNumber("");
        setNewCapacity("4");
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error");
      }
    } catch { toast.error("Error al crear mesa"); }
    setCreating(false);
  };

  const regenerateQr = async (table: Table) => {
    setRegenerating(table.id);
    try {
      const res = await fetch(`/api/tables/${table.id}/regenerate-token`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        const updated = { ...table, qrToken: d.qrToken };
        setTables(prev => prev.map(t => t.id === table.id ? updated : t));
        setQrTable(updated);
        toast.success("QR regenerado");
      } else {
        toast.error("Error al regenerar QR");
      }
    } catch { toast.error("Error de conexión"); }
    setRegenerating(null);
  };

  const downloadQr = () => {
    if (!qrDataUrl || !qrTable) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `mesa-${qrTable.number}-qr.png`;
    a.click();
  };

  const copyKitchenUrl = () => {
    if (!location) return;
    navigator.clipboard.writeText(`${baseUrl}/cocina/${location.kitchenToken}`);
    setCopiedKitchen(true);
    setTimeout(() => setCopiedKitchen(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const kitchenUrl = location ? `${baseUrl}/cocina/${location.kitchenToken}` : "";

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Mesas</h1>
          <p className="text-xs text-zinc-500">{tables.length} mesas configuradas</p>
        </div>
        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Nueva Mesa
        </Button>
      </div>

      {/* Kitchen display link */}
      {location && baseUrl && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Monitor className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Pantalla de Cocina</p>
            <p className="text-xs text-zinc-500 truncate font-mono mt-0.5">{kitchenUrl}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={copyKitchenUrl}
              title="Copiar URL"
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all"
            >
              {copiedKitchen ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
            <a
              href={kitchenUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all"
              title="Abrir en nueva pestaña"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* Tables grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tables.map(table => {
          const isOccupied = table.orders.some(o => ["OPEN", "PREPARING", "SERVED"].includes(o.status));
          return (
            <div
              key={table.id}
              className={cn(
                "rounded-xl border p-4 text-center transition-all group relative",
                isOccupied
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
              )}
            >
              <p className="text-2xl font-bold text-white">{table.number}</p>
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-zinc-500">
                <Users className="h-3 w-3" />
                {table.capacity}
              </div>
              <p className={cn("text-xs mt-1 font-medium", isOccupied ? "text-amber-400" : "text-emerald-400")}>
                {isOccupied ? "Ocupada" : "Libre"}
              </p>
              <button
                onClick={() => setQrTable(table)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 text-xs font-semibold transition-all"
              >
                <QrCode className="h-3.5 w-3.5" />
                QR
              </button>
            </div>
          );
        })}
        {tables.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-zinc-500">
            Sin mesas. Crea la primera mesa para empezar.
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Nueva Mesa</h3>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400" onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-zinc-300">Número</Label>
                <Input
                  value={newNumber}
                  onChange={e => setNewNumber(e.target.value)}
                  placeholder="Ej: 1, A1, Terraza 1"
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Capacidad</Label>
                <Input
                  type="number"
                  value={newCapacity}
                  onChange={e => setNewCapacity(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                />
              </div>
            </div>
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={!newNumber || creating}
              onClick={createTable}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear Mesa
            </Button>
          </div>
        </div>
      )}

      {/* ── QR MODAL ── */}
      {qrTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setQrTable(null); }}
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white">Mesa {qrTable.number} — QR</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Escanear para ver la cuenta</p>
              </div>
              <button
                onClick={() => setQrTable(null)}
                className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col items-center gap-4">
              {/* QR image */}
              {qrDataUrl ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-700 p-2 bg-zinc-800">
                  <img src={qrDataUrl} alt={`QR Mesa ${qrTable.number}`} className="w-64 h-64" />
                </div>
              ) : (
                <div className="w-64 h-64 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
                </div>
              )}

              {/* URL */}
              {baseUrl && (
                <div className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2">
                  <p className="text-xs text-zinc-600 font-mono break-all text-center">
                    {baseUrl}/mesa/{qrTable.qrToken}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={downloadQr}
                  disabled={!qrDataUrl}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </button>
                <button
                  onClick={() => regenerateQr(qrTable)}
                  disabled={regenerating === qrTable.id}
                  title="Regenerar token (invalida el QR anterior)"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-all disabled:opacity-50"
                >
                  {regenerating === qrTable.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <RefreshCw className="h-4 w-4" />
                  }
                </button>
              </div>
              <p className="text-xs text-zinc-700 text-center">
                Regenerar invalida el QR anterior permanentemente.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
