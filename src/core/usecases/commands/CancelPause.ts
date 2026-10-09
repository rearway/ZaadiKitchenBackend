import { Deps } from '../../entitygateway/index.js'
import {
  countWorkingDaysInRange,
  flexUsedUpdate,
  getFlexDaysAllowed,
  getFlexDaysUsed,
} from '../services/flexDays.js'
import { ensurePauseStatus, isPauseScheduled } from '../services/ensurePauseStatus.js'
import { addDaysUtc, toYYYYMMDD } from '../services/deliveryScheduleUtils.js'

export interface CancelPauseInput {
  userId: string
}

export interface CancelPauseOutput {
  subscription_id: string
  status: string
  pause_days_used: number
  pause_days_remaining: number
  skip_days_used: number
  skip_days_remaining: number
  skip_pause_days_remaining: number
}

export function makeUC(deps: Deps) {
  return async function cancelPause(
    input: CancelPauseInput
  ): Promise<CancelPauseOutput> {
    const {
      logger,
      subscriptionLoader,
      subscriptionPersistor,
      deliveryDayPersistor,
      auditLogPersistor,
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

      const { ValidationError } =
        await import('../../../shared/errors/index.js')

      if (!subscription.pausedFrom || !subscription.pausedUntil) {
        throw new ValidationError('There is no pause to cancel.')
      }

      if (!isPauseScheduled(subscription)) {
        throw new ValidationError(
          'This pause has already started. Use resume instead of cancel.'
        )
      }

      const pausedFrom = subscription.pausedFrom
      const pausedUntil = subscription.pausedUntil

      const holidayTo = toYYYYMMDD(
        addDaysUtc(new Date(pausedUntil + 'T00:00:00Z'), 1)
      )
      const holidayDates = new Set(
        await publicHolidayLoader.getHolidayDates(pausedFrom, holidayTo)
      )
      const reservedWorkingDays = countWorkingDaysInRange(
        pausedFrom,
        pausedUntil,
        holidayDates
      )

      await deliveryDayPersistor.bulkUpdateDeliveryDayStatus(
        subscription.id,
        pausedFrom,
        pausedUntil,
        'paused',
        'scheduled'
      )

      const newFlexUsed = Math.max(
        0,
        getFlexDaysUsed(subscription) - reservedWorkingDays
      )
      const updated = await subscriptionPersistor.updateSubscription(
        subscription.id,
        {
          status: 'active',
          pausedFrom: null,
          pausedUntil: null,
          pauseCeilingDate: null,
          ...flexUsedUpdate(newFlexUsed),
        }
      )

      await auditLogPersistor.createAuditLog({
        userId,
        subscriptionId: subscription.id,
        action: 'cancel_pause',
        metadata: {
          paused_from: pausedFrom,
          paused_until: pausedUntil,
          refunded_working_days: reservedWorkingDays,
        },
      })

      const remaining = getFlexDaysAllowed(subscription) - newFlexUsed
      return {
        subscription_id: updated?.id ?? subscription.id,
        status: updated?.status ?? 'active',
        pause_days_used: newFlexUsed,
        pause_days_remaining: remaining,
        skip_days_used: newFlexUsed,
        skip_days_remaining: remaining,
        skip_pause_days_remaining: remaining,
      }
    } catch (error) {
      logger.error(
        'Failed to cancel pause',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'CancelPause'
