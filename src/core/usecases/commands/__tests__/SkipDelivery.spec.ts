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
    const sub = makeSubscription(subOverrides)
    const day = makeDeliveryDay({ subscriptionId: sub.id, date: FAR_FUTURE_DATE, ...dayOverrides })

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
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockResolvedValue(undefined),
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
  })

  it('updates the delivery day status to skipped', async () => {
    const day = makeDeliveryDay({ id: 'dd-abc', date: FAR_FUTURE_DATE })
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(makeSubscription()),
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
    const skipDelivery = makeUC(deps)

    await skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })

    expect(deps.deliveryDayPersistor.updateDeliveryDayStatus).toHaveBeenCalledWith('dd-abc', 'skipped')
  })

  it('increments both skipDaysUsed and skippedCount on the subscription', async () => {
    const sub = makeSubscription({ skipDaysUsed: 3, skippedCount: 3 })
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(makeDeliveryDay({ date: FAR_FUTURE_DATE })),
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
    const skipDelivery = makeUC(deps)

    await skipDelivery({ userId: 'user-uuid-1', deliveryDate: FAR_FUTURE_DATE })

    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      expect.objectContaining({ skipDaysUsed: 4, skippedCount: 4 })
    )
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
