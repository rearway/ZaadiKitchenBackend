import { makeUC } from '../GetHome'
import {
  buildDeps,
  makeSubscription,
} from '../../../../__tests__/helpers/mock-deps'

describe('GetHome subscription status', () => {
  it('keeps an in-service cancelled plan cancelled', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest
          .fn()
          .mockResolvedValue(
            makeSubscription({ status: 'cancelled', endDate: '2099-12-31' })
          ),
      },
    })

    const result = await makeUC(deps)({ userId: 'user-1' })

    expect(result.subscription_status).toBe('cancelled')
  })

  it('reports expired when the current plan end date has passed', async () => {
    const getLatest = jest.fn()
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest
          .fn()
          .mockResolvedValue(
            makeSubscription({ status: 'active', endDate: '2020-01-01' })
          ),
        getLatestSubscriptionByUserId: getLatest,
      },
    })

    const result = await makeUC(deps)({ userId: 'user-1' })

    expect(getLatest).not.toHaveBeenCalled()
    expect(result.subscription_status).toBe('expired')
  })

  it('reports expired from the latest row when no in-service status exists', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
        getLatestSubscriptionByUserId: jest
          .fn()
          .mockResolvedValue(
            makeSubscription({ status: 'expired', endDate: '2020-01-01' })
          ),
      },
    })

    const result = await makeUC(deps)({ userId: 'user-1' })

    expect(result.subscription_status).toBe('expired')
  })
})
