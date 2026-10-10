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
