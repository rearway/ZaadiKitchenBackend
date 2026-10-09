import { Deps } from '../../entitygateway/index.js'
import { isAfterSkipCutoff } from '../services/weekUtils.js'
import {
  flexUsedUpdate,
  getFlexDaysAllowed,
  getFlexDaysUsed,
} from '../services/flexDays.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'

export interface UndoSkipDeliveryInput {
  userId: string
  deliveryDate: string
}

export interface UndoSkipDeliveryOutput {
  date: string
  status: string
  skip_days_used: number
  skip_days_remaining: number
}

export function makeUC(deps: Deps) {
  return async function undoSkipDelivery(
    input: UndoSkipDeliveryInput
  ): Promise<UndoSkipDeliveryOutput> {
    const {
      logger,
      subscriptionLoader,
      subscriptionPersistor,
      deliveryDayLoader,
      deliveryDayPersistor,
      auditLogLoader,
    } = deps
    try {
      const { userId, deliveryDate } = input

      let subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }
      subscription = await ensurePauseStatus(deps, subscription)

      if (isAfterSkipCutoff(deliveryDate)) {
        const { PastCutoffError } =
          await import('../../../shared/errors/index.js')
        throw new PastCutoffError(
          'The undo cutoff (6 PM the day before delivery) has passed for this date.'
        )
      }

      const day = await deliveryDayLoader.getDeliveryDayByDate(
        subscription.id,
        deliveryDate
      )
      if (!day || day.status !== 'skipped') {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Skipped delivery day', deliveryDate)
      }

      await deliveryDayPersistor.updateDeliveryDayStatus(day.id, 'scheduled')

      // Remove makeup day created when this date was skipped (if still scheduled).
      const auditLogs = await auditLogLoader.getAuditLogsBySubscription(
        subscription.id
      )
      const skipAudit = auditLogs.find(
        log =>
          log.action === 'skip_delivery' &&
          (log.metadata as { date?: string } | null)?.date === deliveryDate
      )
      const makeupDate =
        (skipAudit?.metadata as { makeup_date?: string | null } | null)
          ?.makeup_date ?? null

      let newEndDate = subscription.endDate
      let newTotalMealDays = subscription.totalMealDays

      if (makeupDate) {
        const allDays = await deliveryDayLoader.getDeliveryDaysBySubscription(
          subscription.id
        )
        const makeupDay = allDays.find(
          d => d.date === makeupDate && d.status === 'scheduled'
        )
        if (makeupDay) {
          const keepDates = allDays
            .filter(d => d.date !== makeupDate)
            .map(d => d.date)
          await deliveryDayPersistor.deleteScheduledDeliveryDaysOutsideDates(
            subscription.id,
            keepDates
          )
          newTotalMealDays = Math.max(1, subscription.totalMealDays - 1)
          const remainingDates = keepDates.filter(d => d !== makeupDate)
          newEndDate =
            remainingDates.length > 0
              ? remainingDates.reduce((a, b) => (a > b ? a : b))
              : deliveryDate
        }
      }

      const newFlexUsed = Math.max(0, getFlexDaysUsed(subscription) - 1)
      await subscriptionPersistor.updateSubscription(subscription.id, {
        ...flexUsedUpdate(newFlexUsed),
        skippedCount: Math.max(0, subscription.skippedCount - 1),
        endDate: newEndDate,
        totalMealDays: newTotalMealDays,
      })

      return {
        date: deliveryDate,
        status: 'scheduled',
        skip_days_used: newFlexUsed,
        skip_days_remaining: getFlexDaysAllowed(subscription) - newFlexUsed,
      }
    } catch (error) {
      logger.error(
        'Failed to undo skip delivery',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'UndoSkipDelivery'
