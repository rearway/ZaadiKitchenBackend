import { Deps } from '../../entitygateway/index.js'
import { resolveDayActionFlags } from '../services/dayActionFlags.js'
import { getFlexDaysRemaining } from '../services/flexDays.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'
import {
  canChangeMealChoice,
  resolveDayEffectiveMeal,
  slotsForDate,
} from '../services/customerMenuDay.js'

export interface GetSubscriptionDeliveriesInput {
  userId: string
  from?: string
  to?: string
}

export interface DeliveryItem {
  date: string
  label: string
  meal_id: string | null
  meal_name: string | null
  photo_url: string | null
  meal_type: string
  status: string
  selected_meal_id: string | null
  can_change: boolean
  skip_available: boolean
  /** @deprecated Prefer skip_available */
  skippable: boolean
  skip_reason: string | null
  undoable: boolean
  is_skipped: boolean
}

export interface GetSubscriptionDeliveriesOutput {
  deliveries: DeliveryItem[]
  skip_limit_reached: boolean
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function formatShortLabel(date: Date, today: Date): string {
  const dateStr = `${SHORT_DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  return isToday ? `${dateStr} · Today` : dateStr
}

export function makeUC(deps: Deps) {
  return async function getSubscriptionDeliveries(
    input: GetSubscriptionDeliveriesInput
  ): Promise<GetSubscriptionDeliveriesOutput> {
    const { logger, subscriptionLoader, deliveryDayLoader, menuWeekLoader } =
      deps
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

      const days = await deliveryDayLoader.getDeliveryDaysBySubscription(
        subscription.id,
        {
          from: input.from,
          to: input.to,
        }
      )

      const slots =
        days.length > 0
          ? await menuWeekLoader.getMenuForDateRange(
              input.from ?? days[0].date,
              input.to ?? days[days.length - 1].date
            )
          : []

      const today = new Date()
      const skipLimitReached = getFlexDaysRemaining(subscription) <= 0

      const deliveries: DeliveryItem[] = days.map(day => {
        const dayDate = new Date(day.date + 'T00:00:00Z')
        const flags = resolveDayActionFlags({
          subscription,
          deliveryDate: day.date,
          mealType: day.mealType,
          assignedMealType: day.mealType,
          dayStatus: day.status,
        })
        const effective = resolveDayEffectiveMeal(
          day.mealType,
          day.selectedMealId,
          slotsForDate(slots, day.date)
        )
        const optionCount = slotsForDate(slots, day.date).filter(
          s => s.meal && s.mealId
        ).length

        return {
          date: day.date,
          label: formatShortLabel(dayDate, today),
          meal_id: effective?.id ?? null,
          meal_name: effective?.nameEn ?? day.mealName ?? null,
          photo_url: effective?.photoUrl ?? null,
          meal_type: day.mealType,
          status: day.status,
          selected_meal_id: day.selectedMealId ?? null,
          can_change: canChangeMealChoice({
            subscription,
            dayStatus: day.status,
            deliveryDate: day.date,
            optionCount,
          }),
          skip_available: flags.skip_available,
          skippable: flags.skip_available,
          skip_reason: flags.skip_reason,
          undoable: flags.undoable,
          is_skipped: flags.is_skipped,
        }
      })

      return { deliveries, skip_limit_reached: skipLimitReached }
    } catch (error) {
      logger.error(
        'Failed to get subscription deliveries',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetSubscriptionDeliveries'
