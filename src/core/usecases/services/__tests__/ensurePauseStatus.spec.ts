import { ensurePauseStatus, isPauseScheduled } from '../ensurePauseStatus.js'
import { buildDeps, makeSubscription } from '../../../../__tests__/helpers/mock-deps.js'

describe('ensurePauseStatus', () => {
  const PAUSE_FROM = '2099-12-31'
  const PAUSE_UNTIL = '2100-01-04'

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns subscription unchanged when status is not active', async () => {
    const sub = makeSubscription({ status: 'paused', pausedFrom: PAUSE_FROM, pausedUntil: PAUSE_UNTIL })
    const deps = buildDeps()
    const result = await ensurePauseStatus(deps, sub)
    expect(result).toBe(sub)
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('returns subscription unchanged when pause metadata is missing', async () => {
    const sub = makeSubscription({ status: 'active', pausedFrom: null, pausedUntil: null })
    const deps = buildDeps()
    const result = await ensurePauseStatus(deps, sub)
    expect(result).toBe(sub)
  })

  it('keeps active status before pause-start cutoff', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2099-12-29T10:00:00Z'))
    const sub = makeSubscription({
      status: 'active',
      pausedFrom: PAUSE_FROM,
      pausedUntil: PAUSE_UNTIL,
    })
    const deps = buildDeps()
    const result = await ensurePauseStatus(deps, sub)
    expect(result.status).toBe('active')
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('flips to paused after pause-start cutoff', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2099-12-30T16:00:00Z'))
    const sub = makeSubscription({
      status: 'active',
      pausedFrom: PAUSE_FROM,
      pausedUntil: PAUSE_UNTIL,
    })
    const deps = buildDeps({
      subscriptionPersistor: {
        ...buildDeps().subscriptionPersistor,
        updateSubscription: jest.fn().mockResolvedValue({ ...sub, status: 'paused' }),
      },
    })
    const result = await ensurePauseStatus(deps, sub)
    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(sub.id, {
      status: 'paused',
    })
    expect(result.status).toBe('paused')
  })
})

describe('isPauseScheduled', () => {
  const PAUSE_FROM = '2099-12-31'

  afterEach(() => {
    jest.useRealTimers()
  })

  it('is true for active subscription before pause-start cutoff', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2099-12-29T10:00:00Z'))
    const sub = makeSubscription({
      status: 'active',
      pausedFrom: PAUSE_FROM,
      pausedUntil: '2100-01-04',
    })
    expect(isPauseScheduled(sub)).toBe(true)
  })

  it('is false when status is paused', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2099-12-29T10:00:00Z'))
    const sub = makeSubscription({
      status: 'paused',
      pausedFrom: PAUSE_FROM,
      pausedUntil: '2100-01-04',
    })
    expect(isPauseScheduled(sub)).toBe(false)
  })
})
