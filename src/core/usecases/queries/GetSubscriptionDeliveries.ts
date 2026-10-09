import { Deps } from '../../entitygateway/index.js'
import { resolveDayActionFlags } from '../services/dayActionFlags.js'
import { getFlexDaysRemaining } from '../services/flexDays.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'

export interface GetSubscriptionDeliveriesInput {
  userId: string
  from?: string
  to?: string
}

export interface DeliveryItem {
  date: string
  label: string
  meal_name: string | null
  photo_url: string | null
  meal_type: string
  status: string
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

      const photoByDateAndType = new Map<string, string | null>()
      if (days.length > 0) {
        const from = input.from ?? days[0].date
        const to = input.to ?? days[days.length - 1].date
        const slots = await menuWeekLoader.getMenuForDateRange(from, to)
        for (const slot of slots) {
          if (slot.meal) {
            photoByDateAndType.set(
              `${slot.deliveryDate}:${slot.mealType}`,
              slot.meal.photoUrl ?? null
            )
          }
        }
      }

      const today = new Date()
      const skipLimitReached = getFlexDaysRemaining(subscription) <= 0

      const deliveries: DeliveryItem[] = days.map(day => {
        const dayDate = new Date(day.date + 'T00:00:00Z')
        const flags = resolveDayActionFlags({
          subscription,
          deliveryDate: day.date,
          mealType: day.mealType,
          dayStatus: day.status,
        })

        return {
          date: day.date,
          label: formatShortLabel(dayDate, today),
          meal_name: day.mealName ?? null,
          photo_url:
            photoByDateAndType.get(`${day.date}:${day.mealType}`) ?? null,
          meal_type: day.mealType,
          status: day.status,
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
