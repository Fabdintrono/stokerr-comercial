export type CurrencyCode = 'USD' | 'VES' | 'BRL'

export interface CurrencyMeta {
  symbol: string
  decimals: number
  locale: string
}

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  USD: { symbol: '$', decimals: 2, locale: 'en-US' },
  VES: { symbol: 'Bs', decimals: 0, locale: 'es-VE' },
  BRL: { symbol: 'R$', decimals: 2, locale: 'pt-BR' },
}

export function currencyDecimals(code: CurrencyCode): number {
  return CURRENCY_META[code].decimals
}
