import { makeUC } from '../GetPendingRatings'
import { buildDeps, makeSubscription } from '../../../../__tests__/helpers/mock-deps'

describe('GetPendingRatings', () => {
  it('returns an empty list when there is no active subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const getPendingRatings = makeUC(deps)

    const result = await getPendingRatings({ userId: 'user-uuid-1' })

    expect(result).toEqual({ data: [] })
    expect(deps.mealRatingLoader.getPendingRatingDays).not.toHaveBeenCalled()
  })

  it('returns pending rating days for an active subscription', async () => {
    const sub = makeSubscription()
    const pendingDays = [
      {
        deliveryDayId: 'dd-uuid-1',
        deliveryDate: '2026-09-02',
        mealId: 'meal-uuid-1',
        mealName: 'Chicken Biriyani meals',
        mealType: 'executive',
        kcal: 320,
        emoji: '🍗',
      },
    ]
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      mealRatingLoader: {
        ...buildDeps().mealRatingLoader,
        getPendingRatingDays: jest.fn().mockResolvedValue(pendingDays),
      },
    })
    const getPendingRatings = makeUC(deps)

    const result = await getPendingRatings({ userId: 'user-uuid-1' })

    expect(deps.mealRatingLoader.getPendingRatingDays).toHaveBeenCalledWith(
      'user-uuid-1',
      sub.id,
      5
    )
    expect(result).toEqual({ data: pendingDays })
  })
})
