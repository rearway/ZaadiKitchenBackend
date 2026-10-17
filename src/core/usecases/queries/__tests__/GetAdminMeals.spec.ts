import { makeUC } from '../GetAdminMeals'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('GetAdminMeals', () => {
  it('picker context lists assignable meals without usage flags', async () => {
    const deps = buildDeps()
    jest.mocked(deps.mealLoader.getMeals).mockResolvedValue({
      meals: [
        {
          id: 'meal-1',
          nameEn: 'Chicken',
          nameAr: '',
          mealType: 'executive',
          status: 'active',
          kcal: 500,
          photoUrl: null,
        } as never,
      ],
      total: 1,
    })

    const result = await makeUC(deps)({ context: 'picker', status: 'all' })

    expect(deps.mealLoader.getMeals).toHaveBeenCalledWith({
      status: 'assignable',
      mealType: 'all',
      q: undefined,
      page: 1,
      perPage: 20,
    })
    expect(result.meals[0]).toMatchObject({
      meal_id: 'meal-1',
      already_used: null,
      used_on_day: null,
      has_pending_changes: false,
    })
  })

  it('marks updated meals as having pending changes', async () => {
    const deps = buildDeps()
    jest.mocked(deps.mealLoader.getMeals).mockResolvedValue({
      meals: [
        {
          id: 'meal-2',
          nameEn: 'Salad',
          mealType: 'salad',
          status: 'updated',
          kcal: 300,
          photoUrl: null,
          pendingChanges: { kcal: 320 },
        } as never,
      ],
      total: 1,
    })

    const result = await makeUC(deps)({ status: 'updated' })

    expect(deps.mealLoader.getMeals).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'updated' })
    )
    expect(result.meals[0].has_pending_changes).toBe(true)
    expect(result.meals[0].status).toBe('updated')
  })

  it('passes status and meal_type filters through outside picker context', async () => {
    const deps = buildDeps()

    await makeUC(deps)({ status: 'draft', mealType: 'salad', q: 'fat', page: 2, perPage: 10 })

    expect(deps.mealLoader.getMeals).toHaveBeenCalledWith({
      status: 'draft',
      mealType: 'salad',
      q: 'fat',
      page: 2,
      perPage: 10,
    })
  })
})
