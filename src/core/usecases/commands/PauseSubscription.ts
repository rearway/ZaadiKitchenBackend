import { Deps } from '../../entitygateway/index.js'

export interface PauseSubscriptionInput {
  userId: string
  startDate: string
  endDate: string
}

export interface PauseSubscriptionOutput {
  subscription_id: string
  status: string
  paused_from: string
  paused_until: string
  pause_ceiling_date: string
  pause_days_used: number
  pause_days_remaining: number
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z')
  const b = new Date(to + 'T00:00:00Z')
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export function makeUC(deps: Deps) {
  return async function pauseSubscription(
    input: PauseSubscriptionInput
  ): Promise<PauseSubscriptionOutput> {
    const {
      logger,
      subscriptionLoader,
      subscriptionPersistor,
      deliveryDayLoader,
      deliveryDayPersistor,
      auditLogPersistor,
    } = deps
    try {
      const { userId, startDate, endDate } = input

      const subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

      if (subscription.status !== 'active') {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError('Only active subscriptions can be paused.')
      }

      const requestedDays = daysBetween(startDate, endDate)
      const pauseDaysRemaining =
        subscription.pauseDaysAllowed - subscription.pauseDaysUsed

      if (requestedDays > pauseDaysRemaining) {
        const { PauseLimitExceededError } =
          await import('../../../shared/errors/index.js')
        throw new PauseLimitExceededError({
          pause_days_remaining: pauseDaysRemaining,
        })
      }

      // Mark delivery days in range as paused
      const days = await deliveryDayLoader.getDeliveryDaysBySubscription(
        subscription.id,
        {
          from: startDate,
          to: endDate,
        }
      )
      for (const day of days) {
        if (day.status === 'scheduled') {
          await deliveryDayPersistor.updateDeliveryDayStatus(day.id, 'paused')
        }
      }

      const newPauseDaysUsed = subscription.pauseDaysUsed + requestedDays

      await subscriptionPersistor.updateSubscription(subscription.id, {
        status: 'paused',
        pausedFrom: startDate,
        pausedUntil: endDate,
        pauseCeilingDate: endDate,
        pauseDaysUsed: newPauseDaysUsed,
      })

      await auditLogPersistor.createAuditLog({
        userId,
        subscriptionId: subscription.id,
        action: 'pause_subscription',
        metadata: { paused_from: startDate, paused_until: endDate },
      })

      return {
        subscription_id: subscription.id,
        status: 'paused',
        paused_from: startDate,
        paused_until: endDate,
        pause_ceiling_date: endDate,
        pause_days_used: newPauseDaysUsed,
        pause_days_remaining: subscription.pauseDaysAllowed - newPauseDaysUsed,
      }
    } catch (error) {
      logger.error(
        'Failed to pause subscription',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'PauseSubscription'
