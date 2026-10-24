import { AdminMealsController } from './admin-meals.controller.js'
import type { UseCases } from '../../core/usecases/index.js'

describe('AdminMealsController.updateMeal', () => {
  it.each(['salad', 'executive'] as const)(
    'forwards meal_type %s on PATCH /api/v1/admin/meals/:meal_id',
    async mealType => {
      const updateMeal = jest.fn().mockResolvedValue({
        message: 'Meal updated successfully',
        data: { id: 'meal-1', mealType },
      })
      const controller = new AdminMealsController({
        commands: { updateMeal },
      } as unknown as UseCases)

      const response = await controller.updateMeal('meal-1', { meal_type: mealType })

      expect(updateMeal).toHaveBeenCalledWith(
        expect.objectContaining({
          mealId: 'meal-1',
          mealType,
        })
      )
      expect(response).toEqual({
        message: 'Meal updated successfully',
        data: { id: 'meal-1', mealType },
      })
    }
  )

  it('omits mealType when the PATCH body does not include meal_type', async () => {
    const updateMeal = jest.fn().mockResolvedValue({
      message: 'Meal updated successfully',
      data: { id: 'meal-1' },
    })
    const controller = new AdminMealsController({
      commands: { updateMeal },
    } as unknown as UseCases)

    await controller.updateMeal('meal-1', { kcal: 560 })

    expect(updateMeal).toHaveBeenCalledWith(
      expect.objectContaining({
        mealId: 'meal-1',
        kcal: 560,
        mealType: undefined,
      })
    )
  })
})
