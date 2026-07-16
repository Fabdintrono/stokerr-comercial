'use client'
import { ModuleGate } from '@/components/modules/ModuleGate'

export default function FinancePage() {
  return (
    <ModuleGate module="FINANCE">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center p-8">
        <h1 className="text-2xl font-bold text-foreground">Finanzas</h1>
        <p className="text-muted-foreground">Módulo activo. Funcionalidad próximamente.</p>
      </div>
    </ModuleGate>
  )
}
