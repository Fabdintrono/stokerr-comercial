'use client'
import { ModuleGate } from '@/components/modules/ModuleGate'

export default function CRMPage() {
  return (
    <ModuleGate module="CRM">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center p-8">
        <h1 className="text-2xl font-bold text-foreground">CRM</h1>
        <p className="text-muted-foreground">Módulo activo. Funcionalidad próximamente.</p>
      </div>
    </ModuleGate>
  )
}
