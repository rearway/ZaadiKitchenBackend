import { makeUC } from '../DeleteMeal'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import { ResourceNotFoundError } from '../../../../shared/errors'
import type { Meal } from '../../../entities/Meal.js'

const MEAL_ID = 'meal-uuid-1'

function existingMeal(status: Meal['status']): Meal {
  return {
    id: MEAL_ID,
    nameEn: 'Grilled Chicken',
    mealType: 'executive',
    kcal: 500,
    emoji: '🍛',
    status,
    erpCode: 'MABCDE',
    timesServed: 2,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  }
}

describe('DeleteMeal', () => {
  it.each(['draft', 'active', 'updated'] as const)(
    'soft-deletes a %s meal and keeps the row',
    async status => {
      const deletedAt = new Date('2026-10-25T12:00:00.000Z')
      const softDeleteMeal = jest.fn().mockResolvedValue(deletedAt)
      const deps = buildDeps({
        mealLoader: {
          ...buildDeps().mealLoader,
          getMealById: jest.fn().mockResolvedValue(existingMeal(status)),
        },
        mealPersistor: {
          ...buildDeps().mealPersistor,
          softDeleteMeal,
        },
      })
      const deleteMeal = makeUC(deps)

      const result = await deleteMeal({ mealId: MEAL_ID })

      expect(softDeleteMeal).toHaveBeenCalledWith(MEAL_ID)
      expect(result).toEqual({
        message: 'Meal deleted successfully',
        data: {
          id: MEAL_ID,
          deleted: true,
          deletedAt: deletedAt.toISOString(),
        },
      })
    }
  )

  it('returns not found and does not delete when the meal is missing', async () => {
    const softDeleteMeal = jest.fn()
    const deps = buildDeps({
      mealLoader: {
        ...buildDeps().mealLoader,
        getMealById: jest.fn().mockResolvedValue(null),
      },
      mealPersistor: {
        ...buildDeps().mealPersistor,
        softDeleteMeal,
      },
    })
    const deleteMeal = makeUC(deps)

    await expect(deleteMeal({ mealId: MEAL_ID })).rejects.toBeInstanceOf(
      ResourceNotFoundError
    )
    expect(softDeleteMeal).not.toHaveBeenCalled()
  })
})
