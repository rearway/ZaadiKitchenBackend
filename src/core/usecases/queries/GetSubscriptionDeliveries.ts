import { Deps } from '../../entitygateway/index.js'

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
  skippable: boolean
  skip_reason?: string
  undoable?: boolean
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

// Cutoff is 6 PM KSA (UTC+3) = 15:00 UTC the day before delivery
function isPastCutoff(deliveryDateStr: string): boolean {
  const [y, m, d] = deliveryDateStr.split('-').map(Number)
  // Day before delivery at 15:00 UTC (6 PM KSA)
  const cutoff = new Date(Date.UTC(y, m - 1, d - 1, 15, 0, 0))
  return new Date() > cutoff
}

export function makeUC(deps: Deps) {
  return async function getSubscriptionDeliveries(
    input: GetSubscriptionDeliveriesInput
  ): Promise<GetSubscriptionDeliveriesOutput> {
    const { logger, subscriptionLoader, deliveryDayLoader, menuWeekLoader } = deps
    try {
      const { userId } = input
      const subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)

      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

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
      const skipLimitReached =
        subscription.skipDaysUsed >= subscription.skipDaysAllowed

      const deliveries: DeliveryItem[] = days.map(day => {
        const dayDate = new Date(day.date + 'T00:00:00Z')
        const pastCutoff = isPastCutoff(day.date)
        let skippable = false
        let skip_reason: string | undefined
        let undoable: boolean | undefined

        if (day.status === 'skipped') {
          skippable = false
          skip_reason = 'already_skipped'
          undoable = !pastCutoff
        } else if (day.status === 'scheduled') {
          if (pastCutoff) {
            skippable = false
            skip_reason = 'past_cutoff'
          } else if (skipLimitReached) {
            skippable = false
            skip_reason = 'skip_limit_reached'
          } else {
            skippable = true
          }
        }

        return {
          date: day.date,
          label: formatShortLabel(dayDate, today),
          meal_name: day.mealName ?? null,
          photo_url: photoByDateAndType.get(`${day.date}:${day.mealType}`) ?? null,
          meal_type: day.mealType,
          status: day.status,
          skippable,
          ...(skip_reason ? { skip_reason } : {}),
          ...(undoable !== undefined ? { undoable } : {}),
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
