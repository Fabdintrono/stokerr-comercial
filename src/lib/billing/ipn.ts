import crypto from 'crypto'

/** JSON with recursively sorted keys (NOWPayments IPN convention). */
export function sortedJson(obj: any): string {
  return JSON.stringify(sortKeys(obj))
}
function sortKeys(v: any): any {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    return Object.keys(v).sort().reduce((acc: any, k) => { acc[k] = sortKeys(v[k]); return acc }, {})
  }
  return v
}

export function verifyIpnSignature(body: any, signature: string | null | undefined, secret: string): boolean {
  if (!signature) return false
  const expected = crypto.createHmac('sha512', secret).update(sortedJson(body)).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
