export function formatDocNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(6, '0')}`
}
