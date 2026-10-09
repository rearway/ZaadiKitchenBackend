import { makeUC } from '../SkipDelivery'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'

// Cutoff is 15:00 UTC the day before delivery (= 6 PM KSA)
// For delivery on 2099-12-31, the cutoff is 2099-12-30T15:00:00Z — safely in the future
const FAR_FUTURE_DATE = '2099-12-31'
const PAST_DATE = '2020-01-06' // Monday in the past — cutoff long passed

describe('SkipDelivery', () => {
  function makeDepsWithSub(subOverrides = {}, dayOverrides = {}) {
    const sub = makeSubscription({
      endDate: FAR_FUTURE_DATE,
      totalMealDays: 22,
      ...subOverrides,
    })
    const day = makeDeliveryDay({
      subscriptionId: sub.id,
      date: FAR_FUTURE_DATE,
      ...dayOverrides,
    })

    return buildDeps({
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
        bulkCreateDeliveryDays: jest.fn().mockImplementation(async days =>
          days.map((d: Record<string, unknown>, i: number) =>
            makeDeliveryDay({ id: `makeup-${i}`, ...d })
          )
        ),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      },
      publicHolidayLoader: {
        ...buildDeps().publicHolidayLoader,
        getHolidayDates: jest.fn().mockResolvedValue([]),
      },
      auditLogPersistor: {
        ...buildDeps().auditLogPersistor,
        createAuditLog: jest.fn().mockResolvedValue({}),
      },
    })
  }

  it('skips a scheduled delivery day and returns updated skip counts', async () => {
    const deps = makeDepsWithSub({ skipDaysUsed: 0, skipDaysAllowed: 66 })
    const skipDelivery = makeUC(deps)

    const result = await skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })

    expect(result.date).toBe(FAR_FUTURE_DATE)
    expect(result.status).toBe('skipped')
    expect(result.undoable).toBe(true)
    expect(result.skip_days_used).toBe(1)
    expect(result.skip_days_remaining).toBe(65)
    expect(result.makeup_date).toBeTruthy()
  })

  it('updates the delivery day status to skipped', async () => {
    const deps = makeDepsWithSub()
    const day = makeDeliveryDay({ id: 'dd-abc', date: FAR_FUTURE_DATE })
    ;(deps.deliveryDayLoader.getDeliveryDayByDate as jest.Mock).mockResolvedValue(day)
    const skipDelivery = makeUC(deps)

    await skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })

    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).toHaveBeenCalledWith('dd-abc', 'skipped')
  })

  it('rolls a try_it skip forward to the next working day', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-08T10:00:00Z')) // before Oct 12 cutoff

    const tryItDate = '2026-10-12' // Monday
    const deps = makeDepsWithSub({
      skipDaysUsed: 0,
      skipDaysAllowed: 1,
      skippedCount: 0,
      totalMealDays: 1,
      endDate: tryItDate,
      mealType: 'executive',
    })
    ;(deps.deliveryDayLoader.getDeliveryDayByDate as jest.Mock).mockResolvedValue(
      makeDeliveryDay({ date: tryItDate, status: 'scheduled' })
    )
    const skipDelivery = makeUC(deps)

    const result = await skipDelivery({ userId: 'user-uuid-1', deliveryDate: tryItDate })

    // Monday → next working day Tuesday
    expect(result.makeup_date).toBe('2026-10-13')
    expect(deps.deliveryDayPersistor.bulkCreateDeliveryDays).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          date: '2026-10-13',
          status: 'scheduled',
          mealType: 'executive',
        }),
      ])
    )
    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        skipDaysUsed: 1,
        skippedCount: 1,
        totalMealDays: 2,
        endDate: '2026-10-13',
      })
    )

    jest.useRealTimers()
  })

  it('throws ResourceNotFoundError when the user has no active subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const skipDelivery = makeUC(deps)

    await expect(skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws PastCutoffError when trying to skip after 6 PM the day before', async () => {
    const deps = makeDepsWithSub()
    const skipDelivery = makeUC(deps)

    // PAST_DATE cutoff has long passed
    await expect(skipDelivery({ userId: 'user-uuid-1', deliveryDate: PAST_DATE })).rejects.toMatchObject({
      errorCode: 'PAST_CUTOFF',
      statusCode: 422,
    })
    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).not.toHaveBeenCalled()
  })

  it('throws SkipLimitReachedError when all skip days have been used', async () => {
    const exhaustedSub = makeSubscription({ skipDaysUsed: 66, skipDaysAllowed: 66 })
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(exhaustedSub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(makeDeliveryDay({ date: FAR_FUTURE_DATE })),
      },
    })
    const skipDelivery = makeUC(deps)

    await expect(skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })).rejects.toMatchObject({
      errorCode: 'SKIP_LIMIT_REACHED',
      statusCode: 409,
    })
    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).not.toHaveBeenCalled()
  })

  it('throws ResourceNotFoundError when the delivery date is not in the subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(makeSubscription()),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(null),
      },
    })
    const skipDelivery = makeUC(deps)

    await expect(skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws ValidationError when the delivery day is already skipped', async () => {
    const deps = makeDepsWithSub({}, { status: 'skipped' })
    const skipDelivery = makeUC(deps)

    await expect(skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })

  it('throws ValidationError when the delivery day is already delivered', async () => {
    const deps = makeDepsWithSub({}, { status: 'delivered' })
    const skipDelivery = makeUC(deps)

    await expect(skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })

  it('throws ValidationError when the delivery day is paused', async () => {
    const deps = makeDepsWithSub({}, { status: 'paused' })
    const skipDelivery = makeUC(deps)

    await expect(skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })
})
