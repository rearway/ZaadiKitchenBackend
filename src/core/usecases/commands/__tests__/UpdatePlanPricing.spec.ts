import { makeUC } from '../UpdatePlanPricing'
import { buildDeps, makePlan } from '../../../../__tests__/helpers/mock-deps'

describe('UpdatePlanPricing', () => {
  const weekPlan = makePlan({
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'week',
    name: 'Week Plan',
    priceSar: 125,
    maxPriceSar: null,
    mealCount: 5,
    pricePerMealSar: 25,
  })

  function depsWithPlan(plan = weekPlan) {
    return buildDeps({
      planLoader: {
        ...buildDeps().planLoader,
        getPlanBySlug: jest
          .fn()
          .mockImplementation(async (slug: string) => (slug === plan.slug ? plan : null)),
        getPlanById: jest
          .fn()
          .mockImplementation(async (id: string) => (id === plan.id ? plan : null)),
      },
      planPersistor: {
        ...buildDeps().planPersistor,
        updatePlanPricing: jest
          .fn()
          .mockImplementation(async (_id: string, req: Record<string, unknown>) => ({
            ...plan,
            ...req,
          })),
      },
    })
  }

  it('updates price and max price and recalculates price per meal', async () => {
    const deps = depsWithPlan()
    const updatePlanPricing = makeUC(deps)

    const result = await updatePlanPricing({
      planId: 'week',
      priceSar: 50,
      maxPriceSar: 100,
    })

    expect(deps.planPersistor.updatePlanPricing).toHaveBeenCalledWith(weekPlan.id, {
      priceSar: 50,
      maxPriceSar: 100,
      pricePerMealSar: 10,
    })
    expect(result.data.price_sar).toBe(50)
    expect(result.data.max_price_sar).toBe(100)
    expect(result.data.discount_percent).toBe(50)
  })

  it('updates only max price and keeps the current price', async () => {
    const deps = depsWithPlan()
    const updatePlanPricing = makeUC(deps)

    await updatePlanPricing({ planId: 'week', maxPriceSar: 200 })

    expect(deps.planPersistor.updatePlanPricing).toHaveBeenCalledWith(
      weekPlan.id,
      expect.objectContaining({ priceSar: 125, maxPriceSar: 200 })
    )
  })

  it('removes the discount when max price is null', async () => {
    const deps = depsWithPlan(makePlan({ ...weekPlan, maxPriceSar: 200 }))
    const updatePlanPricing = makeUC(deps)

    const result = await updatePlanPricing({ planId: 'week', maxPriceSar: null })

    expect(deps.planPersistor.updatePlanPricing).toHaveBeenCalledWith(
      weekPlan.id,
      expect.objectContaining({ maxPriceSar: null })
    )
    expect(result.data.discount_percent).toBeNull()
  })

  it('finds the plan by UUID as well as slug', async () => {
    const deps = depsWithPlan()
    const updatePlanPricing = makeUC(deps)

    await updatePlanPricing({ planId: weekPlan.id, priceSar: 100 })

    expect(deps.planPersistor.updatePlanPricing).toHaveBeenCalled()
  })

  it('rejects a max price lower than the price', async () => {
    const deps = depsWithPlan()
    const updatePlanPricing = makeUC(deps)

    await expect(
      updatePlanPricing({ planId: 'week', priceSar: 100, maxPriceSar: 80 })
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR', statusCode: 400 })
    expect(deps.planPersistor.updatePlanPricing).not.toHaveBeenCalled()
  })

  it('rejects a new price above the existing max price', async () => {
    const deps = depsWithPlan(makePlan({ ...weekPlan, maxPriceSar: 150 }))
    const updatePlanPricing = makeUC(deps)

    await expect(
      updatePlanPricing({ planId: 'week', priceSar: 200 })
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR' })
  })

  it('rejects a request with no fields', async () => {
    const deps = depsWithPlan()
    const updatePlanPricing = makeUC(deps)

    await expect(updatePlanPricing({ planId: 'week' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
    })
  })

  it('returns 404 for an unknown plan', async () => {
    const deps = depsWithPlan()
    const updatePlanPricing = makeUC(deps)

    await expect(
      updatePlanPricing({ planId: 'yearly', priceSar: 100 })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
