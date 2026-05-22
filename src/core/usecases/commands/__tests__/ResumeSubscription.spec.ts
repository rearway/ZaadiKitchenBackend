import { makeUC } from '../ResumeSubscription'
import { buildDeps, makeSubscription } from '../../../../__tests__/helpers/mock-deps'

describe('ResumeSubscription', () => {
  const validInput = { userId: 'user-uuid-1', resumeDate: '2025-07-10' }

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

  it('resumes a paused subscription and returns active status', async () => {
    const deps = makeDepsWithSub({ status: 'paused', pauseDaysUsed: 5 })
    const resumeSubscription = makeUC(deps)

    const result = await resumeSubscription(validInput)

    expect(result.status).toBe('active')
    expect(result.resume_date).toBe('2025-07-10')
    expect(result.pause_days_used).toBe(5)
  })

  it('clears the pause metadata on the subscription', async () => {
    const sub = makeSubscription({ status: 'paused', pausedFrom: '2025-07-01', pausedUntil: '2025-07-09', pauseCeilingDate: '2025-07-09' })
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
    const resumeSubscription = makeUC(deps)

    await resumeSubscription(validInput)

    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      sub.id,
      expect.objectContaining({
        status: 'active',
        pausedFrom: null,
        pausedUntil: null,
        pauseCeilingDate: null,
      })
    )
  })

  it('returns a formatted first_delivery_label for the resume date', async () => {
    const deps = makeDepsWithSub({ status: 'paused' })
    const resumeSubscription = makeUC(deps)

    // 2025-07-10 is a Thursday
    const result = await resumeSubscription({ userId: 'user-uuid-1', resumeDate: '2025-07-10' })

    expect(result.first_delivery_label).toMatch(/Thursday/)
    expect(result.first_delivery_label).toMatch(/10/)
    expect(result.first_delivery_label).toMatch(/Jul/)
  })

  it('throws ResourceNotFoundError when there is no subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const resumeSubscription = makeUC(deps)

    await expect(resumeSubscription(validInput)).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws ValidationError when the subscription is active (not paused)', async () => {
    const deps = makeDepsWithSub({ status: 'active' })
    const resumeSubscription = makeUC(deps)

    await expect(resumeSubscription(validInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('throws ValidationError when the subscription is cancelled', async () => {
    const deps = makeDepsWithSub({ status: 'cancelled' })
    const resumeSubscription = makeUC(deps)

    await expect(resumeSubscription(validInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })

  it('throws ValidationError when the subscription is expired', async () => {
    const deps = makeDepsWithSub({ status: 'expired' })
    const resumeSubscription = makeUC(deps)

    await expect(resumeSubscription(validInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })
})
