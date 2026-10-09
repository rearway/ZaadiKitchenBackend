import { Deps } from '../../entitygateway/index.js'
import { isAfterSkipCutoff } from '../services/weekUtils.js'
import {
  addDaysUtc,
  buildDeliveryDayInputs,
  generateWorkingDeliveryDates,
  toYYYYMMDD,
} from '../services/deliveryScheduleUtils.js'
import {
  flexUsedUpdate,
  getFlexDaysAllowed,
  getFlexDaysRemaining,
  getFlexDaysUsed,
} from '../services/flexDays.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'

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
  makeup_date: string | null
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
      publicHolidayLoader,
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

      if (subscription.status !== 'active') {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError('Only active subscriptions can skip deliveries.')
      }

      if (isAfterSkipCutoff(deliveryDate)) {
        const { PastCutoffError } =
          await import('../../../shared/errors/index.js')
        throw new PastCutoffError()
      }

      if (getFlexDaysRemaining(subscription) <= 0) {
        const { SkipLimitReachedError } =
          await import('../../../shared/errors/index.js')
        throw new SkipLimitReachedError({
          skip_days_used: getFlexDaysUsed(subscription),
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

      if (day.mealType !== subscription.mealType) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(
          'You can only skip days that match your subscription meal type.'
        )
      }

      await deliveryDayPersistor.updateDeliveryDayStatus(day.id, 'skipped')

      // Roll the skipped meal forward to the next working day after the plan end
      // (or after the skipped date), so the customer still receives their paid meals.
      const anchorDate =
        subscription.endDate > deliveryDate
          ? subscription.endDate
          : deliveryDate
      const holidayFrom = anchorDate
      const holidayTo = toYYYYMMDD(addDaysUtc(new Date(anchorDate + 'T00:00:00Z'), 60))
      const holidayDates = new Set(
        await publicHolidayLoader.getHolidayDates(holidayFrom, holidayTo)
      )
      // Start searching from the day after the anchor so we never reuse the same date.
      const searchStart = toYYYYMMDD(
        addDaysUtc(new Date(anchorDate + 'T00:00:00Z'), 1)
      )
      const [makeupDate] = generateWorkingDeliveryDates(
        searchStart,
        1,
        holidayDates
      )

      let newEndDate = subscription.endDate
      let newTotalMealDays = subscription.totalMealDays
      if (makeupDate) {
        await deliveryDayPersistor.bulkCreateDeliveryDays(
          buildDeliveryDayInputs(
            [makeupDate],
            subscription.mealType,
            subscription.id,
            userId
          )
        )
        newEndDate = makeupDate
        newTotalMealDays = subscription.totalMealDays + 1
      }

      const newFlexUsed = getFlexDaysUsed(subscription) + 1
      await subscriptionPersistor.updateSubscription(subscription.id, {
        ...flexUsedUpdate(newFlexUsed),
        skippedCount: subscription.skippedCount + 1,
        endDate: newEndDate,
        totalMealDays: newTotalMealDays,
      })

      await auditLogPersistor.createAuditLog({
        userId,
        subscriptionId: subscription.id,
        action: 'skip_delivery',
        metadata: {
          date: deliveryDate,
          makeup_date: makeupDate ?? null,
        },
      })

      return {
        date: deliveryDate,
        status: 'skipped',
        undoable: true,
        skip_days_used: newFlexUsed,
        skip_days_remaining: getFlexDaysAllowed(subscription) - newFlexUsed,
        makeup_date: makeupDate ?? null,
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
