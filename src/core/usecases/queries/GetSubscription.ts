import { Deps } from '../../entitygateway/index.js'
import { flexAllowanceFields, listWorkingDaysInRange } from '../services/flexDays.js'
import {
  ensurePauseStatus,
  isPauseScheduled,
} from '../services/ensurePauseStatus.js'
import { addDaysUtc, toYYYYMMDD } from '../services/deliveryScheduleUtils.js'

export interface GetSubscriptionInput {
  userId: string
}

export interface GetSubscriptionOutput {
  subscription_id: string
  plan_id: string
  plan_name: string
  meal_type: string
  status: string
  total_meal_days: number
  delivered_count: number
  skipped_count: number
  remaining_count: number
  days_remaining: number
  start_date: string
  end_date: string
  skip_days_allowed: number
  skip_days_used: number
  skip_days_remaining: number
  pause_days_allowed: number
  pause_days_used: number
  pause_days_remaining: number
  skip_pause_days_allowed: number
  skip_pause_days_used: number
  skip_pause_days_remaining: number
  pause_scheduled: boolean
  paused_from: string | null
  paused_until: string | null
  pause_ceiling_date: string | null
  paused_days: string[]
}

export function makeUC(deps: Deps) {
  return async function getSubscription(
    input: GetSubscriptionInput
  ): Promise<GetSubscriptionOutput> {
    const {
      logger,
      subscriptionLoader,
      planLoader,
      publicHolidayLoader,
    } = deps
    try {
      const { userId } = input
      let subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)

      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

      subscription = await ensurePauseStatus(deps, subscription)

      const plan = await planLoader.getPlanById(subscription.planId)
      const remainingCount = Math.max(
        0,
        subscription.totalMealDays -
          subscription.deliveredCount -
          subscription.skippedCount
      )

      const flex = flexAllowanceFields(subscription)
      const pauseScheduled = isPauseScheduled(subscription)

      let pausedDays: string[] = []
      if (subscription.pausedFrom && subscription.pausedUntil) {
        const holidayTo = toYYYYMMDD(
          addDaysUtc(new Date(subscription.pausedUntil + 'T00:00:00Z'), 1)
        )
        const holidays = new Set(
          await publicHolidayLoader.getHolidayDates(
            subscription.pausedFrom,
            holidayTo
          )
        )
        pausedDays = listWorkingDaysInRange(
          subscription.pausedFrom,
          subscription.pausedUntil,
          holidays
        )
      }

      return {
        subscription_id: subscription.id,
        plan_id: plan?.slug ?? subscription.planId,
        plan_name: plan?.name ?? '',
        meal_type: subscription.mealType,
        status: subscription.status,
        total_meal_days: subscription.totalMealDays,
        delivered_count: subscription.deliveredCount,
        skipped_count: subscription.skippedCount,
        remaining_count: remainingCount,
        days_remaining: remainingCount,
        start_date: subscription.startDate,
        end_date: subscription.endDate,
        ...flex,
        pause_scheduled: pauseScheduled,
        paused_from: subscription.pausedFrom ?? null,
        paused_until: subscription.pausedUntil ?? null,
        pause_ceiling_date: subscription.pauseCeilingDate ?? null,
        paused_days: pausedDays,
      }
    } catch (error) {
      logger.error(
        'Failed to get subscription',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetSubscription'
