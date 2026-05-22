import { Deps } from '../../entitygateway/index.js'

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

function isPastCutoff(deliveryDateStr: string): boolean {
  const [y, m, d] = deliveryDateStr.split('-').map(Number)
  const cutoff = new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0))
  return new Date() > cutoff
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
    } = deps
    try {
      const { userId, deliveryDate } = input

      const subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

      if (isPastCutoff(deliveryDate)) {
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

      const newSkipDaysUsed = Math.max(0, subscription.skipDaysUsed - 1)
      await subscriptionPersistor.updateSubscription(subscription.id, {
        skipDaysUsed: newSkipDaysUsed,
        skippedCount: Math.max(0, subscription.skippedCount - 1),
      })

      return {
        date: deliveryDate,
        status: 'scheduled',
        skip_days_used: newSkipDaysUsed,
        skip_days_remaining: subscription.skipDaysAllowed - newSkipDaysUsed,
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
