const BASE = 'https://api.nowpayments.io/v1'

export interface CreateInvoiceInput { amount: number; orderId: string; successUrl: string; cancelUrl: string }
export interface CreateInvoiceResult { id: string; invoiceUrl: string }

export async function createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
  const res = await fetch(`${BASE}/invoice`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.NOWPAYMENTS_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      price_amount: input.amount,
      price_currency: 'usd',
      pay_currency: 'usdttrc20',
      order_id: input.orderId,
      ipn_callback_url: `${process.env.APP_URL}/api/billing/webhook`,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    }),
  })
  if (!res.ok) throw new Error(`nowpayments invoice failed: ${res.status}`)
  const data = await res.json()
  return { id: String(data.id), invoiceUrl: data.invoice_url }
}
