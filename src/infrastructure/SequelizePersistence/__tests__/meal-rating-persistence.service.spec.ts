import { QueryTypes } from 'sequelize'
import {
  MealRatingPersistenceService,
  PENDING_RATING_DAYS_SQL,
} from '../meal-rating-persistence.service.js'
import { DeliveryDayModel } from '../models/DeliveryDayModel.js'

describe('MealRatingPersistenceService.getPendingRatingDays', () => {
  const service = new MealRatingPersistenceService()

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses delivery-date and text-cast meal_type joins to avoid enum mismatch', async () => {
    expect(PENDING_RATING_DAYS_SQL).toContain('ms.delivery_date = dd.date')
    expect(PENDING_RATING_DAYS_SQL).toContain('ms.meal_type::text = dd.meal_type::text')
    expect(PENDING_RATING_DAYS_SQL).not.toContain('ms.meal_type = dd.meal_type')
    expect(PENDING_RATING_DAYS_SQL).toContain('m.photo_url')
  })

  it('maps delivered unrated days from the query result', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        delivery_day_id: 'dd-uuid-1',
        delivery_date: '2026-09-02',
        meal_id: 'meal-uuid-1',
        meal_name_en: 'Chicken Biriyani meals',
        meal_type: 'executive',
        kcal: 320,
        emoji: '🍗',
        photo_url: 'https://cdn.example.com/meals/chicken.jpg',
      },
    ])
    Object.defineProperty(DeliveryDayModel, 'sequelize', {
      configurable: true,
      value: { query },
    })

    const result = await service.getPendingRatingDays('user-uuid-1', 'sub-uuid-1', 5)

    expect(query).toHaveBeenCalledWith(
      PENDING_RATING_DAYS_SQL,
      expect.objectContaining({
        replacements: { userId: 'user-uuid-1', subscriptionId: 'sub-uuid-1', limit: 5 },
        type: QueryTypes.SELECT,
      })
    )
    expect(result).toEqual([
      {
        deliveryDayId: 'dd-uuid-1',
        deliveryDate: '2026-09-02',
        mealId: 'meal-uuid-1',
        mealName: 'Chicken Biriyani meals',
        mealType: 'executive',
        kcal: 320,
        emoji: '🍗',
        photoUrl: 'https://cdn.example.com/meals/chicken.jpg',
      },
    ])
  })

  it('resolves photoUrl from meal id when photo_url is null', async () => {
    process.env.S3_BUCKET_NAME = 'test-bucket'
    const query = jest.fn().mockResolvedValue([
      {
        delivery_day_id: 'dd-uuid-2',
        delivery_date: '2026-09-22',
        meal_id: 'meal-uuid-2',
        meal_name_en: 'Salmon Fillet with Quinoa',
        meal_type: 'executive',
        kcal: 560,
        emoji: '🐟',
        photo_url: null,
      },
    ])
    Object.defineProperty(DeliveryDayModel, 'sequelize', {
      configurable: true,
      value: { query },
    })

    const result = await service.getPendingRatingDays('user-uuid-1', 'sub-uuid-1', 5)

    expect(result[0].photoUrl).toBe(
      'https://test-bucket.s3.ap-south-1.amazonaws.com/meals/meal-uuid-2/photo.jpeg'
    )
  })
})
