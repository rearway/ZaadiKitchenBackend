import { makeUC } from '../GetActivePlans'
import {
  buildDeps,
  makePlan,
  makeOrder,
} from '../../../../__tests__/helpers/mock-deps'

describe('GetActivePlans', () => {
  const validInput = { userId: 'user-uuid-1' }

  it('returns all active plans with standard fields', async () => {
    const plans = [
      makePlan({ id: 'plan-1', name: 'Try It', slug: 'try_it', priceSar: 28, mealCount: 1, isMostPopular: false }),
      makePlan({ id: 'plan-2', name: 'Month Plan', slug: 'month', priceSar: 500, mealCount: 22, isMostPopular: true }),
    ]
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getActivePlans: jest.fn().mockResolvedValue(plans),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockResolvedValue(0),
      },
    })
    const getActivePlans = makeUC(deps)

    const result = await getActivePlans(validInput)

    expect(result.plans).toHaveLength(2)
    expect(result.plans[0].id).toBe('try_it')
    expect(result.plans[0].name).toBe('Try It')
    expect(result.plans[0].price_sar).toBe(28)
    expect(result.plans[1].is_most_popular).toBe(true)
  })

  it('returns the wallet balance', async () => {
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getActivePlans: jest.fn().mockResolvedValue([makePlan()]),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockResolvedValue(75),
      },
    })
    const getActivePlans = makeUC(deps)

    const result = await getActivePlans(validInput)

    expect(result.wallet_balance_sar).toBe(75)
  })

  it('marks is_last_plan=true for the plan used in the most recent order', async () => {
    const monthPlan = makePlan({ id: 'plan-month', slug: 'month' })
    const tryItPlan = makePlan({ id: 'plan-tryit', slug: 'try_it', isMostPopular: false })
    const lastOrder = makeOrder({ planId: 'plan-month' })

    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getActivePlans: jest.fn().mockResolvedValue([monthPlan, tryItPlan]),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(lastOrder),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockResolvedValue(0),
      },
    })
    const getActivePlans = makeUC(deps)

    const result = await getActivePlans(validInput)

    const monthResult = result.plans.find(p => p.id === 'month')
    const tryItResult = result.plans.find(p => p.id === 'try_it')
    expect(monthResult?.is_last_plan).toBe(true)
    expect(tryItResult?.is_last_plan).toBe(false)
  })

  it('marks all plans as is_last_plan=false for a new user with no orders', async () => {
    const plans = [makePlan(), makePlan({ id: 'plan-2', slug: 'week', isMostPopular: false })]
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getActivePlans: jest.fn().mockResolvedValue(plans),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockResolvedValue(0),
      },
    })
    const getActivePlans = makeUC(deps)

    const result = await getActivePlans(validInput)

    result.plans.forEach(p => expect(p.is_last_plan).toBe(false))
  })

  it('returns an empty list when no plans are active', async () => {
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getActivePlans: jest.fn().mockResolvedValue([]),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockResolvedValue(0),
      },
    })
    const getActivePlans = makeUC(deps)

    const result = await getActivePlans(validInput)

    expect(result.plans).toHaveLength(0)
    expect(result.wallet_balance_sar).toBe(0)
  })

  it('uses the plan slug as the plan id in the response', async () => {
    const plan = makePlan({ id: 'internal-uuid', slug: 'quarterly' })
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getActivePlans: jest.fn().mockResolvedValue([plan]),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockResolvedValue(0),
      },
    })
    const getActivePlans = makeUC(deps)

    const result = await getActivePlans(validInput)

    // id in response should be slug, not the DB uuid
    expect(result.plans[0].id).toBe('quarterly')
  })

  it('fetches plans, last order, and wallet balance in parallel', async () => {
    const callOrder: string[] = []
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getActivePlans: jest.fn().mockImplementation(async () => {
          callOrder.push('plans')
          return [makePlan()]
        }),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getLastOrderByUserId: jest.fn().mockImplementation(async () => {
          callOrder.push('orders')
          return null
        }),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockImplementation(async () => {
          callOrder.push('wallet')
          return 0
        }),
      },
    })
    const getActivePlans = makeUC(deps)

    await getActivePlans(validInput)

    // All three should be called (order doesn't matter since they run in parallel)
    expect(callOrder).toContain('plans')
    expect(callOrder).toContain('orders')
    expect(callOrder).toContain('wallet')
    expect(callOrder).toHaveLength(3)
  })
})
