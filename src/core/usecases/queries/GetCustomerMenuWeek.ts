import type { Deps } from '../../entitygateway/index.js'
import {
  getSaudiWorkWeekBounds,
  getNextSaudiWorkWeekBounds,
  getDayLabel,
  formatWeekRangeLabel,
} from '../services/weekUtils.js'
import { resolveDayActionFlags } from '../services/dayActionFlags.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'

export interface GetCustomerMenuWeekInput {
  userId: string
  mealType?: 'all' | 'executive' | 'salad'
}

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
  undoable: boolean
  is_skipped: boolean
  skip_reason: string | null
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
  return async function getCustomerMenuWeek(
    input: GetCustomerMenuWeekInput
  ): Promise<GetCustomerMenuWeekOutput> {
    const { logger, subscriptionLoader, menuWeekLoader, deliveryDayLoader } =
      deps

    try {
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const thisWeek = getSaudiWorkWeekBounds(now)
      const nextWeek = getNextSaudiWorkWeekBounds(now)

      let sub = await subscriptionLoader.getActiveSubscriptionByUserId(
        input.userId
      )
      if (sub) {
        sub = await ensurePauseStatus(deps, sub)
      }

      const allSlots = await menuWeekLoader.getMenuForDateRange(
        thisWeek.dateFrom,
        nextWeek.dateTo
      )

      const deliveryDays = sub
        ? await deliveryDayLoader.getDeliveryDaysBySubscription(sub.id, {
            from: thisWeek.dateFrom,
            to: nextWeek.dateTo,
          })
        : []
      const statusByDate = new Map(deliveryDays.map(d => [d.date, d.status]))

      const mealTypeFilter = input.mealType ?? 'all'

      const toCard = (slot: (typeof allSlots)[0]): MealCard | null => {
        if (!slot.meal) return null
        if (
          mealTypeFilter !== 'all' &&
          slot.meal.mealType !== mealTypeFilter
        ) {
          return null
        }

        const isToday = slot.deliveryDate === todayStr
        const isPast = slot.deliveryDate < todayStr
        const dayStatus = statusByDate.get(slot.deliveryDate) ?? null
        const flags = resolveDayActionFlags({
          subscription: sub,
          deliveryDate: slot.deliveryDate,
          mealType: slot.meal.mealType,
          dayStatus,
          now,
        })

        let card_state: CardState
        if (flags.is_skipped) card_state = 'skipped'
        else if (isPast) card_state = 'past'
        else if (isToday) card_state = 'today'
        else card_state = 'upcoming'

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
          skip_available: flags.skip_available,
          undoable: flags.undoable,
          is_skipped: flags.is_skipped,
          skip_reason: flags.skip_reason,
        }
      }

      const thisWeekSlots = allSlots
        .filter(
          s =>
            s.deliveryDate >= thisWeek.dateFrom &&
            s.deliveryDate <= thisWeek.dateTo
        )
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
        .map(toCard)
        .filter((c): c is MealCard => c !== null)

      const nextWeekSlots = allSlots
        .filter(
          s =>
            s.deliveryDate >= nextWeek.dateFrom &&
            s.deliveryDate <= nextWeek.dateTo
        )
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
      logger.error(
        'GetCustomerMenuWeek failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetCustomerMenuWeek'
