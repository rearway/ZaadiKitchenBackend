import type { DeliveryDayStatus } from '../../entities/DeliveryDay.js'

/**
 * A meal is eligible to be rated once it has been delivered and until the
 * customer submits a rating. Delivery is the rider mark
 * (`delivery_days.status = delivered`) or Daily Ops closing that date
 * (`daily_ops_days.delivered_at`). Closing the pipeline does not end
 * eligibility. Skipped and paused stops were not sent.
 */
export function isDeliveryEligibleForRating(
  status: DeliveryDayStatus,
  dailyOpsDelivered: boolean
): boolean {
  if (status === 'delivered') return true
  if (!dailyOpsDelivered) return false
  return status === 'scheduled' || status === 'past_cutoff'
}
