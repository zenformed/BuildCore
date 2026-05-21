/** Share of a period base amount; returns 0 when base is zero (never NaN/Infinity). */
export function computePercentOfBase(amountCents: number, baseCents: number): number {
  if (baseCents <= 0) return 0;
  return (amountCents / baseCents) * 100;
}

/** Share of column revenue (Total Revenue for that period). */
export function computePercentOfSales(amountCents: number, revenueCents: number): number {
  return computePercentOfBase(amountCents, revenueCents);
}

/** Share of column cost (Total Cost of Goods Sold for that period). */
export function computePercentOfCost(amountCents: number, costCents: number): number {
  return computePercentOfBase(amountCents, costCents);
}