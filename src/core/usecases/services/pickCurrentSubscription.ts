export const IN_SERVICE_SUBSCRIPTION_STATUSES = [
  'active',
  'paused',
  'cancelled',
] as const

const IN_SERVICE = new Set<string>(IN_SERVICE_SUBSCRIPTION_STATUSES)

/**
 * SQL twin of `pickCurrentSubscription`. Keep the status list in sync.
 * `alias` is the subscriptions table alias in the query.
 */
export function currentSubscriptionOrderSql(alias = 'sub'): string {
  const list = IN_SERVICE_SUBSCRIPTION_STATUSES.map(
    status => `'${status}'`
  ).join(', ')
  return `CASE WHEN ${alias}.status IN (${list}) THEN 0 ELSE 1 END, ${alias}.created_at DESC`
}

export function mealsLeftFromCounts(
  totalMealDays: number,
  deliveredCount: number,
  skippedCount: number
): number {
  return Math.max(0, totalMealDays - deliveredCount - skippedCount)
}

export function pickCurrentSubscription<
  T extends { status: string; createdAt: Date | string },
>(rows: readonly T[]): T | null {
  if (rows.length === 0) return null
  const ranked = [...rows].sort((a, b) => {
    const aRank = IN_SERVICE.has(a.status) ? 0 : 1
    const bRank = IN_SERVICE.has(b.status) ? 0 : 1
    if (aRank !== bRank) return aRank - bRank
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  return ranked[0] ?? null
}
