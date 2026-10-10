import type { Deps } from '../../entitygateway/index.js'
import type { Plan } from '../../entities/Plan.js'
import type { Subscription } from '../../entities/Subscription.js'
import {
  buildDeliveryDayInputs,
  generateWorkingDeliveryDates,
} from '../services/deliveryScheduleUtils.js'

export interface PromoteSubscriptionInput {
  userId: string
  subscription: Subscription
  newPlan: Plan
  mealType: 'executive' | 'salad'
}

export interface PromoteSubscriptionResult {
  subscription: Subscription
  endDate: string
}

export async function promoteSubscriptionInPlace(
  deps: Deps,
  input: PromoteSubscriptionInput
): Promise<PromoteSubscriptionResult> {
  const { subscription, newPlan, mealType, userId } = input
  const { deliveryDayLoader, deliveryDayPersistor, subscriptionPersistor, publicHolidayLoader } =
    deps

  const startDate = subscription.startDate
  const fromStr = startDate
  const toDate = new Date(startDate + 'T00:00:00Z')
  toDate.setUTCDate(toDate.getUTCDate() + 400)
  const toStr = toDate.toISOString().slice(0, 10)
  const holidayDates = new Set(
    await publicHolidayLoader.getHolidayDates(fromStr, toStr)
  )

  const canonicalDates = generateWorkingDeliveryDates(
    startDate,
    newPlan.mealCount,
    holidayDates
  )

  const existingDays = await deliveryDayLoader.getDeliveryDaysBySubscription(
    subscription.id
  )
  const existingByDate = new Map(existingDays.map(d => [d.date, d]))

  const toCreate = canonicalDates
    .filter(date => !existingByDate.has(date))
    .map(date =>
      buildDeliveryDayInputs([date], mealType, subscription.id, userId)[0]
    )

  if (toCreate.length > 0) {
    await deliveryDayPersistor.bulkCreateDeliveryDays(toCreate)
  }

  await deliveryDayPersistor.deleteScheduledDeliveryDaysOutsideDates(
    subscription.id,
    canonicalDates
  )

  const endDate =
    canonicalDates.length > 0
      ? canonicalDates[canonicalDates.length - 1]
      : subscription.endDate

  const updated = await subscriptionPersistor.updateSubscription(subscription.id, {
    planId: newPlan.id,
    mealType,
    totalMealDays: newPlan.mealCount,
    skipDaysAllowed: newPlan.skipDaysAllowed,
    pauseDaysAllowed: newPlan.pauseDaysAllowed,
    startDate,
    endDate,
  })

  return { subscription: updated, endDate }
}
