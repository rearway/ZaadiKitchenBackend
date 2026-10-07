import { makeUC } from '../CreateCheckoutSession'
import {
  buildDeps,
  makePlan,
  makeCheckoutSession,
  makeSubscription,
  makeOrder,
} from '../../../../__tests__/helpers/mock-deps'
import { SamePlanNotAllowedError } from '../../../../shared/errors/domain.errors.js'

describe('CreateCheckoutSession promotion', () => {
  const userId = 'user-uuid-1'

  it('prices upgrade as new plan minus prior total paid', async () => {
    const tryIt = makePlan({ id: 'plan-try', slug: 'try_it', priceSar: 28 })
    const week = makePlan({ id: 'plan-week', slug: 'week', priceSar: 125 })
    const sub = makeSubscription({
      status: 'active',
      planId: 'plan-try',
      orderId: 'order-1',
    })
    const order = makeOrder({ id: 'order-1', totalPaidSar: 28 })
    const session = makeCheckoutSession({ totalDueSar: 97, priorPlanCreditSar: 28 })

    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(week),
        getPlanById: jest.fn().mockResolvedValue(tryIt),
      },
      subscriptionLoader: {
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
        getSubscriptionById: jest.fn(),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getOrderById: jest.fn().mockResolvedValue(order),
      },
      checkoutSessionPersistor: {
        ...buildDeps().checkoutSessionPersistor,
        createSession: jest.fn().mockResolvedValue(session),
      },
    })

    const result = await makeUC(deps)({
      userId,
      planId: 'week',
      mealType: 'executive',
    })

    expect(result.promotion).toBe(true)
    expect(result.current_plan_id).toBe('try_it')
    expect(result.prior_plan_credit_sar).toBe(28)
    expect(result.total_due_sar).toBe(97)
    expect(deps.checkoutSessionPersistor.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        promotionSubscriptionId: sub.id,
        priorPlanCreditSar: 28,
        totalDueSar: 97,
      })
    )
  })

  it('rejects same plan while active', async () => {
    const month = makePlan({ id: 'plan-month', slug: 'month', priceSar: 500 })
    const sub = makeSubscription({ status: 'active', planId: 'plan-month' })
    const deps = buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest.fn().mockResolvedValue(month),
        getPlanById: jest.fn().mockResolvedValue(month),
      },
      subscriptionLoader: {
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
        getSubscriptionById: jest.fn(),
      },
      orderLoader: {
        ...buildDeps().orderLoader,
        getOrderById: jest.fn().mockResolvedValue(makeOrder()),
      },
    })

    await expect(
      makeUC(deps)({ userId, planId: 'month', mealType: 'executive' })
    ).rejects.toBeInstanceOf(SamePlanNotAllowedError)
  })
})
