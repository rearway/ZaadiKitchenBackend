import { makeUC } from '../UndoSkipDelivery'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'

const FUTURE_DATE = '2099-12-30'
const PAST_DATE = '2020-01-06'

describe('UndoSkipDelivery', () => {
  function makeDepsWithSkippedDay(subOverrides = {}, dayOverrides = {}) {
    const sub = makeSubscription({
      skipDaysUsed: 5,
      skippedCount: 5,
      totalMealDays: 2,
      endDate: '2026-10-13',
      ...subOverrides,
    })
    const day = makeDeliveryDay({ date: FUTURE_DATE, status: 'skipped', ...dayOverrides })
    return buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(day),
        getDeliveryDaysBySubscription: jest.fn().mockResolvedValue([day]),
      },
      deliveryDayPersistor: {
        ...buildDeps().deliveryDayPersistor,
        updateDeliveryDayStatus: jest.fn().mockResolvedValue(undefined),
        deleteScheduledDeliveryDaysOutsideDates: jest.fn().mockResolvedValue(undefined),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      },
      auditLogLoader: {
        ...buildDeps().auditLogLoader,
        getAuditLogsBySubscription: jest.fn().mockResolvedValue([]),
      },
    })
  }

  it('restores a skipped day to scheduled and decrements skip counts', async () => {
    const deps = makeDepsWithSkippedDay({ skipDaysUsed: 3, skipDaysAllowed: 66 })
    const undoSkip = makeUC(deps)

    const result = await undoSkip({ userId: 'user-uuid-1', deliveryDate: FUTURE_DATE })

    expect(result.date).toBe(FUTURE_DATE)
    expect(result.status).toBe('scheduled')
    expect(result.skip_days_used).toBe(2)
    expect(result.skip_days_remaining).toBe(64) // 66 - 2
  })

  it('updates the delivery day status to scheduled', async () => {
    const day = makeDeliveryDay({ id: 'dd-abc', date: FUTURE_DATE, status: 'skipped' })
    const sub = makeSubscription()
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(day),
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
    const undoSkip = makeUC(deps)

    await undoSkip({ userId: 'user-uuid-1', deliveryDate: FUTURE_DATE })

    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).toHaveBeenCalledWith('dd-abc', 'scheduled')
  })

  it('decrements both skipDaysUsed and skippedCount on the subscription', async () => {
    const sub = makeSubscription({ skipDaysUsed: 5, skippedCount: 5 })
    const deps = makeDepsWithSkippedDay({ skipDaysUsed: 5, skippedCount: 5 })
    ;(deps.subscriptionLoader.getActiveSubscriptionByUserId as jest.Mock).mockResolvedValue(sub)
    const undoSkip = makeUC(deps)

    await undoSkip({ userId: 'user-uuid-1', deliveryDate: FUTURE_DATE })

    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      expect.objectContaining({ skipDaysUsed: 4, skippedCount: 4 })
    )
  })

  it('never reduces skip counts below zero', async () => {
    const sub = makeSubscription({ skipDaysUsed: 0, skippedCount: 0 })
    const deps = makeDepsWithSkippedDay()
    ;(deps.subscriptionLoader.getActiveSubscriptionByUserId as jest.Mock).mockResolvedValue(sub)
    const undoSkip = makeUC(deps)

    await undoSkip({ userId: 'user-uuid-1', deliveryDate: FUTURE_DATE })

    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      expect.objectContaining({ skipDaysUsed: 0, skippedCount: 0 })
    )
  })

  it('throws ResourceNotFoundError when there is no active subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const undoSkip = makeUC(deps)

    await expect(undoSkip({ userId: 'user-uuid-1', deliveryDate: FUTURE_DATE })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws PastCutoffError when the 6 PM cutoff has passed', async () => {
    const deps = makeDepsWithSkippedDay()
    const undoSkip = makeUC(deps)

    await expect(undoSkip({ userId: 'user-uuid-1', deliveryDate: PAST_DATE })).rejects.toMatchObject({
      errorCode: 'PAST_CUTOFF',
      statusCode: 422,
    })
    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).not.toHaveBeenCalled()
  })

  it('throws ResourceNotFoundError when the delivery day is not found', async () => {
    const sub = makeSubscription()
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(null),
      },
    })
    const undoSkip = makeUC(deps)

    await expect(undoSkip({ userId: 'user-uuid-1', deliveryDate: FUTURE_DATE })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws ResourceNotFoundError when the day exists but is not in skipped status', async () => {
    const scheduledDay = makeDeliveryDay({ date: FUTURE_DATE, status: 'scheduled' })
    const sub = makeSubscription()
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(scheduledDay),
      },
    })
    const undoSkip = makeUC(deps)

    await expect(undoSkip({ userId: 'user-uuid-1', deliveryDate: FUTURE_DATE })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('removes the makeup day created by the original skip', async () => {
    const skipped = makeDeliveryDay({
      id: 'dd-skipped',
      date: '2026-10-12',
      status: 'skipped',
    })
    const makeup = makeDeliveryDay({
      id: 'dd-makeup',
      date: '2026-10-13',
      status: 'scheduled',
    })
    const sub = makeSubscription({
      skipDaysUsed: 1,
      skippedCount: 1,
      totalMealDays: 2,
      endDate: '2026-10-13',
    })
    const deps = makeDepsWithSkippedDay()
    ;(deps.subscriptionLoader.getActiveSubscriptionByUserId as jest.Mock).mockResolvedValue(sub)
    ;(deps.deliveryDayLoader.getDeliveryDayByDate as jest.Mock).mockResolvedValue(skipped)
    ;(deps.deliveryDayLoader.getDeliveryDaysBySubscription as jest.Mock).mockResolvedValue([
      skipped,
      makeup,
    ])
    ;(deps.auditLogLoader.getAuditLogsBySubscription as jest.Mock).mockResolvedValue([
      {
        action: 'skip_delivery',
        metadata: { date: '2026-10-12', makeup_date: '2026-10-13' },
      },
    ])

    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-08T10:00:00Z'))
    const undoSkip = makeUC(deps)

    await undoSkip({ userId: 'user-uuid-1', deliveryDate: '2026-10-12' })

    expect(deps.deliveryDayPersistor.deleteScheduledDeliveryDaysOutsideDates).toHaveBeenCalledWith(
      sub.id,
      ['2026-10-12']
    )
    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      expect.objectContaining({
        skipDaysUsed: 0,
        skippedCount: 0,
        totalMealDays: 1,
        endDate: '2026-10-12',
      })
    )

    jest.useRealTimers()
  })
})
