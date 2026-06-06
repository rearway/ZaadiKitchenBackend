import { Deps } from '../../entitygateway/index.js'

export interface SkipDeliveryInput {
  userId: string
  deliveryDate: string
}

export interface SkipDeliveryOutput {
  date: string
  status: string
  undoable: boolean
  skip_days_used: number
  skip_days_remaining: number
}

function isPastCutoff(deliveryDateStr: string): boolean {
  const [y, m, d] = deliveryDateStr.split('-').map(Number)
  const cutoff = new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0))
  return new Date() > cutoff
}

export function makeUC(deps: Deps) {
  return async function skipDelivery(
    input: SkipDeliveryInput
  ): Promise<SkipDeliveryOutput> {
    const {
      logger,
      subscriptionLoader,
      subscriptionPersistor,
      deliveryDayLoader,
      deliveryDayPersistor,
      auditLogPersistor,
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
        throw new PastCutoffError()
      }

      if (subscription.skipDaysUsed >= subscription.skipDaysAllowed) {
        const { SkipLimitReachedError } =
          await import('../../../shared/errors/index.js')
        throw new SkipLimitReachedError({
          skip_days_used: subscription.skipDaysUsed,
          skip_days_remaining: 0,
        })
      }

      const day = await deliveryDayLoader.getDeliveryDayByDate(
        subscription.id,
        deliveryDate
      )
      if (!day) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Delivery day', deliveryDate)
      }

      if (day.status !== 'scheduled') {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(
          `Delivery day is not skippable (status: ${day.status})`
        )
      }

      await deliveryDayPersistor.updateDeliveryDayStatus(day.id, 'skipped')

      const newSkipDaysUsed = subscription.skipDaysUsed + 1
      await subscriptionPersistor.updateSubscription(subscription.id, {
        skipDaysUsed: newSkipDaysUsed,
        skippedCount: subscription.skippedCount + 1,
      })

      await auditLogPersistor.createAuditLog({
        userId,
        subscriptionId: subscription.id,
        action: 'skip_delivery',
        metadata: { date: deliveryDate },
      })

      return {
        date: deliveryDate,
        status: 'skipped',
        undoable: true,
        skip_days_used: newSkipDaysUsed,
        skip_days_remaining: subscription.skipDaysAllowed - newSkipDaysUsed,
      }
    } catch (error) {
      logger.error(
        'Failed to skip delivery',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'SkipDelivery'
