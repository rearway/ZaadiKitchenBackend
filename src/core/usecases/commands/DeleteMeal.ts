import { Deps } from '../../entitygateway/index.js'

export interface DeleteMealInput {
  mealId: string
}

export interface DeleteMealOutput {
  message: string
}

export function makeUC(deps: Deps) {
  return async function deleteMeal(
    input: DeleteMealInput
  ): Promise<DeleteMealOutput> {
    const { logger, mealLoader, mealPersistor } = deps
    try {
      const { mealId } = input

      const meal = await mealLoader.getMealById(mealId)
      if (!meal) {
        const { ResourceNotFoundError } = await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Meal')
      }

      if (meal.status === 'active') {
        const { ValidationError } = await import('../../../shared/errors/index.js')
        throw new ValidationError('Cannot delete an active meal. Draft it first.')
      }

      await mealPersistor.deleteMeal(mealId)

      return { message: 'Meal deleted successfully' }
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
