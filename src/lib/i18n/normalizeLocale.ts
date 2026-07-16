// src/lib/i18n/normalizeLocale.ts
export type Locale = 'es' | 'pt' | 'en'
export const LOCALES: Locale[] = ['es', 'pt', 'en']
export const DEFAULT_LOCALE: Locale = 'es'

export function normalizeLocale(raw: string | null | undefined): Locale {
  if (!raw) return DEFAULT_LOCALE
  const short = raw.slice(0, 2).toLowerCase()
  return (LOCALES as string[]).includes(short) ? (short as Locale) : DEFAULT_LOCALE
}
