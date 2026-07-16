import { describe, it, expect } from 'vitest'
import { formatDocNumber } from './docNumber'

describe('formatDocNumber', () => {
  it('zero-pads to 6 digits with prefix', () => {
    expect(formatDocNumber('F-', 1)).toBe('F-000001')
    expect(formatDocNumber('F-', 123)).toBe('F-000123')
  })
  it('does not truncate numbers beyond 6 digits', () => {
    expect(formatDocNumber('F-', 1234567)).toBe('F-1234567')
  })
})
