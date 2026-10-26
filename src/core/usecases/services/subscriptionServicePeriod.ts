import type { Subscription } from '../../entities/Subscription.js'
import { compareDateStrings } from './weekUtils.js'
import { todayKSA } from './revenueUtils.js'

/** Plan is still in its paid window (meals, skip, pause allowed). */
export function isSubscriptionInServicePeriod(
  sub: Subscription,
  asOfDate: string = todayKSA()
): boolean {
  if (sub.status === 'expired') {
    return false
  }
  return compareDateStrings(sub.endDate, asOfDate) >= 0
}

/** Skip / schedule-pause commands and flex flags while status is active or cancelled in-cycle. */
export function canUseSkipAndPause(sub: Subscription, asOfDate?: string): boolean {
  if (!isSubscriptionInServicePeriod(sub, asOfDate)) {
    return false
  }
  return sub.status === 'active' || sub.status === 'cancelled'
}

/** Status values that may flip to paused when a scheduled pause starts. */
export function canEnterScheduledPause(sub: Subscription): boolean {
  return sub.status === 'active' || sub.status === 'cancelled'
}

/**
 * A row still inside its paid window blocks buying a second plan.
 * Past-end active, paused, or cancelled rows do not — the customer can renew.
 */
export function subscriptionBlocksNewPurchase(
  sub: Subscription,
  asOfDate: string = todayKSA()
): boolean {
  return isSubscriptionInServicePeriod(sub, asOfDate)
}

/** Plan upgrade (promotion checkout) while still in the paid delivery window. */
export function canUpgradeSubscriptionPlan(
  sub: Subscription,
  asOfDate: string = todayKSA()
): boolean {
  if (!isSubscriptionInServicePeriod(sub, asOfDate)) {
    return false
  }
  return sub.status === 'active' || sub.status === 'cancelled'
}
