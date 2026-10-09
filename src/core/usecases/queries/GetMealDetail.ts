import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'
import {
  getSaudiWorkWeekBounds,
  getNextSaudiWorkWeekBounds,
} from '../services/weekUtils.js'
import { resolveDayActionFlags } from '../services/dayActionFlags.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'

export interface GetMealDetailInput {
  mealId: string
  userId: string
  deliveryDate?: string
}

export interface GetMealDetailOutput {
  meal_id: string
  name_en: string
  name_ar?: string
  meal_type: string
  emoji: string
  photo_url: string | null
  kcal: number
  macros: {
    protein_g?: number
    carbs_g?: number
    fat_g?: number
  }
  chef_note?: string
  key_ingredients?: string[]
  delivery_date: string | null
  skip_available: boolean
  undoable: boolean
  is_skipped: boolean
  skip_reason: string | null
}

export function makeUC(deps: Deps) {
  return async function getMealDetail(
    input: GetMealDetailInput
  ): Promise<GetMealDetailOutput> {
    const {
      logger,
      mealLoader,
      menuWeekLoader,
      subscriptionLoader,
      deliveryDayLoader,
    } = deps

    try {
      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      const now = new Date()
      const thisWeek = getSaudiWorkWeekBounds(now)
      const nextWeek = getNextSaudiWorkWeekBounds(now)
      const slots = await menuWeekLoader.getMenuForDateRange(
        thisWeek.dateFrom,
        nextWeek.dateTo
      )
      const matchingSlot = input.deliveryDate
        ? slots.find(
            s =>
              s.mealId === input.mealId &&
              s.deliveryDate === input.deliveryDate
          ) ?? slots.find(s => s.mealId === input.mealId)
        : slots.find(s => s.mealId === input.mealId)

      const deliveryDate = matchingSlot?.deliveryDate ?? input.deliveryDate ?? null

      let sub = await subscriptionLoader.getActiveSubscriptionByUserId(
        input.userId
      )
      if (sub) {
        sub = await ensurePauseStatus(deps, sub)
      }

      let dayStatus: string | null = null
      if (sub && deliveryDate) {
        const day = await deliveryDayLoader.getDeliveryDayByDate(
          sub.id,
          deliveryDate
        )
        dayStatus = day?.status ?? null
      }

      const flags = deliveryDate
        ? resolveDayActionFlags({
            subscription: sub,
            deliveryDate,
            mealType: meal.mealType,
            dayStatus,
            now,
          })
        : {
            skip_available: false,
            undoable: false,
            is_skipped: false,
            skip_reason: 'not_subscribed' as const,
          }

      return {
        meal_id: meal.id,
        name_en: meal.nameEn,
        name_ar: meal.nameAr,
        meal_type: meal.mealType,
        emoji: meal.emoji,
        photo_url: meal.photoUrl ?? null,
        kcal: meal.kcal,
        macros: {
          protein_g: meal.proteinG,
          carbs_g: meal.carbsG,
          fat_g: meal.fatG,
        },
        chef_note: meal.chefNote,
        key_ingredients: meal.keyIngredients,
        delivery_date: deliveryDate,
        skip_available: flags.skip_available,
        undoable: flags.undoable,
        is_skipped: flags.is_skipped,
        skip_reason: flags.skip_reason,
      }
    } catch (error) {
      logger.error(
        'GetMealDetail failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetMealDetail'
