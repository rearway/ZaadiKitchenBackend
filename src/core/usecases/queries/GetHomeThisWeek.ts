import type { Deps } from '../../entitygateway/index.js'
import { getSaudiWorkWeekBounds, getDayLabel } from '../services/weekUtils.js'
import { resolveDayActionFlags } from '../services/dayActionFlags.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'
import {
  canUseSkipAndPause,
  isSubscriptionInServicePeriod,
} from '../services/subscriptionServicePeriod.js'

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
      const statusByDate = new Map(deliveryDays.map(d => [d.date, d.status]))

      const subStatus = sub?.status ?? 'none'
      const flexLikeActive = sub != null && canUseSkipAndPause(sub)

      const cards = slots
        .filter(s => s.meal && s.deliveryDate >= todayStr)
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
        .map(slot => {
          const meal = slot.meal!
          const isToday = slot.deliveryDate === todayStr
          const isPast = slot.deliveryDate < todayStr
          const dayAbbr = getDayLabel(slot.deliveryDate)
          const dayStatus = statusByDate.get(slot.deliveryDate) ?? null
          const flags = resolveDayActionFlags({
            subscription: sub,
            deliveryDate: slot.deliveryDate,
            mealType: meal.mealType,
            dayStatus,
            now,
          })

          let card_state: GetHomeThisWeekOutput['cards'][0]['card_state']
          let cta_label: string | null = null
          let action_type = 'open_meal_detail'

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
            meal_id: meal.id,
            name_en: meal.nameEn,
            meal_type: meal.mealType,
            kcal: meal.kcal,
            emoji: meal.emoji,
            photo_url: meal.photoUrl ?? null,
            delivery_date: slot.deliveryDate,
            day_label: isToday ? 'TODAY' : dayAbbr,
            card_state,
            card_border: (isToday ? 'red' : 'default') as 'red' | 'default',
            skip_available: flags.skip_available,
            undoable: flags.undoable,
            is_skipped: flags.is_skipped,
            skip_reason: flags.skip_reason,
            action: cta_label ? { type: action_type, cta_label } : null,
          }
        })

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
