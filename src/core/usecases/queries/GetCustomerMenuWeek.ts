import type { Deps } from '../../entitygateway/index.js'
import { getSaudiWorkWeekBounds, getNextSaudiWorkWeekBounds, getDayLabel, formatWeekRangeLabel, isAfterSkipCutoff } from '../services/weekUtils.js'

export interface GetCustomerMenuWeekInput {
  userId: string
  mealType?: 'all' | 'executive' | 'salad'
}

type SkipReason =
  | 'past_cutoff'
  | 'skip_limit_reached'
  | 'not_subscribed'
  | 'subscription_paused'
  | 'subscription_expired'
  | 'subscription_cancelled'
  | 'already_skipped'
  | null

type CardState = 'today' | 'upcoming' | 'past' | 'skipped'

interface MealCard {
  meal_id: string
  name_en: string
  meal_type: string
  kcal: number
  emoji: string
  photo_url: string | null
  delivery_date: string
  day_label: string
  card_state: CardState
  is_today: boolean
  skip_available: boolean
  skip_reason: SkipReason
}

interface WeekSection {
  label: string
  date_from: string
  date_to: string
  days: MealCard[]
}

export interface GetCustomerMenuWeekOutput {
  this_week: WeekSection
  next_week: WeekSection
}

function buildDayLabel(deliveryDate: string, isToday: boolean): string {
  if (isToday) return 'TODAY'
  const d = new Date(deliveryDate)
  return `${getDayLabel(deliveryDate)} ${d.getUTCDate()}`
}

export function makeUC(deps: Deps) {
  return async function getCustomerMenuWeek(input: GetCustomerMenuWeekInput): Promise<GetCustomerMenuWeekOutput> {
    const { logger, subscriptionLoader, menuWeekLoader } = deps

    try {
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const thisWeek = getSaudiWorkWeekBounds(now)
      const nextWeek = getNextSaudiWorkWeekBounds(now)

      const [sub, allSlots] = await Promise.all([
        subscriptionLoader.getActiveSubscriptionByUserId(input.userId),
        menuWeekLoader.getMenuForDateRange(thisWeek.dateFrom, nextWeek.dateTo),
      ])

      const subStatus = sub?.status ?? null
      const mealTypeFilter = input.mealType ?? 'all'

      const toCard = (slot: (typeof allSlots)[0]): MealCard | null => {
        if (!slot.meal) return null
        if (mealTypeFilter !== 'all' && slot.meal.mealType !== mealTypeFilter) return null

        const isToday = slot.deliveryDate === todayStr
        const isPast = slot.deliveryDate < todayStr

        let card_state: CardState
        if (isPast) card_state = 'past'
        else if (isToday) card_state = 'today'
        else card_state = 'upcoming'

        let skip_available = false
        let skip_reason: SkipReason = null

        if (!subStatus || subStatus === null) {
          skip_reason = 'not_subscribed'
        } else if (subStatus === 'expired') {
          skip_reason = 'subscription_expired'
        } else if (subStatus === 'cancelled') {
          skip_reason = 'subscription_cancelled'
        } else if (subStatus === 'paused') {
          skip_reason = 'subscription_paused'
        } else if (subStatus === 'active') {
          if (isPast) {
            skip_reason = 'past_cutoff'
          } else if (isAfterSkipCutoff(slot.deliveryDate, now)) {
            skip_reason = 'past_cutoff'
          } else if (sub!.skipDaysUsed >= sub!.skipDaysAllowed) {
            skip_reason = 'skip_limit_reached'
          } else {
            skip_available = true
          }
        }

        return {
          meal_id: slot.meal.id,
          name_en: slot.meal.nameEn,
          meal_type: slot.meal.mealType,
          kcal: slot.meal.kcal,
          emoji: slot.meal.emoji,
          photo_url: slot.meal.photoUrl ?? null,
          delivery_date: slot.deliveryDate,
          day_label: buildDayLabel(slot.deliveryDate, isToday),
          card_state,
          is_today: isToday,
          skip_available,
          skip_reason,
        }
      }

      const thisWeekSlots = allSlots
        .filter(s => s.deliveryDate >= thisWeek.dateFrom && s.deliveryDate <= thisWeek.dateTo)
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
        .map(toCard)
        .filter((c): c is MealCard => c !== null)

      const nextWeekSlots = allSlots
        .filter(s => s.deliveryDate >= nextWeek.dateFrom && s.deliveryDate <= nextWeek.dateTo)
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
        .map(toCard)
        .filter((c): c is MealCard => c !== null)

      return {
        this_week: {
          label: `This week · ${formatWeekRangeLabel(thisWeek.dateFrom, thisWeek.dateTo)}`,
          date_from: thisWeek.dateFrom,
          date_to: thisWeek.dateTo,
          days: thisWeekSlots,
        },
        next_week: {
          label: `Next week · ${formatWeekRangeLabel(nextWeek.dateFrom, nextWeek.dateTo)}`,
          date_from: nextWeek.dateFrom,
          date_to: nextWeek.dateTo,
          days: nextWeekSlots,
        },
      }
    } catch (error) {
      logger.error('GetCustomerMenuWeek failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetCustomerMenuWeek'
