import { makeUC } from '../ResumeSubscription'
import { buildDeps, makeSubscription } from '../../../../__tests__/helpers/mock-deps'

describe('ResumeSubscription', () => {
  const PAUSE_FROM = '2099-08-12'
  const PAUSE_UNTIL = '2099-08-20'
  const RESUME_DATE = '2099-08-15'

  beforeEach(() => {
    jest.useFakeTimers()
    // During pause window; resume must be tomorrow+ (2099-08-14 → earliest 2099-08-15).
    jest.setSystemTime(new Date('2099-08-14T10:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const validInput = { userId: 'user-uuid-1', resumeDate: RESUME_DATE }

  function makeDepsWithSub(subOverrides = {}) {
    const sub = makeSubscription({
      status: 'paused',
      pausedFrom: PAUSE_FROM,
      pausedUntil: PAUSE_UNTIL,
      pauseCeilingDate: PAUSE_UNTIL,
      startDate: '2099-08-10',
      endDate: '2099-12-31',
      skipDaysAllowed: 66,
      pauseDaysAllowed: 66,
      ...subOverrides,
    })
    return buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockImplementation(async (_id, patch) => ({
          ...sub,
          ...patch,
        })),
      },
    })
  }

  it('resumes a paused subscription and returns active status', async () => {
    const deps = makeDepsWithSub({ pauseDaysUsed: 5 })
    const resumeSubscription = makeUC(deps)

    const result = await resumeSubscription(validInput)

    expect(result.status).toBe('active')
    expect(result.resume_date).toBe(RESUME_DATE)
    // Partial refund of unused pause working days reduces flex used vs pre-resume value.
    expect(result.pause_days_used).toBeLessThan(5)
  })

  it('clears the pause metadata on the subscription', async () => {
    const sub = makeSubscription({
      status: 'paused',
      pausedFrom: PAUSE_FROM,
      pausedUntil: PAUSE_UNTIL,
      pauseCeilingDate: PAUSE_UNTIL,
      startDate: '2099-08-10',
      endDate: '2099-12-31',
    })
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockImplementation(async (_id, patch) => ({
          ...sub,
          ...patch,
        })),
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
    const deps = makeDepsWithSub()
    const resumeSubscription = makeUC(deps)

    const result = await resumeSubscription(validInput)

    expect(result.first_delivery_label).toMatch(/Saturday/)
    expect(result.first_delivery_label).toMatch(/15/)
    expect(result.first_delivery_label).toMatch(/Aug/)
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
    const deps = makeDepsWithSub({
      status: 'active',
      pausedFrom: null,
      pausedUntil: null,
      pauseCeilingDate: null,
    })
    const resumeSubscription = makeUC(deps)

    await expect(resumeSubscription(validInput)).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('allows resume when cancelled but pause has started', async () => {
    const deps = makeDepsWithSub({ status: 'cancelled' })
    const resumeSubscription = makeUC(deps)

    const result = await resumeSubscription(validInput)

    expect(result.status).toBe('cancelled')
    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 'cancelled' })
    )
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
