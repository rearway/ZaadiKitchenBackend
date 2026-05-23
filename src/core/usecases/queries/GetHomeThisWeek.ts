import type { Deps } from '../../entitygateway/index.js'
import { getSaudiWorkWeekBounds, getDayLabel, isAfterSkipCutoff } from '../services/weekUtils.js'

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
    delivery_date: string
    day_label: string
    card_state: 'today' | 'upcoming' | 'skipped' | 'past' | 'browse_only' | 'past_greyed'
    card_border: 'red' | 'default'
    action: {
      type: string
      cta_label: string
    } | null
  }>
}

export function makeUC(deps: Deps) {
  return async function getHomeThisWeek(input: GetHomeThisWeekInput): Promise<GetHomeThisWeekOutput> {
    const { logger, subscriptionLoader, menuWeekLoader } = deps

    try {
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const bounds = getSaudiWorkWeekBounds(now)

      const [sub, slots] = await Promise.all([
        subscriptionLoader.getActiveSubscriptionByUserId(input.userId),
        menuWeekLoader.getMenuForDateRange(bounds.dateFrom, bounds.dateTo),
      ])

      const subStatus = sub?.status ?? 'none'

      const cards = slots
        .filter(s => s.meal && s.deliveryDate >= todayStr)
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
        .map(slot => {
          const meal = slot.meal!
          const isToday = slot.deliveryDate === todayStr
          const isPast = slot.deliveryDate < todayStr
          const dayAbbr = getDayLabel(slot.deliveryDate)

          let card_state: GetHomeThisWeekOutput['cards'][0]['card_state']
          let cta_label: string | null = null
          let action_type = 'open_meal_detail'

          if (subStatus === 'paused') {
            card_state = 'browse_only'
            cta_label = 'Browse only'
          } else if (isPast) {
            card_state = 'past'
            cta_label = null
          } else if (isToday) {
            card_state = 'today'
          } else {
            card_state = 'upcoming'
          }

          if (subStatus === 'active' && !isPast && card_state !== 'browse_only') {
            const skipUsed = sub!.skipDaysUsed
            const skipAllowed = sub!.skipDaysAllowed
            const cutoffPassed = isAfterSkipCutoff(slot.deliveryDate, now)
            if (!cutoffPassed && skipUsed < skipAllowed) {
              cta_label = 'Skip →'
            } else {
              cta_label = null
            }
          } else if (subStatus === 'none' || subStatus === undefined) {
            cta_label = 'Subscribe →'
          } else if (subStatus === 'expired' || subStatus === 'cancelled') {
            cta_label = 'Renew →'
          }

          return {
            meal_id: meal.id,
            name_en: meal.nameEn,
            meal_type: meal.mealType,
            kcal: meal.kcal,
            emoji: meal.emoji,
            delivery_date: slot.deliveryDate,
            day_label: isToday ? 'TODAY' : dayAbbr,
            card_state,
            card_border: (isToday ? 'red' : 'default') as 'red' | 'default',
            action: cta_label
              ? { type: action_type, cta_label }
              : null,
          }
        })

      return {
        week_label: "This Week's Meals",
        cards,
      }
    } catch (error) {
      logger.error('GetHomeThisWeek failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetHomeThisWeek'
