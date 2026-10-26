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

  it('returns upgrade targets for cancelled subscription still in service period', async () => {
    const sub = makeSubscription({
      status: 'cancelled',
      planId: 'plan-week',
      endDate: '2099-12-31',
    })
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

    expect(result.subscription_status).toBe('cancelled')
    expect(result.allowed_plan_ids).toEqual(['week', 'month', 'quarterly'])
    expect(result.promotion_available).toBe(true)
    expect(result.reactivation_available).toBe(true)
    expect(result.renewal_available).toBe(false)
    expect(result.blocked_reason).toBeNull()
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
    expect(result.blocked_reason).toContain('paused')
  })

  it('offers every active plan after the subscription has ended', async () => {
    const sub = makeSubscription({
      status: 'cancelled',
      planId: 'plan-week',
      endDate: '2020-01-01',
    })
    const plan = makePlan({ id: 'plan-week', slug: 'week' })
    const deps = buildDeps({
      subscriptionLoader: {
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
        getSubscriptionById: jest.fn(),
      },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
        getActivePlans: jest.fn().mockResolvedValue([
          makePlan({ slug: 'try_it' }),
          makePlan({ slug: 'week' }),
          makePlan({ slug: 'month' }),
          makePlan({ slug: 'quarterly' }),
        ]),
      },
    })

    const result = await makeUC(deps)({ userId: 'user-1' })

    expect(result.subscription_status).toBe('expired')
    expect(result.allowed_plan_ids).toEqual([
      'try_it',
      'week',
      'month',
      'quarterly',
    ])
    expect(result.blocked_reason).toBeNull()
    expect(result.renewal_available).toBe(true)
    expect(result.reactivation_available).toBe(false)
    expect(result.promotion_available).toBe(false)
  })

  it('uses the latest expired row only when no active, paused, or cancelled row exists', async () => {
    const sub = makeSubscription({ status: 'expired', planId: 'plan-month' })
    const plan = makePlan({ id: 'plan-month', slug: 'month' })
    const getLatest = jest.fn().mockResolvedValue(sub)
    const deps = buildDeps({
      subscriptionLoader: {
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
        getLatestSubscriptionByUserId: getLatest,
        getSubscriptionById: jest.fn(),
      },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
        getActivePlans: jest.fn().mockResolvedValue([makePlan({ slug: 'month' })]),
      },
    })

    const result = await makeUC(deps)({ userId: 'user-1' })

    expect(getLatest).toHaveBeenCalledWith('user-1')
    expect(result.subscription_status).toBe('expired')
    expect(result.current_plan_id).toBe('month')
    expect(result.allowed_plan_ids).toEqual(['month'])
    expect(result.renewal_available).toBe(true)
  })
})
