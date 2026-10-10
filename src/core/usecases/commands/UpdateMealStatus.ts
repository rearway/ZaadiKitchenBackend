import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError, MealInPublishedWeekError } from '../../../shared/errors/domain.errors.js'
import { getPublishedWeeksBlockingMealEdit } from '../services/getMealPublishedEditBlockers.js'

export interface UpdateMealStatusInput {
  mealId: string
  status: 'active' | 'draft'
  confirmPublishedEdit?: boolean
}

export interface UpdateMealStatusOutput {
  meal_id: string
  previous_status: string
  status: string
  updated_at: Date
}

export function makeUC(deps: Deps) {
  return async function updateMealStatus(input: UpdateMealStatusInput): Promise<UpdateMealStatusOutput> {
    const { logger, mealLoader, mealPersistor, menuWeekLoader } = deps

    try {
      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      // Moving to draft while assigned to a published current/next week requires confirmation
      if (input.status === 'draft') {
        const affectedWeeks = await getPublishedWeeksBlockingMealEdit(
          input.mealId,
          menuWeekLoader
        )
        if (affectedWeeks.length > 0 && !input.confirmPublishedEdit) {
          throw new MealInPublishedWeekError(affectedWeeks)
        }
      }

      const updated = await mealPersistor.updateMealStatus(input.mealId, input.status)
      return {
        meal_id: updated.id,
        previous_status: meal.status,
        status: updated.status,
        updated_at: updated.updatedAt,
      }
    } catch (error) {
      logger.error('UpdateMealStatus failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'UpdateMealStatus'
