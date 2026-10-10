import { Deps } from '../../entitygateway/index.js'
import { todayKSA } from '../services/revenueUtils.js'
import { compareDateStrings, isAfterSkipCutoff } from '../services/weekUtils.js'
import {
  countWorkingDaysInRange,
  flexUsedUpdate,
  getFlexDaysAllowed,
  getFlexDaysRemaining,
  getFlexDaysUsed,
  listWorkingDaysInRange,
} from '../services/flexDays.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'
import { canUseSkipAndPause } from '../services/subscriptionServicePeriod.js'
import { addDaysUtc, toYYYYMMDD } from '../services/deliveryScheduleUtils.js'

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
  pause_scheduled: boolean
  paused_days: string[]
  pause_days_used: number
  pause_days_remaining: number
  skip_days_used: number
  skip_days_remaining: number
  skip_pause_days_remaining: number
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
      publicHolidayLoader,
    } = deps
    try {
      const { userId, startDate, endDate } = input

      let subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }
      subscription = await ensurePauseStatus(deps, subscription)

      const { ValidationError } =
        await import('../../../shared/errors/index.js')

      if (!canUseSkipAndPause(subscription)) {
        throw new ValidationError(
          'Only active subscriptions can schedule a pause.'
        )
      }

      if (subscription.pausedFrom && subscription.pausedUntil) {
        throw new ValidationError(
          'You already have a pause scheduled. Cancel it before scheduling another.'
        )
      }

      if (compareDateStrings(endDate, startDate) < 0) {
        throw new ValidationError(
          'Pause end date must be on or after the start date.',
          {
            fields: {
              end_date: 'Pause end date must be on or after the start date.',
            },
          }
        )
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

      if (isAfterSkipCutoff(startDate)) {
        throw new ValidationError(
          'The cutoff for the pause start day has passed. Choose a later start date.',
          {
            fields: {
              start_date:
                'The cutoff (6 PM KSA the day before) has passed for this date.',
            },
          }
        )
      }

      const holidayTo = toYYYYMMDD(
        addDaysUtc(new Date(endDate + 'T00:00:00Z'), 1)
      )
      const holidayDates = new Set(
        await publicHolidayLoader.getHolidayDates(startDate, holidayTo)
      )

      const workingDays = listWorkingDaysInRange(
        startDate,
        endDate,
        holidayDates
      )
      const requestedWorkingDays = workingDays.length
      if (requestedWorkingDays < 1) {
        throw new ValidationError(
          'Pause range must include at least one working day (Sun–Thu).'
        )
      }

      const flexRemaining = getFlexDaysRemaining(subscription)
      if (requestedWorkingDays > flexRemaining) {
        const { PauseLimitExceededError } =
          await import('../../../shared/errors/index.js')
        throw new PauseLimitExceededError({
          pause_days_remaining: flexRemaining,
          skip_pause_days_remaining: flexRemaining,
        })
      }

      const days = await deliveryDayLoader.getDeliveryDaysBySubscription(
        subscription.id,
        { from: startDate, to: endDate }
      )
      for (const day of days) {
        if (day.status === 'scheduled') {
          await deliveryDayPersistor.updateDeliveryDayStatus(day.id, 'paused')
        }
      }

      const newFlexUsed = getFlexDaysUsed(subscription) + requestedWorkingDays
      // Stay active until pause-start cutoff; ensurePauseStatus will flip later.
      const updated = await subscriptionPersistor.updateSubscription(
        subscription.id,
        {
          status:
            subscription.status === 'cancelled' ? 'cancelled' : 'active',
          pausedFrom: startDate,
          pausedUntil: endDate,
          pauseCeilingDate: endDate,
          ...flexUsedUpdate(newFlexUsed),
        }
      )

      await auditLogPersistor.createAuditLog({
        userId,
        subscriptionId: subscription.id,
        action: 'pause_subscription',
        metadata: {
          paused_from: startDate,
          paused_until: endDate,
          working_days: requestedWorkingDays,
        },
      })

      const remaining = getFlexDaysAllowed(subscription) - newFlexUsed
      return {
        subscription_id: updated?.id ?? subscription.id,
        status: updated?.status ?? 'active',
        paused_from: startDate,
        paused_until: endDate,
        pause_ceiling_date: endDate,
        pause_scheduled: true,
        paused_days: workingDays,
        pause_days_used: newFlexUsed,
        pause_days_remaining: remaining,
        skip_days_used: newFlexUsed,
        skip_days_remaining: remaining,
        skip_pause_days_remaining: remaining,
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
