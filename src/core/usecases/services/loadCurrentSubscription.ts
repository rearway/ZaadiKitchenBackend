import type { Subscription } from '../../entities/Subscription.js'
import type { SubscriptionLoader } from '../../entitygateway/Subscription.js'

/**
 * Same rule as mobile `getActiveSubscriptionByUserId`: the newest
 * active, paused, or cancelled row. A newer expired row must not hide it.
 * Falls back to the newest row of any status when none of those exist.
 */
export async function loadCurrentSubscription(
  loader: SubscriptionLoader,
  userId: string
): Promise<Subscription | null> {
  const active = await loader.getActiveSubscriptionByUserId(userId)
  if (active) return active
  if (!loader.getLatestSubscriptionByUserId) return null
  return loader.getLatestSubscriptionByUserId(userId)
}
