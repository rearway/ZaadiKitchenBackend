import { resolveDayActionFlags } from '../dayActionFlags.js'
import { makeSubscription } from '../../../../__tests__/helpers/mock-deps'

describe('resolveDayActionFlags', () => {
  const future = '2099-06-15' // far ahead so cutoff not passed at frozen time
  const FROZEN = new Date('2026-09-14T10:00:00Z')

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns not_subscribed when no subscription', () => {
    expect(
      resolveDayActionFlags({
        subscription: null,
        deliveryDate: future,
        mealType: 'executive',
        dayStatus: 'scheduled',
      })
    ).toMatchObject({
      skip_available: false,
      undoable: false,
      is_skipped: false,
      skip_reason: 'not_subscribed',
    })
  })

  it('blocks salad when subscription is executive', () => {
    const sub = makeSubscription({ mealType: 'executive', status: 'active' })
    expect(
      resolveDayActionFlags({
        subscription: sub,
        deliveryDate: future,
        mealType: 'salad',
        dayStatus: 'scheduled',
      })
    ).toMatchObject({
      skip_available: false,
      skip_reason: 'meal_type_mismatch',
      undoable: false,
      is_skipped: false,
    })
  })

  it('allows skip for matching scheduled day', () => {
    const sub = makeSubscription({
      mealType: 'executive',
      status: 'active',
      skipDaysUsed: 0,
      pauseDaysUsed: 0,
    })
    expect(
      resolveDayActionFlags({
        subscription: sub,
        deliveryDate: future,
        mealType: 'executive',
        dayStatus: 'scheduled',
      })
    ).toMatchObject({
      skip_available: true,
      undoable: false,
      is_skipped: false,
      skip_reason: null,
    })
  })

  it('sets undoable when skipped and before cutoff', () => {
    const sub = makeSubscription({ status: 'active', mealType: 'executive' })
    expect(
      resolveDayActionFlags({
        subscription: sub,
        deliveryDate: future,
        mealType: 'executive',
        dayStatus: 'skipped',
      })
    ).toMatchObject({
      skip_available: false,
      is_skipped: true,
      undoable: true,
      skip_reason: 'already_skipped',
    })
  })

  it('does not mark undo/skipped on menu card when day is skipped but meal type differs', () => {
    const sub = makeSubscription({ status: 'active', mealType: 'executive' })
    expect(
      resolveDayActionFlags({
        subscription: sub,
        deliveryDate: future,
        mealType: 'salad',
        dayStatus: 'skipped',
      })
    ).toMatchObject({
      skip_available: false,
      is_skipped: false,
      undoable: false,
      skip_reason: 'meal_type_mismatch',
    })
  })

  it('blocks skip when day is paused', () => {
    const sub = makeSubscription({ status: 'active' })
    expect(
      resolveDayActionFlags({
        subscription: sub,
        deliveryDate: future,
        mealType: 'executive',
        dayStatus: 'paused',
      })
    ).toMatchObject({
      skip_available: false,
      skip_reason: 'day_paused',
      is_skipped: false,
      undoable: false,
    })
  })

  it('blocks skip when subscription status is paused', () => {
    const sub = makeSubscription({ status: 'paused' })
    expect(
      resolveDayActionFlags({
        subscription: sub,
        deliveryDate: future,
        mealType: 'executive',
        dayStatus: 'scheduled',
      })
    ).toMatchObject({
      skip_available: false,
      skip_reason: 'subscription_paused',
    })
  })

  it('allows skip when cancelled but still in service period', () => {
    const sub = makeSubscription({
      status: 'cancelled',
      mealType: 'executive',
      endDate: '2099-12-31',
      skipDaysUsed: 0,
      pauseDaysUsed: 0,
    })
    expect(
      resolveDayActionFlags({
        subscription: sub,
        deliveryDate: future,
        mealType: 'executive',
        dayStatus: 'scheduled',
      })
    ).toMatchObject({
      skip_available: true,
      skip_reason: null,
    })
  })

  it('blocks skip when cancelled and past end date', () => {
    const sub = makeSubscription({
      status: 'cancelled',
      endDate: '2020-01-01',
    })
    expect(
      resolveDayActionFlags({
        subscription: sub,
        deliveryDate: future,
        mealType: 'executive',
        dayStatus: 'scheduled',
      })
    ).toMatchObject({
      skip_available: false,
      skip_reason: 'subscription_cancelled',
    })
  })
})
