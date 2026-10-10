import type { Deps } from '../../entitygateway/index.js'
import type { Subscription } from '../../entities/Subscription.js'
import { isAfterSkipCutoff } from './weekUtils.js'
import { canEnterScheduledPause } from './subscriptionServicePeriod.js'

/**
 * If an active subscription has a scheduled pause whose start-day cutoff
 * has passed, flip status to paused. Idempotent.
 */
export async function ensurePauseStatus(
  deps: Pick<Deps, 'subscriptionPersistor'>,
  subscription: Subscription,
  now: Date = new Date()
): Promise<Subscription> {
  if (!subscription.pausedFrom || !subscription.pausedUntil) {
    return subscription
  }

  if (
    subscription.status === 'paused' &&
    !isAfterSkipCutoff(subscription.pausedFrom, now)
  ) {
    return deps.subscriptionPersistor.updateSubscription(subscription.id, {
      status: 'active',
    })
  }

  if (
    !canEnterScheduledPause(subscription) ||
    !isAfterSkipCutoff(subscription.pausedFrom, now)
  ) {
    return subscription
  }

  if (subscription.status === 'cancelled') {
    return subscription
  }

  if (subscription.status === 'paused') {
    return subscription
  }

  return deps.subscriptionPersistor.updateSubscription(subscription.id, {
    status: 'paused',
  })
}

/** True when pause is scheduled but start cutoff has not passed yet. */
export function isPauseScheduled(sub: Subscription, now: Date = new Date()): boolean {
  return (
    canEnterScheduledPause(sub) &&
    !!sub.pausedFrom &&
    !!sub.pausedUntil &&
    !isAfterSkipCutoff(sub.pausedFrom, now)
  )
}
