import { makeUC } from '../SyncPauseStatuses.js'
import { buildDeps, makeSubscription } from '../../../../__tests__/helpers/mock-deps.js'

/** 2026-11-09 18:05 KSA = 15:05 UTC — after cutoff for a pause starting 2026-11-10. */
const AFTER_START_CUTOFF = new Date('2026-11-09T15:05:00Z')
/** Before cutoff for pause starting 2026-11-10. */
const BEFORE_START_CUTOFF = new Date('2026-11-09T14:00:00Z')

describe('SyncPauseStatuses', () => {
  it('flips active → paused when pause-start cutoff has passed', async () => {
    const sub = makeSubscription({
      id: 'sub-1',
      status: 'active',
      pausedFrom: '2026-11-10',
      pausedUntil: '2026-11-12',
      pauseCeilingDate: '2026-11-12',
    })
    const updateSubscription = jest.fn().mockImplementation(async (_id, updates) => ({
      ...sub,
      ...updates,
    }))
    const deps = buildDeps({
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        listSubscriptionsWithPauseWindows: jest.fn().mockResolvedValue([sub]),
        updateSubscription,
      },
    })

    const result = await makeUC(deps)({ now: AFTER_START_CUTOFF })

    expect(result.paused_count).toBe(1)
    expect(result.completed_count).toBe(0)
    expect(updateSubscription).toHaveBeenCalledWith('sub-1', { status: 'paused' })
  })

  it('does not flip before pause-start cutoff', async () => {
    const sub = makeSubscription({
      id: 'sub-1',
      status: 'active',
      pausedFrom: '2026-11-10',
      pausedUntil: '2026-11-12',
    })
    const updateSubscription = jest.fn()
    const deps = buildDeps({
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        listSubscriptionsWithPauseWindows: jest.fn().mockResolvedValue([sub]),
        updateSubscription,
      },
    })

    const result = await makeUC(deps)({ now: BEFORE_START_CUTOFF })

    expect(result.paused_count).toBe(0)
    expect(updateSubscription).not.toHaveBeenCalled()
  })

  it('clears ended pause windows and sets paused → active', async () => {
    const sub = makeSubscription({
      id: 'sub-1',
      status: 'paused',
      pausedFrom: '2026-10-20',
      pausedUntil: '2026-10-29',
      pauseCeilingDate: '2026-10-29',
    })
    const updateSubscription = jest.fn().mockImplementation(async (_id, updates) => ({
      ...sub,
      ...updates,
    }))
    const deps = buildDeps({
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        listSubscriptionsWithPauseWindows: jest.fn().mockResolvedValue([sub]),
        updateSubscription,
      },
    })

    const result = await makeUC(deps)({
      now: new Date('2026-11-09T10:00:00Z'),
      asOfDate: '2026-11-09',
    })

    expect(result.paused_count).toBe(0)
    expect(result.completed_count).toBe(1)
    expect(updateSubscription).toHaveBeenCalledWith('sub-1', {
      status: 'active',
      pausedFrom: null,
      pausedUntil: null,
      pauseCeilingDate: null,
    })
  })

  it('does not flip cancelled to paused (same as ensurePauseStatus)', async () => {
    const sub = makeSubscription({
      id: 'sub-1',
      status: 'cancelled',
      pausedFrom: '2026-11-10',
      pausedUntil: '2026-11-12',
    })
    const updateSubscription = jest.fn()
    const deps = buildDeps({
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        listSubscriptionsWithPauseWindows: jest.fn().mockResolvedValue([sub]),
        updateSubscription,
      },
    })

    const result = await makeUC(deps)({ now: AFTER_START_CUTOFF })

    expect(result.paused_count).toBe(0)
    expect(updateSubscription).not.toHaveBeenCalled()
  })
})
