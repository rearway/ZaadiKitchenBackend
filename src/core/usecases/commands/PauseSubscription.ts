import { Deps } from '../../entitygateway/index.js'
import { todayKSA } from '../services/revenueUtils.js'
import { compareDateStrings } from '../services/weekUtils.js'

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

      const { ValidationError } =
        await import('../../../shared/errors/index.js')

      if (compareDateStrings(endDate, startDate) < 0) {
        throw new ValidationError('Pause end date must be on or after the start date.', {
          fields: { end_date: 'Pause end date must be on or after the start date.' },
        })
      }

      const today = todayKSA()
      if (compareDateStrings(startDate, today) < 0) {
        throw new ValidationError('Pause start date must be today or later.', {
          fields: { start_date: 'Pause start date must be today or later.' },
        })
      }

      if (compareDateStrings(startDate, subscription.startDate) < 0) {
        throw new ValidationError(
          'Pause cannot start before your plan start date.',
          {
            fields: {
              start_date: `Your plan starts on ${subscription.startDate}. Choose a pause start date on or after that day.`,
            },
          }
        )
      }

      if (compareDateStrings(endDate, subscription.endDate) > 0) {
        throw new ValidationError(
          'Pause end date cannot be after your plan end date.',
          {
            fields: { end_date: `Your plan ends on ${subscription.endDate}.` },
          }
        )
      }

      const requestedDays = daysBetween(startDate, endDate)
      if (requestedDays < 1) {
        throw new ValidationError('Invalid pause date range.')
      }
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
