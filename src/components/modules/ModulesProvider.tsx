'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { ModuleKey } from '@/lib/modules/registry'

interface Ctx { modules: Set<ModuleKey>; loading: boolean; has: (k: ModuleKey) => boolean }
const ModulesContext = createContext<Ctx>({ modules: new Set(), loading: true, has: () => false })

export function ModulesProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<Set<ModuleKey>>(new Set())
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/me/modules').then(r => r.json())
      .then(d => setModules(new Set(d.modules ?? [])))
      .catch(() => setModules(new Set()))
      .finally(() => setLoading(false))
  }, [])
  return (
    <ModulesContext.Provider value={{ modules, loading, has: k => modules.has(k) }}>
      {children}
    </ModulesContext.Provider>
  )
}
export const useModules = () => useContext(ModulesContext)
