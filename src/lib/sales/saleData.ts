export interface SaleDocLine { description: string; quantity: string; unitPrice: string; total: string }
export interface SaleDocumentData {
  business: { name: string; logoUrl?: string | null; address?: string | null; phone?: string | null; taxId?: string | null }
  customer?: { name: string; taxId?: string | null; address?: string | null; phone?: string | null } | null
  lines: SaleDocLine[]
  anchorCurrency: string
  secondaryCurrency?: string | null
  rate?: string | null
  subtotal: string
  tax: string
  taxLabel: string
  total: string
  totalSecondary?: string | null
  docNumber: string
  issuedAt: string
  labels: {
    voucher: string
    customer: string
    quantity: string
    unitPrice: string
    total: string
    description: string
    subtotal: string
    tax: string
    nonFiscal: string
    rate: string
    equiv: string
  }
}
