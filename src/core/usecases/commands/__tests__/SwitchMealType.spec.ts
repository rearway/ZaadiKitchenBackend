import { getMealTypeEffectiveFrom, makeUC } from '../SwitchMealType'
import { buildDeps, makeSubscription } from '../../../../__tests__/helpers/mock-deps'

function makeSwitchDeps(sub = makeSubscription({ mealType: 'salad' })) {
  const base = buildDeps()
  return buildDeps({
    subscriptionLoader: {
      ...base.subscriptionLoader,
      getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
    },
    subscriptionPersistor: {
      ...base.subscriptionPersistor,
      updateSubscription: jest.fn().mockResolvedValue({ ...sub, mealType: 'executive' }),
    },
    deliveryDayPersistor: {
      ...base.deliveryDayPersistor,
      updateMealTypeForSubscription: jest.fn().mockResolvedValue(undefined),
    },
  })
}

describe('getMealTypeEffectiveFrom', () => {
  it('is tomorrow before 18:00 KSA', () => {
    expect(getMealTypeEffectiveFrom(new Date('2026-10-11T10:00:00Z'))).toBe(
      '2026-10-12'
    )
  })

  it('is the day after tomorrow from 18:00 KSA', () => {
    expect(getMealTypeEffectiveFrom(new Date('2026-10-11T15:00:00Z'))).toBe(
      '2026-10-13'
    )
  })
})

describe('SwitchMealType', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-11T10:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('applyTo all updates every scheduled day from effectiveFrom and the plan default', async () => {
    const deps = makeSwitchDeps()
    const result = await makeUC(deps)({
      userId: 'user-uuid-1',
      mealType: 'executive',
      applyTo: 'all',
    })

    expect(result.effective_from).toBe('2026-10-12')
    expect(result.applied_to).toBe('all')
    expect(deps.deliveryDayPersistor.updateMealTypeForSubscription).toHaveBeenCalledWith(
      expect.any(String),
      'executive',
      '2026-10-12',
      undefined
    )
    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      expect.any(String),
      { mealType: 'executive' }
    )
  })

  it('applyTo all salad overwrites earlier per-day executive days on or after effectiveFrom', async () => {
    const deps = makeSwitchDeps(makeSubscription({ mealType: 'executive' }))

    await makeUC(deps)({
      userId: 'user-uuid-1',
      mealType: 'salad',
      applyTo: 'all',
    })

    expect(deps.deliveryDayPersistor.updateMealTypeForSubscription).toHaveBeenCalledWith(
      expect.any(String),
      'salad',
      '2026-10-12',
      undefined
    )
    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith(
      expect.any(String),
      { mealType: 'salad' }
    )
  })

  it('applyTo specific updates only those dates when they are on or after effectiveFrom', async () => {
    const deps = makeSwitchDeps()

    const result = await makeUC(deps)({
      userId: 'user-uuid-1',
      mealType: 'executive',
      applyTo: 'specific',
      specificDays: ['2026-10-12', '2026-10-13'],
    })

    expect(result.applied_to).toBe('specific')
    expect(deps.deliveryDayPersistor.updateMealTypeForSubscription).toHaveBeenCalledWith(
      expect.any(String),
      'executive',
      '2026-10-12',
      ['2026-10-12', '2026-10-13']
    )
    expect(deps.subscriptionPersistor.updateSubscription).not.toHaveBeenCalled()
  })

  it('rejects specific days before effectiveFrom so they cannot outlive a later applyTo all', async () => {
    const deps = makeSwitchDeps()

    await expect(
      makeUC(deps)({
        userId: 'user-uuid-1',
        mealType: 'executive',
        applyTo: 'specific',
        specificDays: ['2026-10-11', '2026-10-12'],
      })
    ).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      details: {
        fields: {
          specific_days: 'Earliest allowed date is 2026-10-12.',
          blocked_dates: ['2026-10-11'],
        },
      },
    })
    expect(deps.deliveryDayPersistor.updateMealTypeForSubscription).not.toHaveBeenCalled()
  })

  it('after 18:00 KSA rejects tomorrow as a specific day', async () => {
    jest.setSystemTime(new Date('2026-10-11T15:00:00Z'))
    const deps = makeSwitchDeps()

    await expect(
      makeUC(deps)({
        userId: 'user-uuid-1',
        mealType: 'executive',
        applyTo: 'specific',
        specificDays: ['2026-10-12'],
      })
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR' })
  })

  it('rejects specific with no days', async () => {
    const deps = makeSwitchDeps()

    await expect(
      makeUC(deps)({
        userId: 'user-uuid-1',
        mealType: 'executive',
        applyTo: 'specific',
        specificDays: [],
      })
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR' })
  })

  it('throws when there is no subscription', async () => {
    const deps = makeSwitchDeps()
    jest
      .mocked(deps.subscriptionLoader.getActiveSubscriptionByUserId)
      .mockResolvedValue(null)

    await expect(
      makeUC(deps)({
        userId: 'user-uuid-1',
        mealType: 'executive',
        applyTo: 'all',
      })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
