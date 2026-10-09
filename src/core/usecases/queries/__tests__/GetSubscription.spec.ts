import { makeUC } from '../GetSubscription'
import { buildDeps, makeSubscription, makePlan } from '../../../../__tests__/helpers/mock-deps'

describe('GetSubscription', () => {
  const validInput = { userId: 'user-uuid-1' }

  function makeDepsWithSub(subOverrides = {}, planOverrides = {}) {
    const sub = makeSubscription(subOverrides)
    const plan = makePlan(planOverrides)
    return buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(plan),
      },
    })
  }

  it('returns full subscription details for an active subscription', async () => {
    const deps = makeDepsWithSub(
      { status: 'active', totalMealDays: 22, deliveredCount: 10, skippedCount: 2, skipDaysUsed: 2, pauseDaysUsed: 0 },
      { name: 'Month Plan', slug: 'month' }
    )
    const getSubscription = makeUC(deps)

    const result = await getSubscription(validInput)

    expect(result.status).toBe('active')
    expect(result.plan_name).toBe('Month Plan')
    expect(result.plan_id).toBe('month')
    expect(result.total_meal_days).toBe(22)
    expect(result.delivered_count).toBe(10)
    expect(result.skipped_count).toBe(2)
  })

  it('computes remaining_count as total - delivered - skipped', async () => {
    const deps = makeDepsWithSub({ totalMealDays: 22, deliveredCount: 5, skippedCount: 3 })
    const getSubscription = makeUC(deps)

    const result = await getSubscription(validInput)

    expect(result.remaining_count).toBe(14) // 22 - 5 - 3
  })

  it('computes skip_days_remaining as allowed - used', async () => {
    const deps = makeDepsWithSub({ skipDaysAllowed: 66, skipDaysUsed: 10 })
    const getSubscription = makeUC(deps)

    const result = await getSubscription(validInput)

    expect(result.skip_days_remaining).toBe(56) // 66 - 10
  })

  it('sets days_remaining to remaining meal days, not calendar span to end_date', async () => {
    const deps = makeDepsWithSub({
      totalMealDays: 1,
      deliveredCount: 0,
      skippedCount: 0,
      startDate: '2026-10-12',
      endDate: '2026-10-12',
    })
    const getSubscription = makeUC(deps)

    const result = await getSubscription(validInput)

    expect(result.remaining_count).toBe(1)
    expect(result.days_remaining).toBe(1)
  })

  it('floors days_remaining at 0 when all meals are used', async () => {
    const deps = makeDepsWithSub({
      totalMealDays: 1,
      deliveredCount: 1,
      skippedCount: 0,
      endDate: '2020-01-01',
    })
    const getSubscription = makeUC(deps)

    const result = await getSubscription(validInput)

    expect(result.days_remaining).toBe(0)
    expect(result.remaining_count).toBe(0)
  })

  it('returns paused_until from the subscription when paused', async () => {
    const deps = makeDepsWithSub({ status: 'paused', pausedUntil: '2025-07-15' })
    const getSubscription = makeUC(deps)

    const result = await getSubscription(validInput)

    expect(result.paused_until).toBe('2025-07-15')
  })

  it('returns paused_until=null when the subscription is active', async () => {
    const deps = makeDepsWithSub({ status: 'active', pausedUntil: null })
    const getSubscription = makeUC(deps)

    const result = await getSubscription(validInput)

    expect(result.paused_until).toBeNull()
  })

  it('falls back to subscription.planId if plan record is not found', async () => {
    const sub = makeSubscription({ planId: 'plan-uuid-month' })
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      planLoader: {
        ...buildDeps().planLoader,
        getPlanById: jest.fn().mockResolvedValue(null),
      },
    })
    const getSubscription = makeUC(deps)

    const result = await getSubscription(validInput)

    expect(result.plan_id).toBe('plan-uuid-month')
    expect(result.plan_name).toBe('')
  })

  it('throws ResourceNotFoundError when there is no active subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const getSubscription = makeUC(deps)

    await expect(getSubscription(validInput)).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })
})
