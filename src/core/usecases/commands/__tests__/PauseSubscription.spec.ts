import { makeUC } from '../PauseSubscription'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'
import { todayKSA } from '../../services/revenueUtils.js'

describe('PauseSubscription', () => {
  const today = todayKSA()
  const planStart = '2099-08-10'
  const planEnd = '2099-12-31'
  const START = '2099-08-12'
  const END = '2099-08-16'

  function futureOnOrAfterPlanStart(offsetDaysFromPlanStart: number): string {
    const d = new Date(planStart + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + offsetDaysFromPlanStart)
    return d.toISOString().slice(0, 10)
  }

  /** Working days in START–END (Sun–Thu only): Wed 12, Thu 13, Sun 16. */
  const WORKING_DAYS_IN_RANGE = 3

  function makeActiveDeps(subOverrides = {}, days: ReturnType<typeof makeDeliveryDay>[] = []) {
    const sub = makeSubscription({
      status: 'active',
      skipDaysAllowed: 66,
      pauseDaysAllowed: 66,
      skipDaysUsed: 0,
      pauseDaysUsed: 0,
      startDate: planStart,
      endDate: planEnd,
      ...subOverrides,
    })
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
        updateSubscription: jest.fn().mockImplementation((_id, updates) =>
          Promise.resolve({ ...sub, ...updates })
        ),
      },
    })
  }

  it('schedules a pause while subscription stays active until start cutoff', async () => {
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)

    const result = await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(result.status).toBe('active')
    expect(result.pause_scheduled).toBe(true)
    expect(result.paused_from).toBe(START)
    expect(result.paused_until).toBe(END)
    expect(result.pause_ceiling_date).toBe(END)
  })

  it('charges flex pool by working days in range (not calendar days)', async () => {
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)

    const result = await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(result.pause_days_used).toBe(WORKING_DAYS_IN_RANGE)
    expect(result.pause_days_remaining).toBe(66 - WORKING_DAYS_IN_RANGE)
    expect(result.skip_days_used).toBe(WORKING_DAYS_IN_RANGE)
  })

  it('marks scheduled delivery days in the range as paused', async () => {
    const scheduledDays = [
      makeDeliveryDay({ id: 'dd-1', date: '2099-08-12', status: 'scheduled' }),
      makeDeliveryDay({ id: 'dd-2', date: '2099-08-13', status: 'scheduled' }),
    ]
    const deps = makeActiveDeps({}, scheduledDays)
    const pauseSubscription = makeUC(deps)

    await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).toHaveBeenCalledWith('dd-1', 'paused')
    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).toHaveBeenCalledWith('dd-2', 'paused')
  })

  it('does not change already-delivered or already-skipped days', async () => {
    const mixedDays = [
      makeDeliveryDay({ id: 'dd-scheduled', date: '2099-08-12', status: 'scheduled' }),
      makeDeliveryDay({ id: 'dd-delivered', date: '2099-08-13', status: 'delivered' }),
      makeDeliveryDay({ id: 'dd-skipped', date: '2099-08-14', status: 'skipped' }),
    ]
    const deps = makeActiveDeps({}, mixedDays)
    const pauseSubscription = makeUC(deps)

    await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).toHaveBeenCalledWith('dd-scheduled', 'paused')
    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).not.toHaveBeenCalledWith('dd-delivered', expect.anything())
    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).not.toHaveBeenCalledWith('dd-skipped', expect.anything())
  })

  it('updates the subscription with pause metadata', async () => {
    const sub = makeSubscription({
      status: 'active',
      pauseDaysAllowed: 66,
      pauseDaysUsed: 10,
      startDate: planStart,
      endDate: planEnd,
    })
    const deps = makeActiveDeps({ pauseDaysUsed: 10 })
    ;(deps.subscriptionLoader.getActiveSubscriptionByUserId as jest.Mock).mockResolvedValue(sub)
    const pauseSubscription = makeUC(deps)

    await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })

    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      expect.objectContaining({
        status: 'active',
        pausedFrom: START,
        pausedUntil: END,
        pauseCeilingDate: END,
        pauseDaysUsed: 10 + WORKING_DAYS_IN_RANGE,
        skipDaysUsed: 10 + WORKING_DAYS_IN_RANGE,
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

  it('allows scheduling pause while cancelled but still in service period', async () => {
    const deps = makeActiveDeps({
      status: 'cancelled',
      endDate: '2099-12-31',
    })
    const pauseSubscription = makeUC(deps)

    const result = await pauseSubscription({
      userId: 'user-uuid-1',
      startDate: START,
      endDate: END,
    })

    expect(result.pause_scheduled).toBe(true)
    expect(result.status).toBe('cancelled')
  })

  it('throws ValidationError when cancelled and past end date', async () => {
    const deps = makeActiveDeps({
      status: 'cancelled',
      endDate: '2020-01-01',
    })
    const pauseSubscription = makeUC(deps)

    await expect(
      pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })
    ).rejects.toMatchObject({
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

  it('allows pausing when requested working days exactly equal remaining allowance', async () => {
    const deps = makeActiveDeps({
      skipDaysAllowed: WORKING_DAYS_IN_RANGE,
      pauseDaysAllowed: WORKING_DAYS_IN_RANGE,
      pauseDaysUsed: 0,
      skipDaysUsed: 0,
    })
    const pauseSubscription = makeUC(deps)

    const result = await pauseSubscription({ userId: 'user-uuid-1', startDate: START, endDate: END })
    expect(result.pause_days_remaining).toBe(0)
  })

  it('handles a single-day pause (start === end)', async () => {
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)
    const day = futureOnOrAfterPlanStart(2)

    const result = await pauseSubscription({
      userId: 'user-uuid-1',
      startDate: day,
      endDate: day,
    })

    expect(result.pause_days_used).toBe(1)
    expect(result.paused_from).toBe(day)
    expect(result.paused_until).toBe(day)
  })

  it('rejects pause start before plan start date', async () => {
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)
    const beforePlan = '2099-08-05'

    await expect(
      pauseSubscription({
        userId: 'user-uuid-1',
        startDate: beforePlan,
        endDate: futureOnOrAfterPlanStart(5),
      })
    ).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
      message: 'Pause cannot start before your plan start date.',
    })
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('rejects pause start in the past', async () => {
    const deps = makeActiveDeps({
      startDate: '2020-01-01',
      endDate: '2099-12-31',
    })
    const pauseSubscription = makeUC(deps)

    await expect(
      pauseSubscription({
        userId: 'user-uuid-1',
        startDate: '2020-06-01',
        endDate: '2020-06-05',
      })
    ).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'Pause start date must be today or later.',
    })
  })

  it('rejects end date before start date', async () => {
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)

    await expect(
      pauseSubscription({
        userId: 'user-uuid-1',
        startDate: END,
        endDate: START,
      })
    ).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'Pause end date must be on or after the start date.',
    })
  })

  it('rejects pause end after plan end date', async () => {
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)

    await expect(
      pauseSubscription({
        userId: 'user-uuid-1',
        startDate: START,
        endDate: '2100-01-15',
      })
    ).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'Pause end date cannot be after your plan end date.',
    })
  })

  it('allows pause starting on plan start date when that date is today or later', async () => {
    if (compareFuture(planStart, today) < 0) {
      return
    }
    const deps = makeActiveDeps()
    const pauseSubscription = makeUC(deps)

    const result = await pauseSubscription({
      userId: 'user-uuid-1',
      startDate: planStart,
      endDate: futureOnOrAfterPlanStart(2),
    })

    expect(result.status).toBe('active')
    expect(result.pause_scheduled).toBe(true)
    expect(result.paused_from).toBe(planStart)
  })
})

function compareFuture(a: string, b: string): number {
  return a.localeCompare(b)
}
