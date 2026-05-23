import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'
import { getSaudiWorkWeekBounds, getNextSaudiWorkWeekBounds } from '../services/weekUtils.js'

export interface GetMealDetailInput {
  mealId: string
}

export interface GetMealDetailOutput {
  meal_id: string
  name_en: string
  name_ar?: string
  meal_type: string
  emoji: string
  kcal: number
  macros: {
    protein_g?: number
    carbs_g?: number
    fat_g?: number
  }
  chef_note?: string
  key_ingredients?: string[]
  delivery_date: string | null
}

export function makeUC(deps: Deps) {
  return async function getMealDetail(input: GetMealDetailInput): Promise<GetMealDetailOutput> {
    const { logger, mealLoader, menuWeekLoader } = deps

    try {
      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      // Find the most relevant upcoming delivery date for this meal
      const now = new Date()
      const thisWeek = getSaudiWorkWeekBounds(now)
      const nextWeek = getNextSaudiWorkWeekBounds(now)
      const slots = await menuWeekLoader.getMenuForDateRange(thisWeek.dateFrom, nextWeek.dateTo)
      const matchingSlot = slots.find(s => s.mealId === input.mealId)

      return {
        meal_id: meal.id,
        name_en: meal.nameEn,
        name_ar: meal.nameAr,
        meal_type: meal.mealType,
        emoji: meal.emoji,
        kcal: meal.kcal,
        macros: {
          protein_g: meal.proteinG,
          carbs_g: meal.carbsG,
          fat_g: meal.fatG,
        },
        chef_note: meal.chefNote,
        key_ingredients: meal.keyIngredients,
        delivery_date: matchingSlot?.deliveryDate ?? null,
      }
    } catch (error) {
      logger.error('GetMealDetail failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetMealDetail'
