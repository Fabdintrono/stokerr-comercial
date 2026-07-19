// Whether app cookies should carry the `Secure` attribute.
// Derive from the actual transport (HTTPS) like next-auth does — NOT from NODE_ENV.
// A `Secure` cookie is rejected by browsers over plain HTTP (except localhost), which
// silently breaks cookie-dependent flows on non-TLS deployments (e.g. an IP/sslip.io host).
export function secureCookies(): boolean {
  return (process.env.NEXTAUTH_URL ?? '').startsWith('https://')
}
