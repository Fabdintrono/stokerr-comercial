import { describe, it, expect } from 'vitest'
import { batchStatus } from './status'

const today = new Date('2026-07-19')
describe('batchStatus', () => {
  it('EXPIRED when expiry is before today', () => {
    expect(batchStatus(new Date('2026-07-18'), today, 30)).toBe('EXPIRED')
  })
  it('NEAR when within expiryAlertDays', () => {
    expect(batchStatus(new Date('2026-08-10'), today, 30)).toBe('NEAR')
  })
  it('OK when beyond the threshold', () => {
    expect(batchStatus(new Date('2026-10-01'), today, 30)).toBe('OK')
  })
  it('treats exactly today as NEAR (not expired)', () => {
    expect(batchStatus(new Date('2026-07-19'), today, 30)).toBe('NEAR')
  })
})
