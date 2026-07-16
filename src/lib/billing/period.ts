export function addOneMonth(d: Date): Date {
  const r = new Date(d)
  r.setUTCMonth(r.getUTCMonth() + 1)
  return r
}

/** Base = max(now, currentEnd); then +1 month. */
export function nextPeriodEnd(currentEnd: Date | null, now: Date): Date {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now
  return addOneMonth(base)
}
