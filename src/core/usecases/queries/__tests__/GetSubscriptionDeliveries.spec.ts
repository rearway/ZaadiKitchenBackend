import { makeUC } from '../GetSubscriptionDeliveries'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'

// Helpers for date manipulation
const FUTURE_DATE = '2099-12-30' // cutoff 2099-12-29T15:00Z — safely in the future
const PAST_DATE = '2020-01-06'   // cutoff long in the past

describe('GetSubscriptionDeliveries', () => {
  function makeSubWithDays(subOverrides = {}, days: ReturnType<typeof makeDeliveryDay>[] = []) {
    const sub = makeSubscription(subOverrides)
    return buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDaysBySubscription: jest.fn().mockResolvedValue(days),
      },
    })
  }

  it('returns an empty deliveries list when there are no delivery days', async () => {
    const deps = makeSubWithDays({}, [])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.deliveries).toHaveLength(0)
    expect(result.skip_limit_reached).toBe(false)
  })

  it('marks a scheduled future day as skippable', async () => {
    const day = makeDeliveryDay({ date: FUTURE_DATE, status: 'scheduled' })
    const deps = makeSubWithDays({ skipDaysUsed: 0, skipDaysAllowed: 66 }, [day])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.deliveries[0].skippable).toBe(true)
    expect(result.deliveries[0].skip_reason).toBeUndefined()
  })

  it('marks a scheduled past-cutoff day as not skippable with reason past_cutoff', async () => {
    const day = makeDeliveryDay({ date: PAST_DATE, status: 'scheduled' })
    const deps = makeSubWithDays({ skipDaysUsed: 0, skipDaysAllowed: 66 }, [day])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.deliveries[0].skippable).toBe(false)
    expect(result.deliveries[0].skip_reason).toBe('past_cutoff')
  })

  it('marks a scheduled day as not skippable when skip limit is reached', async () => {
    const day = makeDeliveryDay({ date: FUTURE_DATE, status: 'scheduled' })
    const deps = makeSubWithDays({ skipDaysUsed: 66, skipDaysAllowed: 66 }, [day])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.deliveries[0].skippable).toBe(false)
    expect(result.deliveries[0].skip_reason).toBe('skip_limit_reached')
    expect(result.skip_limit_reached).toBe(true)
  })

  it('marks a skipped future day as not skippable with reason already_skipped and undoable=true', async () => {
    const day = makeDeliveryDay({ date: FUTURE_DATE, status: 'skipped' })
    const deps = makeSubWithDays({}, [day])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.deliveries[0].skippable).toBe(false)
    expect(result.deliveries[0].skip_reason).toBe('already_skipped')
    expect(result.deliveries[0].undoable).toBe(true)
  })

  it('marks a skipped past-cutoff day as undoable=false', async () => {
    const day = makeDeliveryDay({ date: PAST_DATE, status: 'skipped' })
    const deps = makeSubWithDays({}, [day])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.deliveries[0].undoable).toBe(false)
  })

  it('does not include undoable field for scheduled/delivered/paused days', async () => {
    const days = [
      makeDeliveryDay({ date: FUTURE_DATE, status: 'scheduled', id: 'dd-1' }),
      makeDeliveryDay({ date: FUTURE_DATE, status: 'delivered', id: 'dd-2' }),
      makeDeliveryDay({ date: FUTURE_DATE, status: 'paused', id: 'dd-3' }),
    ]
    const deps = makeSubWithDays({}, days)
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    result.deliveries.forEach(d => {
      expect(d.undoable).toBeUndefined()
    })
  })

  it('returns skip_limit_reached=false when some skip days remain', async () => {
    const deps = makeSubWithDays({ skipDaysUsed: 3, skipDaysAllowed: 66 }, [])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.skip_limit_reached).toBe(false)
  })

  it('returns skip_limit_reached=true when all skip days are used', async () => {
    const deps = makeSubWithDays({ skipDaysUsed: 66, skipDaysAllowed: 66 }, [])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.skip_limit_reached).toBe(true)
  })

  it('includes the meal_name in each delivery item', async () => {
    const day = makeDeliveryDay({ date: FUTURE_DATE, mealName: 'Lamb Kabsa' })
    const deps = makeSubWithDays({}, [day])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.deliveries[0].meal_name).toBe('Lamb Kabsa')
  })

  it('returns null meal_name when no meal is assigned', async () => {
    const day = makeDeliveryDay({ date: FUTURE_DATE, mealName: null })
    const deps = makeSubWithDays({}, [day])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.deliveries[0].meal_name).toBeNull()
  })

  it('passes from and to filters to the delivery day loader', async () => {
    const deps = makeSubWithDays({}, [])
    const getDeliveries = makeUC(deps)

    await getDeliveries({ userId: 'user-uuid-1', from: '2025-06-01', to: '2025-06-30' })

    expect(deps.deliveryDayLoader.getDeliveryDaysBySubscription).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ from: '2025-06-01', to: '2025-06-30' })
    )
  })

  it('throws ResourceNotFoundError when there is no active subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const getDeliveries = makeUC(deps)

    await expect(getDeliveries({ userId: 'user-uuid-1' })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('includes · Today in the label for today\'s delivery', async () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const day = makeDeliveryDay({ date: todayStr, status: 'scheduled' })
    const deps = makeSubWithDays({}, [day])
    const getDeliveries = makeUC(deps)

    const result = await getDeliveries({ userId: 'user-uuid-1' })

    expect(result.deliveries[0].label).toContain('Today')
  })
})
