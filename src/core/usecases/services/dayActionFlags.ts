import type { Subscription } from '../../entities/Subscription.js'
import { isAfterSkipCutoff } from './weekUtils.js'
import { getFlexDaysRemaining } from './flexDays.js'
import { isSubscriptionInServicePeriod } from './subscriptionServicePeriod.js'

export type DaySkipReason =
  | 'past_cutoff'
  | 'skip_limit_reached'
  | 'not_subscribed'
  | 'subscription_paused'
  | 'subscription_expired'
  | 'subscription_cancelled'
  | 'already_skipped'
  | 'meal_type_mismatch'
  | 'day_paused'
  | 'no_delivery'
  | null

export interface DayActionFlags {
  skip_available: boolean
  undoable: boolean
  is_skipped: boolean
  skip_reason: DaySkipReason
}

export interface ResolveDayActionFlagsInput {
  subscription: Subscription | null
  deliveryDate: string
  /** Menu/slot (or delivery-row) meal type. */
  mealType?: 'executive' | 'salad' | string | null
  /**
   * Meal type the user actually receives that day (`delivery_days.meal_type`).
   * Falls back to `subscription.mealType` when omitted (plan default).
   */
  assignedMealType?: 'executive' | 'salad' | string | null
  /** Delivery day status for this date (scheduled | skipped | paused | …). */
  dayStatus?: string | null
  now?: Date
}

function expectedMealType(
  sub: Subscription,
  assignedMealType?: string | null
): string {
  return assignedMealType ?? sub.mealType
}

function isMealTypeMismatch(
  sub: Subscription,
  mealType?: string | null,
  assignedMealType?: string | null
): boolean {
  return mealType != null && mealType !== expectedMealType(sub, assignedMealType)
}

/**
 * Menu/home card is a meal day on this subscription. True when the slot
 * matches the type they receive that day (per-day switch or plan default)
 * and the delivery row is scheduled. Skipped days stay `is_skipped` but are not deliverable.
 */
export function isDeliverableMenuDay(input: {
  subscription: Subscription | null
  mealType?: string | null
  assignedMealType?: string | null
  dayStatus?: string | null
}): boolean {
  const { subscription: sub, mealType, assignedMealType, dayStatus } = input
  if (!sub) return false
  if (isMealTypeMismatch(sub, mealType, assignedMealType)) return false
  return dayStatus === 'scheduled'
}

/**
 * Canonical skip/undo flags for home, menu week, deliveries, and meal detail.
 */
export function resolveDayActionFlags(
  input: ResolveDayActionFlagsInput
): DayActionFlags {
  const {
    subscription: sub,
    deliveryDate,
    mealType,
    assignedMealType,
    dayStatus,
    now = new Date(),
  } = input

  const pastCutoff = isAfterSkipCutoff(deliveryDate, now)
  const isSkipped = dayStatus === 'skipped'
  const isDayPaused = dayStatus === 'paused'

  if (!sub) {
    return {
      skip_available: false,
      undoable: false,
      is_skipped: false,
      skip_reason: 'not_subscribed',
    }
  }

  if (sub.status === 'expired') {
    return {
      skip_available: false,
      undoable: false,
      is_skipped: isSkipped,
      skip_reason: 'subscription_expired',
    }
  }

  if (sub.status === 'cancelled' && !isSubscriptionInServicePeriod(sub)) {
    return {
      skip_available: false,
      undoable: false,
      is_skipped: isSkipped,
      skip_reason: 'subscription_cancelled',
    }
  }

  if (sub.status === 'paused') {
    return {
      skip_available: false,
      undoable: false,
      is_skipped: false,
      skip_reason: 'subscription_paused',
    }
  }

  // active (may have a future scheduled pause)
  if (isDayPaused) {
    if (isMealTypeMismatch(sub, mealType, assignedMealType)) {
      return {
        skip_available: false,
        undoable: false,
        is_skipped: false,
        skip_reason: 'meal_type_mismatch',
      }
    }
    return {
      skip_available: false,
      undoable: false,
      is_skipped: false,
      skip_reason: 'day_paused',
    }
  }

  if (isSkipped) {
    if (isMealTypeMismatch(sub, mealType, assignedMealType)) {
      return {
        skip_available: false,
        undoable: false,
        is_skipped: false,
        skip_reason: 'meal_type_mismatch',
      }
    }
    return {
      skip_available: false,
      undoable: !pastCutoff,
      is_skipped: true,
      skip_reason: 'already_skipped',
    }
  }

  if (isMealTypeMismatch(sub, mealType, assignedMealType)) {
    return {
      skip_available: false,
      undoable: false,
      is_skipped: false,
      skip_reason: 'meal_type_mismatch',
    }
  }

  if (dayStatus == null) {
    return {
      skip_available: false,
      undoable: false,
      is_skipped: false,
      skip_reason: 'no_delivery',
    }
  }

  if (pastCutoff) {
    return {
      skip_available: false,
      undoable: false,
      is_skipped: false,
      skip_reason: 'past_cutoff',
    }
  }

  if (getFlexDaysRemaining(sub) <= 0) {
    return {
      skip_available: false,
      undoable: false,
      is_skipped: false,
      skip_reason: 'skip_limit_reached',
    }
  }

  if (dayStatus != null && dayStatus !== 'scheduled') {
    return {
      skip_available: false,
      undoable: false,
      is_skipped: false,
      skip_reason: 'past_cutoff',
    }
  }

  return {
    skip_available: true,
    undoable: false,
    is_skipped: false,
    skip_reason: null,
  }
}
