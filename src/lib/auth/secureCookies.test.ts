import { describe, it, expect, afterEach } from 'vitest'
import { secureCookies } from './secureCookies'

const orig = process.env.NEXTAUTH_URL
afterEach(() => {
  if (orig === undefined) delete process.env.NEXTAUTH_URL
  else process.env.NEXTAUTH_URL = orig
})

describe('secureCookies', () => {
  it('is true when NEXTAUTH_URL is https (real TLS deployment)', () => {
    process.env.NEXTAUTH_URL = 'https://app.example.com'
    expect(secureCookies()).toBe(true)
  })
  it('is false when NEXTAUTH_URL is http (e.g. sslip.io IP deploy without TLS)', () => {
    process.env.NEXTAUTH_URL = 'http://1-2-3-4.sslip.io'
    expect(secureCookies()).toBe(false)
  })
  it('is false when NEXTAUTH_URL is unset', () => {
    delete process.env.NEXTAUTH_URL
    expect(secureCookies()).toBe(false)
  })
})
