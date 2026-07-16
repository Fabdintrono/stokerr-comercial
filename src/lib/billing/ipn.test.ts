import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { verifyIpnSignature, sortedJson } from './ipn'

const secret = 'test-secret'
const body = { payment_id: 123, payment_status: 'finished', order_id: 'biz_1' }

function sign(obj: any) {
  return crypto.createHmac('sha512', secret).update(sortedJson(obj)).digest('hex')
}

describe('verifyIpnSignature', () => {
  it('accepts a valid signature', () => {
    expect(verifyIpnSignature(body, sign(body), secret)).toBe(true)
  })
  it('rejects a tampered body', () => {
    expect(verifyIpnSignature({ ...body, payment_status: 'failed' }, sign(body), secret)).toBe(false)
  })
  it('rejects a wrong secret', () => {
    expect(verifyIpnSignature(body, sign(body), 'other')).toBe(false)
  })
})
