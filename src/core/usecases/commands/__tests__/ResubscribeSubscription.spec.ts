import { makeUC } from '../ResubscribeSubscription'
import { buildDeps, makeSubscription } from '../../../../__tests__/helpers/mock-deps'

describe('ResubscribeSubscription', () => {
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

  it('reactivates a cancelled subscription still in service period', async () => {
    const sub = makeSubscription({
      status: 'cancelled',
      endDate: '2099-12-31',
    })
    const deps = makeDepsWithSub(sub)
    const resubscribe = makeUC(deps)

    const result = await resubscribe(validInput)

    expect(result.status).toBe('active')
    expect(result.subscription_id).toBe(sub.id)
    expect(result.end_date).toBe('2099-12-31')
    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      { status: 'active' }
    )
    expect(deps.auditLogPersistor.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'resubscribe_subscription' })
    )
  })

  it('throws when subscription is already active', async () => {
    const deps = makeDepsWithSub({ status: 'active' })
    const resubscribe = makeUC(deps)

    await expect(resubscribe(validInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
      message: 'Your subscription is already active.',
    })
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('throws when subscription is paused', async () => {
    const deps = makeDepsWithSub({ status: 'paused' })
    const resubscribe = makeUC(deps)

    await expect(resubscribe(validInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: expect.stringContaining('paused'),
    })
  })

  it('throws when cancelled but past end date', async () => {
    const deps = makeDepsWithSub({
      status: 'cancelled',
      endDate: '2020-01-01',
    })
    const resubscribe = makeUC(deps)

    await expect(resubscribe(validInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: expect.stringContaining('plan has ended'),
    })
  })

  it('throws ResourceNotFoundError when there is no subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const resubscribe = makeUC(deps)

    await expect(resubscribe(validInput)).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })
})
