import { makeUC } from '../GetAdminMealRatings'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import { ResourceNotFoundError } from '../../../../shared/errors/index.js'

describe('GetAdminMealRatings', () => {
  it('throws ResourceNotFoundError when the meal does not exist', async () => {
    const deps = buildDeps()
    jest.mocked(deps.mealLoader.getMealById).mockResolvedValue(null)

    await expect(
      makeUC(deps)({ mealId: 'missing-meal' })
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
    expect(deps.mealRatingLoader.getRatingsByMeal).not.toHaveBeenCalled()
  })

  it('returns the meal-wide average and a snake_case page of user ratings', async () => {
    const deps = buildDeps()
    const createdAt = new Date('2026-09-03T08:15:00.000Z')
    jest
      .mocked(deps.mealLoader.getMealById)
      .mockResolvedValue({ id: 'meal-1' } as never)
    jest.mocked(deps.mealRatingLoader.getRatingsByMeal).mockResolvedValue({
      averageRating: 4.25,
      total: 25,
      ratings: [
        {
          id: 'rating-1',
          userId: 'user-1',
          phone: '+966500000001',
          fullName: 'Nora Ali',
          stars: 5,
          tags: ['Great portion'],
          deliveryDate: '2026-09-02',
          createdAt,
        },
      ],
    })

    const result = await makeUC(deps)({
      mealId: 'meal-1',
      page: 2,
      perPage: 10,
    })

    expect(deps.mealRatingLoader.getRatingsByMeal).toHaveBeenCalledWith(
      'meal-1',
      2,
      10
    )
    expect(result).toEqual({
      meal_id: 'meal-1',
      average_rating: 4.25,
      rating_count: 25,
      ratings: [
        {
          id: 'rating-1',
          user_id: 'user-1',
          phone: '+966500000001',
          full_name: 'Nora Ali',
          stars: 5,
          tags: ['Great portion'],
          delivery_date: '2026-09-02',
          created_at: createdAt,
        },
      ],
      pagination: {
        page: 2,
        per_page: 10,
        total: 25,
        total_pages: 3,
      },
    })
  })

  it('returns a null average when the meal has no ratings', async () => {
    const deps = buildDeps()
    jest
      .mocked(deps.mealLoader.getMealById)
      .mockResolvedValue({ id: 'meal-1' } as never)
    jest.mocked(deps.mealRatingLoader.getRatingsByMeal).mockResolvedValue({
      averageRating: null,
      total: 0,
      ratings: [],
    })

    const result = await makeUC(deps)({ mealId: 'meal-1' })

    expect(deps.mealRatingLoader.getRatingsByMeal).toHaveBeenCalledWith(
      'meal-1',
      1,
      20
    )
    expect(result.average_rating).toBeNull()
    expect(result.rating_count).toBe(0)
    expect(result.ratings).toEqual([])
    expect(result.pagination).toEqual({
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 0,
    })
  })

  it('clamps page and perPage to the admin list bounds', async () => {
    const deps = buildDeps()
    jest
      .mocked(deps.mealLoader.getMealById)
      .mockResolvedValue({ id: 'meal-1' } as never)
    jest.mocked(deps.mealRatingLoader.getRatingsByMeal).mockResolvedValue({
      averageRating: null,
      total: 0,
      ratings: [],
    })

    await makeUC(deps)({ mealId: 'meal-1', page: 0, perPage: 500 })

    expect(deps.mealRatingLoader.getRatingsByMeal).toHaveBeenCalledWith(
      'meal-1',
      1,
      50
    )
  })
})
