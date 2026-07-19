export interface FefoBatch { id: string; quantity: number; expiryDate: Date }
export interface FefoPick { id: string; take: number }

export function pickBatchesFEFO(
  batches: FefoBatch[],
  quantity: number,
  opts: { today: Date; allowExpired: boolean },
): FefoPick[] {
  const eligible = batches
    .filter(b => b.quantity > 0 && (opts.allowExpired || b.expiryDate.getTime() >= opts.today.getTime()))
    .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

  const total = eligible.reduce((s, b) => s + b.quantity, 0)
  if (total < quantity) throw new Error(`insufficient batch stock: need ${quantity}, have ${total}`)

  const picks: FefoPick[] = []
  let remaining = quantity
  for (const b of eligible) {
    if (remaining <= 0) break
    const take = Math.min(b.quantity, remaining)
    picks.push({ id: b.id, take })
    remaining -= take
  }
  return picks
}
