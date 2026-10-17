import type { Deps } from '../../entitygateway/index.js'
import { getSaudiWorkWeekBounds, getDayLabel } from '../services/weekUtils.js'
import {
  isDeliverableMenuDay,
  resolveDayActionFlags,
} from '../services/dayActionFlags.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'
import {
  canUseSkipAndPause,
  isSubscriptionInServicePeriod,
} from '../services/subscriptionServicePeriod.js'
import {
  canChangeMealChoice,
  resolveDayEffectiveMeal,
  slotsForDate,
  streamOptions,
  uniqueSortedDates,
  type MealOptionCard,
} from '../services/customerMenuDay.js'

export interface GetHomeThisWeekInput {
  userId: string
}

export interface GetHomeThisWeekOutput {
  week_label: string
  cards: Array<{
    meal_id: string
    name_en: string
    meal_type: string
    kcal: number
    emoji: string
    photo_url: string | null
    delivery_date: string
    day_label: string
    card_state:
      | 'today'
      | 'upcoming'
      | 'skipped'
      | 'past'
      | 'browse_only'
      | 'past_greyed'
    card_border: 'red' | 'default'
    skip_available: boolean
    undoable: boolean
    is_skipped: boolean
    skip_reason: string | null
    is_deliverable: boolean
    selected_meal_id: string | null
    can_change: boolean
    executive_options: MealOptionCard[]
    salad_options: MealOptionCard[]
    action: {
      type: string
      cta_label: string
    } | null
  }>
}

export function makeUC(deps: Deps) {
  return async function getHomeThisWeek(
    input: GetHomeThisWeekInput
  ): Promise<GetHomeThisWeekOutput> {
    const { logger, subscriptionLoader, menuWeekLoader, deliveryDayLoader } =
      deps

    try {
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const bounds = getSaudiWorkWeekBounds(now)

      let sub = await subscriptionLoader.getActiveSubscriptionByUserId(
        input.userId
      )
      if (sub) {
        sub = await ensurePauseStatus(deps, sub)
      }

      const slots = await menuWeekLoader.getMenuForDateRange(
        bounds.dateFrom,
        bounds.dateTo
      )

      const deliveryDays = sub
        ? await deliveryDayLoader.getDeliveryDaysBySubscription(sub.id, {
            from: bounds.dateFrom,
            to: bounds.dateTo,
          })
        : []
      const dayByDate = new Map(deliveryDays.map(d => [d.date, d]))

      const subStatus = sub?.status ?? 'none'
      const flexLikeActive = sub != null && canUseSkipAndPause(sub)

      const dates = uniqueSortedDates(slots, todayStr, bounds.dateTo)
      const cards = dates
        .map(date => {
          const daySlots = slotsForDate(slots, date)
          const day = dayByDate.get(date)
          const assignedMealType = (day?.mealType ?? sub?.mealType) as
            | 'executive'
            | 'salad'
            | undefined
          const selectedMealId = day?.selectedMealId ?? null
          const effective =
            assignedMealType != null
              ? resolveDayEffectiveMeal(
                  assignedMealType,
                  selectedMealId,
                  daySlots
                )
              : resolveDayEffectiveMeal(
                  'executive',
                  null,
                  daySlots
                ) ?? resolveDayEffectiveMeal('salad', null, daySlots)
          if (!effective) return null

          const isToday = date === todayStr
          const isPast = date < todayStr
          const dayAbbr = getDayLabel(date)
          const dayStatus = day?.status ?? null
          const flags = resolveDayActionFlags({
            subscription: sub,
            deliveryDate: date,
            mealType: assignedMealType ?? effective.mealType,
            assignedMealType: assignedMealType ?? effective.mealType,
            dayStatus,
            now,
          })
          const executive_options = streamOptions(
            daySlots,
            'executive',
            selectedMealId
          )
          const salad_options = streamOptions(daySlots, 'salad', selectedMealId)
          const optionCount =
            (assignedMealType ?? effective.mealType) === 'salad'
              ? salad_options.length
              : executive_options.length

          let card_state: GetHomeThisWeekOutput['cards'][0]['card_state']
          let cta_label: string | null = null
          const action_type = 'open_meal_detail'

          if (subStatus === 'paused') {
            card_state = 'browse_only'
            cta_label = 'Browse only'
          } else if (flags.is_skipped) {
            card_state = 'skipped'
            cta_label = flags.undoable ? 'Undo' : null
          } else if (isPast) {
            card_state = 'past'
            cta_label = null
          } else if (isToday) {
            card_state = 'today'
          } else {
            card_state = 'upcoming'
          }

          if (
            flexLikeActive &&
            !isPast &&
            !flags.is_skipped &&
            card_state !== 'browse_only'
          ) {
            cta_label = flags.skip_available ? 'Skip →' : null
          } else if (subStatus === 'none' || subStatus === undefined) {
            cta_label = 'Subscribe →'
          } else if (
            subStatus === 'expired' ||
            (subStatus === 'cancelled' &&
              sub != null &&
              !isSubscriptionInServicePeriod(sub))
          ) {
            cta_label = 'Renew →'
          }

          return {
            meal_id: effective.id,
            name_en: effective.nameEn,
            meal_type: assignedMealType ?? effective.mealType,
            kcal: effective.kcal,
            emoji: effective.emoji,
            photo_url: effective.photoUrl ?? null,
            delivery_date: date,
            day_label: isToday ? 'TODAY' : dayAbbr,
            card_state,
            card_border: (isToday ? 'red' : 'default') as 'red' | 'default',
            skip_available: flags.skip_available,
            undoable: flags.undoable,
            is_skipped: flags.is_skipped,
            skip_reason: flags.skip_reason,
            is_deliverable: isDeliverableMenuDay({
              subscription: sub,
              mealType: assignedMealType ?? effective.mealType,
              assignedMealType: assignedMealType ?? effective.mealType,
              dayStatus,
            }),
            selected_meal_id: selectedMealId,
            can_change: canChangeMealChoice({
              subscription: sub,
              dayStatus,
              deliveryDate: date,
              optionCount,
              now,
            }),
            executive_options,
            salad_options,
            action: cta_label ? { type: action_type, cta_label } : null,
          }
        })
        .filter((card): card is NonNullable<typeof card> => card !== null)

      return {
        week_label: "This Week's Meals",
        cards,
      }
    } catch (error) {
      logger.error(
        'GetHomeThisWeek failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetHomeThisWeek'
