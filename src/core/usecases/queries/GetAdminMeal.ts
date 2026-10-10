import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'

export interface GetAdminMealInput {
  mealId: string
}

export interface GetAdminMealOutput {
  meal_id: string
  name_en: string
  name_ar?: string
  meal_type: string
  kcal: number
  macros: {
    protein_g?: number
    carbs_g?: number
    fat_g?: number
  }
  chef_note?: string
  key_ingredients?: string[]
  emoji: string
  status: string
  photo_url?: string
  created_at: Date
  activated_at?: Date
  last_served?: string
  times_served: number
}

export function makeUC(deps: Deps) {
  return async function getAdminMeal(input: GetAdminMealInput): Promise<GetAdminMealOutput> {
    const { logger, mealLoader } = deps

    try {
      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      return {
        meal_id: meal.id,
        name_en: meal.nameEn,
        name_ar: meal.nameAr,
        meal_type: meal.mealType,
        kcal: meal.kcal,
        macros: {
          protein_g: meal.proteinG,
          carbs_g: meal.carbsG,
          fat_g: meal.fatG,
        },
        chef_note: meal.chefNote,
        key_ingredients: meal.keyIngredients,
        emoji: meal.emoji,
        status: meal.status,
        photo_url: meal.photoUrl,
        created_at: meal.createdAt,
        activated_at: meal.activatedAt,
        last_served: meal.lastServed,
        times_served: meal.timesServed,
      }
    } catch (error) {
      logger.error('GetAdminMeal failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetAdminMeal'
