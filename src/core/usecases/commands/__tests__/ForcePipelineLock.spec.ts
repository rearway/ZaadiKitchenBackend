import { makeUC as makeForceLock } from '../ForcePipelineLock.js'
import { makeUC as makeAdvance } from '../AdvancePipelineStage.js'
import { makeUC as makeGetDailyOps } from '../../queries/GetDailyOps.js'
import { makeUC as makeGetErpDailyOrders } from '../../queries/GetErpDailyOrders.js'
import { computeEffectiveStage } from '../../services/dailyOpsStage.js'
import {
  isAfterErpCutoff,
  resolveDailyOrdersDate,
} from '../../services/erpCutoffUtils.js'
import {
  isForcePipelineLockEnabled,
  isDeliveryDateForceLocked,
  resetForceLockedDeliveryDates,
} from '../../services/forcePipelineLock.js'
import { isAfterSkipCutoff } from '../../services/weekUtils.js'
import { buildDeps, makeUser } from '../../../../__tests__/helpers/mock-deps.js'
import type { DailyOpsDay } from '../../../entities/DailyOpsDay.js'

/** Far-future Sun–Thu dates so the real 18:00 KSA cutoff has not passed. */
const SUNDAY = '2099-12-27'
const MONDAY = '2099-12-28'
const FRIDAY = '2099-12-25'
const SATURDAY = '2099-12-26'
const BEFORE_CUTOFF = new Date('2026-10-24T12:00:00Z')

const originalFlag = process.env.ALLOW_FORCE_PIPELINE_LOCK
const originalNodeEnv = process.env.NODE_ENV

function enableGate() {
  process.env.ALLOW_FORCE_PIPELINE_LOCK = 'true'
  process.env.NODE_ENV = 'test'
}

function disableGate() {
  delete process.env.ALLOW_FORCE_PIPELINE_LOCK
  process.env.NODE_ENV = 'test'
}

describe('staging force pipeline lock', () => {
  beforeEach(() => {
    resetForceLockedDeliveryDates()
    disableGate()
  })

  afterEach(() => {
    resetForceLockedDeliveryDates()
    if (originalFlag === undefined) delete process.env.ALLOW_FORCE_PIPELINE_LOCK
    else process.env.ALLOW_FORCE_PIPELINE_LOCK = originalFlag
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })

  it('recognises the fixture dates as Sun, Mon, Fri, and Sat', () => {
    expect(new Date(`${SUNDAY}T00:00:00Z`).getUTCDay()).toBe(0)
    expect(new Date(`${MONDAY}T00:00:00Z`).getUTCDay()).toBe(1)
    expect(new Date(`${FRIDAY}T00:00:00Z`).getUTCDay()).toBe(5)
    expect(new Date(`${SATURDAY}T00:00:00Z`).getUTCDay()).toBe(6)
  })

  it('stays disabled unless ALLOW_FORCE_PIPELINE_LOCK is exactly true and NODE_ENV is not production', () => {
    expect(isForcePipelineLockEnabled()).toBe(false)

    for (const value of ['false', '1', 'yes', 'TRUE', '']) {
      process.env.ALLOW_FORCE_PIPELINE_LOCK = value
      process.env.NODE_ENV = 'test'
      expect(isForcePipelineLockEnabled()).toBe(false)
    }

    process.env.ALLOW_FORCE_PIPELINE_LOCK = 'true'
    process.env.NODE_ENV = 'production'
    expect(isForcePipelineLockEnabled()).toBe(false)

    process.env.ALLOW_FORCE_PIPELINE_LOCK = '  true  '
    process.env.NODE_ENV = 'staging'
    expect(isForcePipelineLockEnabled()).toBe(true)
  })

  it('returns 404 and does not move cutoff when the gate is unset, off, or production', async () => {
    const getByDate = jest.fn()
    const advanceStage = jest.fn()
    const deps = buildDeps({
      dailyOpsDayLoader: { getByDate } as unknown as ReturnType<
        typeof buildDeps
      >['dailyOpsDayLoader'],
      dailyOpsDayPersistor: { advanceStage } as unknown as ReturnType<
        typeof buildDeps
      >['dailyOpsDayPersistor'],
    })
    const forceLock = makeForceLock(deps)

    for (const setup of [
      () => {
        delete process.env.ALLOW_FORCE_PIPELINE_LOCK
        process.env.NODE_ENV = 'test'
      },
      () => {
        process.env.ALLOW_FORCE_PIPELINE_LOCK = 'false'
        process.env.NODE_ENV = 'staging'
      },
      () => {
        process.env.ALLOW_FORCE_PIPELINE_LOCK = 'true'
        process.env.NODE_ENV = 'production'
      },
    ]) {
      setup()
      await expect(
        forceLock({ date: SUNDAY, forcedByUserId: 'admin-1' })
      ).rejects.toMatchObject({
        statusCode: 404,
      })
    }

    expect(getByDate).not.toHaveBeenCalled()
    expect(advanceStage).not.toHaveBeenCalled()
    expect(isAfterSkipCutoff(SUNDAY, BEFORE_CUTOFF)).toBe(false)
    expect(isAfterErpCutoff(SUNDAY, BEFORE_CUTOFF)).toBe(false)
    expect(computeEffectiveStage(null, SUNDAY)).toBe('pending')
    expect(
      resolveDailyOrdersDate(SUNDAY, new Set(), BEFORE_CUTOFF).frozen
    ).toBe(false)

    enableGate()
    expect(isDeliveryDateForceLocked(SUNDAY)).toBe(false)
    expect(isAfterSkipCutoff(SUNDAY, BEFORE_CUTOFF)).toBe(false)
  })

  it('treats one Sun–Thu date as past the real cutoff so ops locks and ERP freezes', async () => {
    enableGate()
    const advanceStage = jest.fn()
    const getDailyOrders = jest.fn().mockResolvedValue({ rows: [], total: 0 })
    const deps = buildDeps({
      dailyOpsDayPersistor: { advanceStage } as unknown as ReturnType<
        typeof buildDeps
      >['dailyOpsDayPersistor'],
      erpIntegrationLoader: {
        ...buildDeps().erpIntegrationLoader,
        getDailyOrders,
      } as unknown as ReturnType<typeof buildDeps>['erpIntegrationLoader'],
    })
    const forceLock = makeForceLock(deps)

    const result = await forceLock({ date: SUNDAY, forcedByUserId: 'admin-1' })

    expect(result).toEqual({
      date: SUNDAY,
      previous_stage: 'pending',
      current_stage: 'locked',
      frozen: true,
    })
    expect(advanceStage).not.toHaveBeenCalled()
    expect(isAfterSkipCutoff(SUNDAY, BEFORE_CUTOFF)).toBe(true)
    expect(isAfterErpCutoff(SUNDAY, BEFORE_CUTOFF)).toBe(true)
    expect(isAfterSkipCutoff(MONDAY, BEFORE_CUTOFF)).toBe(false)
    expect(computeEffectiveStage(null, SUNDAY)).toBe('locked')
    expect(computeEffectiveStage(null, MONDAY)).toBe('pending')
    expect(
      resolveDailyOrdersDate(SUNDAY, new Set(), BEFORE_CUTOFF).frozen
    ).toBe(true)
    expect(
      resolveDailyOrdersDate(MONDAY, new Set(), BEFORE_CUTOFF).frozen
    ).toBe(false)

    const dailyOps = await makeGetDailyOps(deps)({
      date: SUNDAY,
      role: 'admin',
    })
    expect(dailyOps.pipeline.stage).toBe('locked')
    expect(dailyOps.pipeline.can_advance).toBe(true)

    const erp = await makeGetErpDailyOrders(deps)({ date: SUNDAY })
    expect(erp.meta.frozen).toBe(true)
    expect(erp.meta.resolvedDeliveryDate).toBe(SUNDAY)
    expect(getDailyOrders).toHaveBeenCalledWith(SUNDAY, 0, 50)
  })

  it('lets the existing advance path move locked → dispatch → delivered', async () => {
    enableGate()
    let stored: DailyOpsDay | null = null
    const deps = buildDeps({
      dailyOpsDayLoader: {
        getByDate: jest.fn(() => stored),
      } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayLoader'],
      dailyOpsDayPersistor: {
        advanceStage: jest.fn(
          (date: string, toStage: 'dispatch' | 'delivered', userId: string) => {
            const now = new Date('2099-12-26T18:00:00Z')
            stored = {
              date,
              dispatchedAt: stored?.dispatchedAt ?? now,
              dispatchedById: stored?.dispatchedById ?? userId,
              deliveredAt: toStage === 'delivered' ? now : null,
              deliveredById: toStage === 'delivered' ? userId : null,
              createdAt: stored?.createdAt ?? now,
              updatedAt: now,
            }
            return stored
          }
        ),
      } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayPersistor'],
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest
          .fn()
          .mockResolvedValue(makeUser({ id: 'admin-1', fullName: 'QA Admin' })),
      },
    })

    await makeForceLock(deps)({ date: SUNDAY, forcedByUserId: 'admin-1' })
    const advance = makeAdvance(deps)

    const dispatched = await advance({
      date: SUNDAY,
      fromStage: 'locked',
      toStage: 'dispatch',
      advancedByUserId: 'admin-1',
    })
    expect(dispatched.current_stage).toBe('dispatch')

    const delivered = await advance({
      date: SUNDAY,
      fromStage: 'dispatch',
      toStage: 'delivered',
      advancedByUserId: 'admin-1',
    })
    expect(delivered.current_stage).toBe('delivered')
    expect(computeEffectiveStage(stored, SUNDAY)).toBe('delivered')
  })

  it('does not lock every future date just because the gate is enabled', async () => {
    enableGate()
    const advanceStage = jest.fn()
    const deps = buildDeps({
      dailyOpsDayPersistor: { advanceStage } as unknown as ReturnType<
        typeof buildDeps
      >['dailyOpsDayPersistor'],
    })
    const advance = makeAdvance(deps)

    await expect(
      advance({
        date: SUNDAY,
        fromStage: 'locked',
        toStage: 'dispatch',
        advancedByUserId: 'admin-1',
      })
    ).rejects.toMatchObject({ errorCode: 'STAGE_MISMATCH', statusCode: 409 })
    expect(advanceStage).not.toHaveBeenCalled()
    expect(computeEffectiveStage(null, SUNDAY)).toBe('pending')
  })

  it('ignores a recorded date when NODE_ENV is production even if the flag is true', async () => {
    enableGate()
    await makeForceLock(buildDeps())({
      date: SUNDAY,
      forcedByUserId: 'admin-1',
    })
    expect(computeEffectiveStage(null, SUNDAY)).toBe('locked')

    process.env.NODE_ENV = 'production'
    process.env.ALLOW_FORCE_PIPELINE_LOCK = 'true'
    expect(isForcePipelineLockEnabled()).toBe(false)
    expect(isDeliveryDateForceLocked(SUNDAY)).toBe(false)
    expect(isAfterSkipCutoff(SUNDAY, BEFORE_CUTOFF)).toBe(false)
    expect(isAfterErpCutoff(SUNDAY, BEFORE_CUTOFF)).toBe(false)
    expect(computeEffectiveStage(null, SUNDAY)).toBe('pending')
    expect(
      resolveDailyOrdersDate(SUNDAY, new Set(), BEFORE_CUTOFF).frozen
    ).toBe(false)
  })

  it('stops honouring a recorded date when the gate is turned off', async () => {
    enableGate()
    const deps = buildDeps()
    await makeForceLock(deps)({ date: SUNDAY, forcedByUserId: 'admin-1' })
    expect(computeEffectiveStage(null, SUNDAY)).toBe('locked')

    disableGate()
    expect(isDeliveryDateForceLocked(SUNDAY)).toBe(false)
    expect(isAfterSkipCutoff(SUNDAY, BEFORE_CUTOFF)).toBe(false)
    expect(isAfterErpCutoff(SUNDAY, BEFORE_CUTOFF)).toBe(false)
    expect(computeEffectiveStage(null, SUNDAY)).toBe('pending')
  })

  it('rejects Friday, Saturday, and impossible dates without recording a lock', async () => {
    enableGate()
    const deps = buildDeps()
    const forceLock = makeForceLock(deps)

    for (const date of [FRIDAY, SATURDAY, '2099-02-31', 'not-a-date']) {
      await expect(
        forceLock({ date, forcedByUserId: 'admin-1' })
      ).rejects.toMatchObject({
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      })
      expect(isAfterSkipCutoff(date, BEFORE_CUTOFF)).toBe(false)
    }
  })

  it('rejects a date that is already in dispatch and does not rewrite it', async () => {
    enableGate()
    const dispatched: DailyOpsDay = {
      date: SUNDAY,
      dispatchedAt: new Date('2099-12-26T18:00:00Z'),
      dispatchedById: 'admin-1',
      deliveredAt: null,
      deliveredById: null,
      createdAt: new Date('2099-12-26T18:00:00Z'),
      updatedAt: new Date('2099-12-26T18:00:00Z'),
    }
    const advanceStage = jest.fn()
    const deps = buildDeps({
      dailyOpsDayLoader: {
        getByDate: jest.fn().mockResolvedValue(dispatched),
      } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayLoader'],
      dailyOpsDayPersistor: { advanceStage } as unknown as ReturnType<
        typeof buildDeps
      >['dailyOpsDayPersistor'],
    })

    await expect(
      makeForceLock(deps)({ date: SUNDAY, forcedByUserId: 'admin-1' })
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR', statusCode: 400 })

    expect(isDeliveryDateForceLocked(SUNDAY)).toBe(false)
    expect(computeEffectiveStage(dispatched, SUNDAY)).toBe('dispatch')
    expect(advanceStage).not.toHaveBeenCalled()
  })

  it('is idempotent when the date is already force-locked', async () => {
    enableGate()
    const deps = buildDeps()
    const forceLock = makeForceLock(deps)

    await forceLock({ date: SUNDAY, forcedByUserId: 'admin-1' })
    const again = await forceLock({ date: SUNDAY, forcedByUserId: 'admin-2' })

    expect(again).toMatchObject({
      date: SUNDAY,
      previous_stage: 'locked',
      current_stage: 'locked',
      frozen: true,
    })
  })
})
