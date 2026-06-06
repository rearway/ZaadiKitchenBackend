import type { Deps } from '../../entitygateway/index.js'
import type { Meal } from '../../entities/index.js'
import { ResourceNotFoundError, MealInPublishedWeekError } from '../../../shared/errors/domain.errors.js'

export interface UpdateMealInput {
  mealId: string
  nameEn?: string
  nameAr?: string
  kcal?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  chefNote?: string
  keyIngredients?: string[]
  emoji?: string
  photoUrl?: string
  confirmPublishedEdit?: boolean
}

export interface UpdateMealOutput {
  message: string
  data: Meal
}

export function makeUC(deps: Deps) {
  return async function updateMeal(input: UpdateMealInput): Promise<UpdateMealOutput> {
    const { logger, mealLoader, mealPersistor, menuWeekLoader } = deps

    try {
      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      if (input.nameEn && input.nameEn.toLowerCase() !== meal.nameEn.toLowerCase()) {
        const duplicate = await mealLoader.getMealByName(input.nameEn, input.mealId)
        if (duplicate) {
          const { ResourceAlreadyExistsError } = await import('../../../shared/errors/index.js')
          throw new ResourceAlreadyExistsError('Meal', input.nameEn)
        }
      }

      // Check if meal is in a published week — require confirmation
      const publishedSlots = await menuWeekLoader.getMealsInWeek('__check_published__').catch(() => [])
      const usedInPublished = await (async () => {
        const allSlots = await menuWeekLoader.getMenuForDateRange('1970-01-01', '2099-12-31')
        const publishedSlotMealIds = allSlots
          .filter(s => s.mealId === input.mealId)
          .map(s => s.weekId)
        return [...new Set(publishedSlotMealIds)]
      })()

      if (usedInPublished.length > 0 && !input.confirmPublishedEdit) {
        throw new MealInPublishedWeekError(usedInPublished)
      }

      const { mealId, confirmPublishedEdit: _confirm, ...updates } = input
      const updated = await mealPersistor.updateMeal(mealId, updates)

      return { message: 'Meal updated successfully', data: updated }
    } catch (error) {
      logger.error('UpdateMeal failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'UpdateMeal'
