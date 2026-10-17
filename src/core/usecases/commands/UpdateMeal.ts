import type { Deps } from '../../entitygateway/index.js'
import type { Meal } from '../../entities/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'
import {
  hasMealFieldUpdates,
  mergeMealUpdates,
  snapshotMealFields,
  type MealFieldUpdates,
} from '../services/mealPendingChanges.js'

export interface UpdateMealInput extends MealFieldUpdates {
  mealId: string
  confirmPublishedEdit?: boolean
}

export interface UpdateMealOutput {
  message: string
  data: Meal
}

export function makeUC(deps: Deps) {
  return async function updateMeal(input: UpdateMealInput): Promise<UpdateMealOutput> {
    const { logger, mealLoader, mealPersistor } = deps

    try {
      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      const { mealId, confirmPublishedEdit: _confirm, ...fieldUpdates } = input

      if (input.nameEn && input.nameEn.toLowerCase() !== meal.nameEn.toLowerCase()) {
        const duplicate = await mealLoader.getMealByName(input.nameEn, input.mealId)
        if (duplicate) {
          const { ResourceAlreadyExistsError } =
            await import('../../../shared/errors/index.js')
          throw new ResourceAlreadyExistsError('Meal', input.nameEn)
        }
      }

      if (meal.status === 'draft') {
        const updated = await mealPersistor.updateMeal(mealId, fieldUpdates)
        return { message: 'Meal updated successfully', data: updated }
      }

      if (!hasMealFieldUpdates(fieldUpdates)) {
        return { message: 'Meal updated successfully', data: meal }
      }

      const pendingChanges = mergeMealUpdates(
        snapshotMealFields(meal, meal.pendingChanges),
        fieldUpdates
      )
      const updated = await mealPersistor.updateMeal(mealId, {
        status: 'updated',
        pendingChanges,
      })

      return { message: 'Meal updated successfully', data: updated }
    } catch (error) {
      logger.error('UpdateMeal failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'UpdateMeal'
