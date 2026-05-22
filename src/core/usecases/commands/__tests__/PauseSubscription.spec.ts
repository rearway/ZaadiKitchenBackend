import { makeUC } from '../PauseSubscription'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'

describe('PauseSubscription', () => {
  const START = '2025-07-01'
  const END = '2025-07-05'

  function makeActiveDeps(subOverrides = {}, days: ReturnType<typeof makeDeliveryDay>[] = []) {
    const sub = makeSubscription({ status: 'active', pauseDaysAllowed: 66, pauseDaysUsed: 0, ...subOverrides })
    return buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDaysBySubscription: jest.fn().mockResolvedValue(days),
      },
      deliveryDayPersistor: {
        ...buildDeps().deliveryDayPersistor,
        updateDeliveryDayStatus: jest.fn().mockResolvedValue(undefined),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      },
    })
  }

  it('pauses an active subscription for the requested date range', async () => {
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)

    const result = await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(result.status).toBe('paused')
    expect(result.paused_from).toBe(START)
    expect(result.paused_until).toBe(END)
    expect(result.pause_ceiling_date).toBe(END)
  })

  it('calculates pause days inclusively (start and end both count)', async () => {
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)

    // Jul 1 to Jul 5 = 5 days (inclusive)
    const result = await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(result.pause_days_used).toBe(5)
    expect(result.pause_days_remaining).toBe(61) // 66 - 5
  })

  it('marks scheduled delivery days in the range as paused', async () => {
    const scheduledDays = [
      makeDeliveryDay({ id: 'dd-1', date: '2025-07-01', status: 'scheduled' }),
      makeDeliveryDay({ id: 'dd-2', date: '2025-07-02', status: 'scheduled' }),
    ]
    const deps = makeActiveDeps({}, scheduledDays)
    const pauseSubscription = makeUC(deps)

    await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).toHaveBeenCalledWith('dd-1', 'paused')
    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).toHaveBeenCalledWith('dd-2', 'paused')
  })

  it('does not change already-delivered or already-skipped days', async () => {
    const mixedDays = [
      makeDeliveryDay({ id: 'dd-scheduled', date: '2025-07-01', status: 'scheduled' }),
      makeDeliveryDay({ id: 'dd-delivered', date: '2025-07-02', status: 'delivered' }),
      makeDeliveryDay({ id: 'dd-skipped', date: '2025-07-03', status: 'skipped' }),
    ]
    const deps = makeActiveDeps({}, mixedDays)
    const pauseSubscription = makeUC(deps)

    await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).toHaveBeenCalledWith('dd-scheduled', 'paused')
    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).not.toHaveBeenCalledWith('dd-delivered', expect.anything())
    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).not.toHaveBeenCalledWith('dd-skipped', expect.anything())
  })

  it('updates the subscription with pause metadata', async () => {
    const sub = makeSubscription({ status: 'active', pauseDaysAllowed: 66, pauseDaysUsed: 10 })
    const deps = makeActiveDeps({ pauseDaysUsed: 10 })
    ;(deps.subscriptionLoader.getActiveSubscriptionByUserId as jest.Mock).mockResolvedValue(sub)
    const pauseSubscription = makeUC(deps)

    await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      expect.objectContaining({
        status: 'paused',
        pausedFrom: START,
        pausedUntil: END,
        pauseCeilingDate: END,
        pauseDaysUsed: 15, // 10 existing + 5 new
      })
    )
  })

  it('throws ResourceNotFoundError when there is no active subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const pauseSubscription = makeUC(deps)

    await expect(pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws ValidationError when the subscription is already paused', async () => {
    const deps = makeActiveDeps({ status: 'paused' })
    const pauseSubscription = makeUC(deps)

    await expect(pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })

  it('throws ValidationError when the subscription is cancelled', async () => {
    const deps = makeActiveDeps({ status: 'cancelled' })
    const pauseSubscription = makeUC(deps)

    await expect(pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })

  it('throws PauseLimitExceededError when requested days exceed remaining pause allowance', async () => {
    const deps = makeActiveDeps({ pauseDaysAllowed: 10, pauseDaysUsed: 8 })
    // Requesting 5 days (Jul 1-5) but only 2 remain
    const pauseSubscription = makeUC(deps)

    await expect(pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })).rejects.toMatchObject({
      errorCode: 'PAUSE_LIMIT_EXCEEDED',
      statusCode: 409,
    })
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('allows pausing when requested days exactly equal remaining allowance', async () => {
    const deps = makeActiveDeps({ pauseDaysAllowed: 5, pauseDaysUsed: 0 })
    const pauseSubscription = makeUC(deps)

    const result = await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })
    expect(result.pause_days_remaining).toBe(0)
  })

  it('handles a single-day pause (start === end)', async () => {
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)

    const result = await pauseSubscription({ userId: 'user-uuid-1', startDate: '2025-07-01', endDate: '2025-07-01' })

    expect(result.pause_days_used).toBe(1)
    expect(result.paused_from).toBe('2025-07-01')
    expect(result.paused_until).toBe('2025-07-01')
  })
})
