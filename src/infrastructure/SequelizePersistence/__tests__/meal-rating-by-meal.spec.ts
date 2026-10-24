import { QueryTypes } from 'sequelize'
import {
  MealRatingPersistenceService,
  RATINGS_BY_MEAL_LIST_SQL,
  RATINGS_BY_MEAL_SUMMARY_SQL,
} from '../meal-rating-persistence.service.js'
import { MealRatingModel } from '../models/MealRatingModel.js'

describe('MealRatingPersistenceService.getRatingsByMeal', () => {
  const service = new MealRatingPersistenceService()

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('aggregates every rating for the meal and pages rows joined to users', () => {
    expect(RATINGS_BY_MEAL_SUMMARY_SQL).toContain('AVG(stars)')
    expect(RATINGS_BY_MEAL_SUMMARY_SQL).toContain('WHERE meal_id = :mealId')
    expect(RATINGS_BY_MEAL_SUMMARY_SQL).not.toContain('LIMIT')

    expect(RATINGS_BY_MEAL_LIST_SQL).toContain(
      'LEFT JOIN users u ON u.id = mr.user_id'
    )
    expect(RATINGS_BY_MEAL_LIST_SQL).toContain('WHERE mr.meal_id = :mealId')
    expect(RATINGS_BY_MEAL_LIST_SQL).toContain('u.phone')
    expect(RATINGS_BY_MEAL_LIST_SQL).toContain('u.full_name')
    expect(RATINGS_BY_MEAL_LIST_SQL).toContain('mr.tags')
    expect(RATINGS_BY_MEAL_LIST_SQL).toContain('mr.delivery_date')
    expect(RATINGS_BY_MEAL_LIST_SQL).toContain('mr.created_at')
    expect(RATINGS_BY_MEAL_LIST_SQL).toContain('ORDER BY mr.created_at DESC')
    expect(RATINGS_BY_MEAL_LIST_SQL).toContain('LIMIT :limit OFFSET :offset')
  })

  it('maps the meal-wide average and identity fields from the query rows', async () => {
    const createdAt = new Date('2026-09-03T08:15:00.000Z')
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ rating_count: '2', average_rating: '4.5' }])
      .mockResolvedValueOnce([
        {
          id: 'rating-1',
          user_id: 'user-1',
          phone: '+966500000001',
          full_name: 'Nora Ali',
          stars: '5',
          tags: ['Great portion', 'Too spicy'],
          delivery_date: '2026-09-02',
          created_at: createdAt,
        },
        {
          id: 'rating-2',
          user_id: 'user-2',
          phone: null,
          full_name: null,
          stars: 4,
          tags: '["Too salty"]',
          delivery_date: '2026-09-01',
          created_at: '2026-09-02T10:00:00.000Z',
        },
      ])
    Object.defineProperty(MealRatingModel, 'sequelize', {
      configurable: true,
      value: { query },
    })

    const result = await service.getRatingsByMeal('meal-1', 2, 10)

    expect(query).toHaveBeenNthCalledWith(
      1,
      RATINGS_BY_MEAL_SUMMARY_SQL,
      expect.objectContaining({
        replacements: { mealId: 'meal-1' },
        type: QueryTypes.SELECT,
      })
    )
    expect(query).toHaveBeenNthCalledWith(
      2,
      RATINGS_BY_MEAL_LIST_SQL,
      expect.objectContaining({
        replacements: { mealId: 'meal-1', limit: 10, offset: 10 },
        type: QueryTypes.SELECT,
      })
    )
    expect(result).toEqual({
      averageRating: 4.5,
      total: 2,
      ratings: [
        {
          id: 'rating-1',
          userId: 'user-1',
          phone: '+966500000001',
          fullName: 'Nora Ali',
          stars: 5,
          tags: ['Great portion', 'Too spicy'],
          deliveryDate: '2026-09-02',
          createdAt,
        },
        {
          id: 'rating-2',
          userId: 'user-2',
          phone: null,
          fullName: null,
          stars: 4,
          tags: ['Too salty'],
          deliveryDate: '2026-09-01',
          createdAt: new Date('2026-09-02T10:00:00.000Z'),
        },
      ],
    })
  })

  it('returns a null average when the meal has no ratings', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ rating_count: 0, average_rating: null }])
      .mockResolvedValueOnce([])
    Object.defineProperty(MealRatingModel, 'sequelize', {
      configurable: true,
      value: { query },
    })

    const result = await service.getRatingsByMeal('meal-1', 1, 20)

    expect(result).toEqual({
      averageRating: null,
      total: 0,
      ratings: [],
    })
  })
})
