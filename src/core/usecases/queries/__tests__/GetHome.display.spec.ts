import { makeUC } from '../GetHome'
import { buildDeps, makeSubscription, makeUser } from '../../../../__tests__/helpers/mock-deps'

describe('GetHome meal display name', () => {
  it('labels an executive subscription as the Platio Balanced plan', async () => {
    const base = buildDeps()
    const deps = buildDeps({
      userLoader: {
        ...base.userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser()),
      },
      subscriptionLoader: {
        ...base.subscriptionLoader,
        getActiveSubscriptionByUserId: jest
          .fn()
          .mockResolvedValue(makeSubscription({ mealType: 'executive' })),
      },
    })

    const result = await makeUC(deps)({ userId: 'user-uuid-1' })
    expect(result.banner.plan_label).toBe('Platio Balanced Plan')
    expect(result.subscription).toMatchObject({ meal_type: 'executive' })
  })
})
