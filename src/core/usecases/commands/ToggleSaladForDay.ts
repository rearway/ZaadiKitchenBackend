import { Deps } from '../../entitygateway/index.js'

export interface ToggleSaladForDayInput {
  userId: string
  date: string
  enabled: boolean
}

export interface ToggleSaladForDayOutput {
  date: string
  meal_type: 'executive' | 'salad'
}

function isPastCutoff(deliveryDate: string): boolean {
  const now = new Date()
  const ksaHour = (now.getUTCHours() + 3) % 24
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const target = new Date(deliveryDate + 'T00:00:00Z')
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
  return diffDays <= 0 || (diffDays === 1 && ksaHour >= 18)
}

export function makeUC(deps: Deps) {
  return async function toggleSaladForDay(
    input: ToggleSaladForDayInput
  ): Promise<ToggleSaladForDayOutput> {
    const { logger, subscriptionLoader, deliveryDayLoader, deliveryDayPersistor } = deps
    try {
      const { userId, date, enabled } = input

      const subscription = await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        const { ResourceNotFoundError } = await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

      const day = await deliveryDayLoader.getDeliveryDayByDate(subscription.id, date)
      if (!day) {
        const { ResourceNotFoundError } = await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Delivery day')
      }

      if (day.status !== 'scheduled') {
        const { ValidationError } = await import('../../../shared/errors/index.js')
        throw new ValidationError(`Cannot change meal type for a ${day.status} delivery.`)
      }

      if (isPastCutoff(date)) {
        const { PastCutoffError } = await import('../../../shared/errors/index.js')
        throw new PastCutoffError()
      }

      const newMealType: 'executive' | 'salad' = enabled ? 'salad' : 'executive'

      await deliveryDayPersistor.updateMealTypeForSubscription(
        subscription.id,
        newMealType,
        date,
        [date]
      )

      return { date, meal_type: newMealType }
    } catch (error) {
      logger.error(
        'Failed to toggle salad for day',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'ToggleSaladForDay'
