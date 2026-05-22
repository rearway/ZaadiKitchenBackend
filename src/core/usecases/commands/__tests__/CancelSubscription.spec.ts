import { makeUC } from '../CancelSubscription'
import { buildDeps, makeSubscription } from '../../../../__tests__/helpers/mock-deps'

describe('CancelSubscription', () => {
  const validInput = { userId: 'user-uuid-1' }

  function makeDepsWithSub(subOverrides = {}) {
    const sub = makeSubscription(subOverrides)
    return buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      },
    })
  }

  it('cancels an active subscription', async () => {
    const sub = makeSubscription({ status: 'active', endDate: '2025-07-31' })
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      },
    })
    const cancelSubscription = makeUC(deps)

    const result = await cancelSubscription(validInput)

    expect(result.status).toBe('cancelled')
    expect(result.deliveries_continue_until).toBe('2025-07-31')
    expect(result.refund_sar).toBe(0)
  })

  it('sets the subscription status to cancelled in the database', async () => {
    const sub = makeSubscription({ status: 'active' })
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      },
    })
    const cancelSubscription = makeUC(deps)

    await cancelSubscription(validInput)

    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      expect.objectContaining({ status: 'cancelled' })
    )
  })

  it('returns a human-readable message including the end date', async () => {
    const sub = makeSubscription({ endDate: '2025-07-31' })
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockResolvedValue(undefined),
      },
    })
    const cancelSubscription = makeUC(deps)

    const result = await cancelSubscription(validInput)

    expect(result.message).toContain('31 Jul')
  })

  it('cancels a paused subscription', async () => {
    const deps = makeDepsWithSub({ status: 'paused' })
    const cancelSubscription = makeUC(deps)

    const result = await cancelSubscription(validInput)
    expect(result.status).toBe('cancelled')
  })

  it('throws ResourceNotFoundError when there is no subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const cancelSubscription = makeUC(deps)

    await expect(cancelSubscription(validInput)).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws ValidationError when the subscription is already cancelled', async () => {
    const deps = makeDepsWithSub({ status: 'cancelled' })
    const cancelSubscription = makeUC(deps)

    await expect(cancelSubscription(validInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('throws ValidationError when the subscription is already expired', async () => {
    const deps = makeDepsWithSub({ status: 'expired' })
    const cancelSubscription = makeUC(deps)

    await expect(cancelSubscription(validInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })

  it('always returns refund_sar=0 (no refunds policy)', async () => {
    const deps = makeDepsWithSub({ status: 'active' })
    const cancelSubscription = makeUC(deps)

    const result = await cancelSubscription(validInput)

    expect(result.refund_sar).toBe(0)
  })
})
