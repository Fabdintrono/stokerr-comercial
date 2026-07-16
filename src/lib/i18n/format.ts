// src/lib/i18n/format.ts
import type { Locale } from './normalizeLocale'

const INTL_LOCALE: Record<Locale, string> = { es: 'es-ES', pt: 'pt-BR', en: 'en-US' }

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(n)
}

export function formatDate(date: Date, locale: Locale, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], opts ?? { timeZone: 'UTC' }).format(date)
}
