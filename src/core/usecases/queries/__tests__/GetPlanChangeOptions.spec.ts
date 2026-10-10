import { makeUC } from '../GetPlanChangeOptions'
import { buildDeps, makeSubscription, makePlan } from '../../../../__tests__/helpers/mock-deps'

describe('GetPlanChangeOptions', () => {
  it('returns empty allowed plans when user has no subscription', async () => {
    const deps = buildDeps()
    const getPlanChangeOptions = makeUC(deps)

    const result = await getPlanChangeOptions({ userId: 'user-1' })

    expect(result.allowed_plan_ids).toEqual([])
    expect(result.promotion_available).toBe(false)
  })

  it('returns upgrade targets for active try_it subscription', async () => {
    const sub = makeSubscription({ status: 'active', planId: 'plan-try' })
    const plan = makePlan({ id: 'plan-try', slug: 'try_it' })
    const deps = buildDeps({
      subscriptionLoader: {
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
        getSubscriptionById: jest.fn(),
      },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
      },
    })
    const getPlanChangeOptions = makeUC(deps)

    const result = await getPlanChangeOptions({ userId: 'user-1' })

    expect(result.current_plan_id).toBe('try_it')
    expect(result.allowed_plan_ids).toEqual(['week', 'month', 'quarterly'])
    expect(result.promotion_available).toBe(true)
  })

  it('blocks promotion when subscription is paused', async () => {
    const sub = makeSubscription({ status: 'paused', planId: 'plan-week' })
    const plan = makePlan({ id: 'plan-week', slug: 'week' })
    const deps = buildDeps({
      subscriptionLoader: {
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
        getSubscriptionById: jest.fn(),
      },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
      },
    })
    const getPlanChangeOptions = makeUC(deps)

    const result = await getPlanChangeOptions({ userId: 'user-1' })

    expect(result.allowed_plan_ids).toEqual([])
    expect(result.promotion_available).toBe(false)
    expect(result.blocked_reason).toContain('active')
  })
})
