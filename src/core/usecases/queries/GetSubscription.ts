import { Deps } from '../../entitygateway/index.js'

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
  paused_until: string | null
  pause_ceiling_date: string | null
}

export function makeUC(deps: Deps) {
  return async function getSubscription(
    input: GetSubscriptionInput
  ): Promise<GetSubscriptionOutput> {
    const { logger, subscriptionLoader, planLoader } = deps
    try {
      const { userId } = input
      const subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)

      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

      const plan = await planLoader.getPlanById(subscription.planId)
      const remainingCount =
        subscription.totalMealDays -
        subscription.deliveredCount -
        subscription.skippedCount

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endDate = new Date(subscription.endDate)
      endDate.setHours(0, 0, 0, 0)
      const daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      )

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
        days_remaining: daysRemaining,
        start_date: subscription.startDate,
        end_date: subscription.endDate,
        skip_days_allowed: subscription.skipDaysAllowed,
        skip_days_used: subscription.skipDaysUsed,
        skip_days_remaining:
          subscription.skipDaysAllowed - subscription.skipDaysUsed,
        pause_days_allowed: subscription.pauseDaysAllowed,
        pause_days_used: subscription.pauseDaysUsed,
        paused_until: subscription.pausedUntil ?? null,
        pause_ceiling_date: subscription.pauseCeilingDate ?? null,
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
