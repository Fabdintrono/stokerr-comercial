export function variantDisplayName(attributes: Record<string, string>): string {
  return Object.values(attributes).join(' / ')
}
