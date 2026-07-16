import { describe, it, expect } from 'vitest'
import { renderSaleDocument } from './renderSaleDocument'

describe('renderSaleDocument', () => {
  it('produces a non-empty PDF buffer', async () => {
    const buf = await renderSaleDocument({
      business: { name: 'Demo SA' },
      customer: null,
      lines: [{ description: 'Item', quantity: '2', unitPrice: '$10.00', total: '$20.00' }],
      anchorCurrency: 'USD', secondaryCurrency: null, rate: null,
      subtotal: '$20.00', tax: '0', taxLabel: 'IVA', total: '$20.00', totalSecondary: null,
      docNumber: 'F-000001', issuedAt: '2026-07-16',
      labels: {
        voucher: 'VOUCHER', customer: 'Customer', quantity: 'Qty', unitPrice: 'Price',
        total: 'Total', description: 'Description', subtotal: 'Subtotal', tax: 'Tax',
      },
    })
    expect(buf.length).toBeGreaterThan(500)
    expect(buf.slice(0, 4).toString()).toBe('%PDF')
  }, 20000)
})
