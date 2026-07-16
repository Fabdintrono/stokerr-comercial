// src/lib/i18n/tServer.ts
import es from '../../../locales/es.json'
import pt from '../../../locales/pt.json'
import en from '../../../locales/en.json'
import type { Locale } from './normalizeLocale'

const DICTS: Record<Locale, Record<string, unknown>> = { es, pt, en }

function lookup(dict: Record<string, unknown>, key: string): string | undefined {
  let value: unknown = dict
  for (const k of key.split('.')) {
    if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[k]
    } else {
      return undefined
    }
  }
  return typeof value === 'string' ? value : undefined
}

export function tServer(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = lookup(DICTS[locale], key) ?? lookup(DICTS.es, key) ?? key
  if (!vars) return raw
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    raw,
  )
}
