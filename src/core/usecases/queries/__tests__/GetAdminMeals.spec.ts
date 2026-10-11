import { makeUC } from '../GetAdminMeals'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('GetAdminMeals', () => {
  it('picker context lists active meals only, without usage flags', async () => {
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
      status: 'active',
      mealType: 'all',
      q: undefined,
      page: 1,
      perPage: 20,
    })
    expect(result.meals[0]).toMatchObject({
      meal_id: 'meal-1',
      already_used: null,
      used_on_day: null,
    })
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
