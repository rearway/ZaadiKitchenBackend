import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'

export interface DeleteMealInput {
  mealId: string
}

export interface DeleteMealOutput {
  message: string
  data: {
    id: string
    deleted: boolean
    deletedAt: string
  }
}

export function makeUC(deps: Deps) {
  return async function deleteMeal(
    input: DeleteMealInput
  ): Promise<DeleteMealOutput> {
    const { logger, mealLoader, mealPersistor } = deps

    try {
      const existing = await mealLoader.getMealById(input.mealId)
      if (!existing) {
        throw new ResourceNotFoundError('Meal', input.mealId)
      }

      const deletedAt = await mealPersistor.softDeleteMeal(input.mealId)

      return {
        message: 'Meal deleted successfully',
        data: {
          id: input.mealId,
          deleted: true,
          deletedAt: deletedAt.toISOString(),
        },
      }
    } catch (error) {
      logger.error(
        'Failed to delete meal',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'DeleteMeal'
