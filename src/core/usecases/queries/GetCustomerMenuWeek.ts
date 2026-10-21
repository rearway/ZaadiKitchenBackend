import type { Deps } from '../../entitygateway/index.js'
import type { DeliveryDay } from '../../entities/DeliveryDay.js'
import type { MenuSlotWithMeal } from '../../entities/MenuSlot.js'
import type { Subscription } from '../../entities/Subscription.js'
import {
  getSaudiWorkWeekBounds,
  getNextSaudiWorkWeekBounds,
  getDayLabel,
  formatWeekRangeLabel,
} from '../services/weekUtils.js'
import {
  isDeliverableMenuDay,
  resolveDayActionFlags,
} from '../services/dayActionFlags.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'
import {
  canChangeMealChoice,
  resolveDayEffectiveMeal,
  slotsForDate,
  streamOptions,
  toMealSummary,
  uniqueSortedDates,
  type MealOptionCard,
  type MealSummary,
} from '../services/customerMenuDay.js'

export interface GetCustomerMenuWeekInput {
  userId: string
  mealType?: 'all' | 'executive' | 'salad'
}

type CardState = 'today' | 'upcoming' | 'past' | 'skipped'

export interface DayMenu {
  delivery_date: string
  day_label: string
  card_state: CardState
  is_today: boolean
  skip_available: boolean
  undoable: boolean
  is_skipped: boolean
  skip_reason: string | null
  /** True when this date is a meal day on the user's plan (scheduled). */
  is_deliverable: boolean
  meal_type: string | null
  meal_id: string | null
  name_en: string | null
  kcal: number | null
  emoji: string | null
  photo_url: string | null
  selected_meal_id: string | null
  can_change: boolean
  effective_meal: MealSummary | null
  executive_options: MealOptionCard[]
  salad_options: MealOptionCard[]
}

interface WeekSection {
  label: string
  date_from: string
  date_to: string
  days: DayMenu[]
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

export function buildCustomerDayMenu(input: {
  date: string
  slots: MenuSlotWithMeal[]
  day: DeliveryDay | undefined
  subscription: Subscription | null
  now: Date
  todayStr: string
}): DayMenu {
  const { date, slots, day, subscription: sub, now, todayStr } = input
  const isToday = date === todayStr
  const isPast = date < todayStr
  const dayStatus = day?.status ?? null
  const assignedMealType = (day?.mealType ?? sub?.mealType) as
    | 'executive'
    | 'salad'
    | undefined
  const selectedMealId = day?.selectedMealId ?? null
  const flags = resolveDayActionFlags({
    subscription: sub,
    deliveryDate: date,
    mealType: assignedMealType,
    assignedMealType,
    dayStatus,
    now,
  })

  let card_state: CardState
  if (flags.is_skipped) card_state = 'skipped'
  else if (isPast) card_state = 'past'
  else if (isToday) card_state = 'today'
  else card_state = 'upcoming'

  const executive_options = streamOptions(slots, 'executive', selectedMealId)
  const salad_options = streamOptions(slots, 'salad', selectedMealId)
  const effective =
    assignedMealType != null
      ? resolveDayEffectiveMeal(assignedMealType, selectedMealId, slots)
      : null
  const summary = effective ? toMealSummary(effective) : null
  const optionCount = executive_options.length + salad_options.length

  return {
    delivery_date: date,
    day_label: buildDayLabel(date, isToday),
    card_state,
    is_today: isToday,
    skip_available: flags.skip_available,
    undoable: flags.undoable,
    is_skipped: flags.is_skipped,
    skip_reason: flags.skip_reason,
    is_deliverable: isDeliverableMenuDay({
      subscription: sub,
      mealType: assignedMealType,
      assignedMealType,
      dayStatus,
    }),
    meal_type: assignedMealType ?? null,
    meal_id: summary?.meal_id ?? null,
    name_en: summary?.name_en ?? null,
    kcal: summary?.kcal ?? null,
    emoji: summary?.emoji ?? null,
    photo_url: summary?.photo_url ?? null,
    selected_meal_id: selectedMealId,
    can_change: canChangeMealChoice({
      subscription: sub,
      dayStatus,
      deliveryDate: date,
      optionCount,
      now,
    }),
    effective_meal: summary,
    executive_options,
    salad_options,
  }
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

      // meal_type remains on the query for client compatibility; both streams
      // are always returned so the picker can show Executive and Salad.
      void input.mealType

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
      const dayByDate = new Map(deliveryDays.map(d => [d.date, d]))

      const toDay = (date: string): DayMenu =>
        buildCustomerDayMenu({
          date,
          slots: slotsForDate(allSlots, date),
          day: dayByDate.get(date),
          subscription: sub,
          now,
          todayStr,
        })

      return {
        this_week: {
          label: `This week · ${formatWeekRangeLabel(thisWeek.dateFrom, thisWeek.dateTo)}`,
          date_from: thisWeek.dateFrom,
          date_to: thisWeek.dateTo,
          days: uniqueSortedDates(
            allSlots,
            thisWeek.dateFrom,
            thisWeek.dateTo
          ).map(toDay),
        },
        next_week: {
          label: `Next week · ${formatWeekRangeLabel(nextWeek.dateFrom, nextWeek.dateTo)}`,
          date_from: nextWeek.dateFrom,
          date_to: nextWeek.dateTo,
          days: uniqueSortedDates(
            allSlots,
            nextWeek.dateFrom,
            nextWeek.dateTo
          ).map(toDay),
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
