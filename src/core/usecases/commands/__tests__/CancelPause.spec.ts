import { makeUC } from '../CancelPause'
import { buildDeps, makeSubscription } from '../../../../__tests__/helpers/mock-deps'

describe('CancelPause', () => {
  const PAUSE_FROM = '2099-12-31'
  const PAUSE_UNTIL = '2100-01-04'
  /** Wed 31, Thu Jan 1, Sun Jan 4 (Sun–Thu working week). */
  const WORKING_DAYS_RESERVED = 3

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2099-12-29T10:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  function makeScheduledPauseDeps(subOverrides = {}) {
    const sub = makeSubscription({
      status: 'active',
      pausedFrom: PAUSE_FROM,
      pausedUntil: PAUSE_UNTIL,
      pauseCeilingDate: PAUSE_UNTIL,
      skipDaysAllowed: 66,
      pauseDaysAllowed: 66,
      skipDaysUsed: WORKING_DAYS_RESERVED,
      pauseDaysUsed: WORKING_DAYS_RESERVED,
      startDate: '2099-08-10',
      endDate: '2100-06-30',
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

  it('cancels a scheduled pause, refunds flex, and clears pause metadata', async () => {
    const deps = makeScheduledPauseDeps()
    const cancelPause = makeUC(deps)

    const result = await cancelPause({ userId: 'user-uuid-1' })

    expect(result.status).toBe('active')
    expect(result.subscription_id).toBeDefined()
    expect(result.pause_days_used).toBe(0)
    expect(result.skip_days_used).toBe(0)
    expect(result.pause_days_remaining).toBe(66)
    expect(result.skip_pause_days_remaining).toBe(66)

    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'active',
        pausedFrom: null,
        pausedUntil: null,
        pauseCeilingDate: null,
        pauseDaysUsed: 0,
        skipDaysUsed: 0,
      })
    )
  })

  it('restores paused delivery days in the window to scheduled', async () => {
    const deps = makeScheduledPauseDeps()
    const cancelPause = makeUC(deps)

    await cancelPause({ userId: 'user-uuid-1' })

    expect(
      deps.deliveryDayPersistor.bulkUpdateDeliveryDayStatus
    ).toHaveBeenCalledWith(
      expect.any(String),
      PAUSE_FROM,
      PAUSE_UNTIL,
      'paused',
      'scheduled'
    )
  })

  it('writes an audit log with refunded working days', async () => {
    const deps = makeScheduledPauseDeps()
    const cancelPause = makeUC(deps)

    await cancelPause({ userId: 'user-uuid-1' })

    expect(deps.auditLogPersistor.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid-1',
        action: 'cancel_pause',
        metadata: expect.objectContaining({
          paused_from: PAUSE_FROM,
          paused_until: PAUSE_UNTIL,
          refunded_working_days: WORKING_DAYS_RESERVED,
        }),
      })
    )
  })

  it('throws ResourceNotFoundError when there is no subscription', async () => {
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const cancelPause = makeUC(deps)

    await expect(cancelPause({ userId: 'user-uuid-1' })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('throws ValidationError when there is no pause scheduled', async () => {
    const sub = makeSubscription({
      status: 'active',
      pausedFrom: null,
      pausedUntil: null,
    })
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
    })
    const cancelPause = makeUC(deps)

    await expect(cancelPause({ userId: 'user-uuid-1' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'There is no pause to cancel.',
    })
  })

  it('throws ValidationError when the pause has already started (status paused)', async () => {
    const deps = makeScheduledPauseDeps({ status: 'paused' })
    const cancelPause = makeUC(deps)

    await expect(cancelPause({ userId: 'user-uuid-1' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'This pause has already started. Use resume instead of cancel.',
    })
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('throws ValidationError when pause-start cutoff has passed while still active', async () => {
    jest.setSystemTime(new Date('2099-12-30T16:00:00Z'))
    const deps = makeScheduledPauseDeps()
    const cancelPause = makeUC(deps)

    await expect(cancelPause({ userId: 'user-uuid-1' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'This pause has already started. Use resume instead of cancel.',
    })
  })
})
