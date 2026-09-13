import { makeUC } from '../GetCustomerMenuWeek'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'
import type { Meal } from '../../../entities/Meal.js'
import type { MenuSlotWithMeal } from '../../../entities/MenuSlot.js'

const FROZEN_NOW = new Date('2026-09-14T10:00:00Z') // Monday
const TODAY = '2026-09-14'
const UPCOMING = '2026-09-16'
const NEXT_WEEK = '2026-09-21' // Monday next week

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-uuid-1',
    nameEn: 'Chicken Biriyani meals',
    mealType: 'executive',
    kcal: 320,
    emoji: '🍗',
    status: 'active',
    timesServed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeSlot(deliveryDate: string, meal: Meal = makeMeal()): MenuSlotWithMeal {
  return {
    id: `slot-${deliveryDate}`,
    weekId: 'w2026-38',
    deliveryDate,
    mealType: meal.mealType,
    mealId: meal.id,
    meal,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function makeDeps(opts: {
  sub?: ReturnType<typeof makeSubscription> | null
  slots?: MenuSlotWithMeal[]
  days?: ReturnType<typeof makeDeliveryDay>[]
} = {}) {
  const sub = opts.sub === undefined ? makeSubscription() : opts.sub
  return buildDeps({
    subscriptionLoader: {
      ...buildDeps().subscriptionLoader,
      getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
    },
    menuWeekLoader: {
      ...buildDeps().menuWeekLoader,
      getMenuForDateRange: jest.fn().mockResolvedValue(opts.slots ?? []),
    },
    deliveryDayLoader: {
      ...buildDeps().deliveryDayLoader,
      getDeliveryDaysBySubscription: jest.fn().mockResolvedValue(opts.days ?? []),
    },
  })
}

describe('GetCustomerMenuWeek', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN_NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('marks a skipped upcoming day as skipped with already_skipped', async () => {
    const deps = makeDeps({
      slots: [makeSlot(UPCOMING)],
      days: [makeDeliveryDay({ date: UPCOMING, status: 'skipped' })],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const card = result.this_week.days.find(d => d.delivery_date === UPCOMING)

    expect(card).toMatchObject({
      card_state: 'skipped',
      skip_available: false,
      skip_reason: 'already_skipped',
    })
  })

  it('marks a skipped today card as skipped instead of today', async () => {
    const deps = makeDeps({
      slots: [makeSlot(TODAY)],
      days: [makeDeliveryDay({ date: TODAY, status: 'skipped' })],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const card = result.this_week.days.find(d => d.delivery_date === TODAY)

    expect(card).toMatchObject({
      card_state: 'skipped',
      is_today: true,
      skip_available: false,
      skip_reason: 'already_skipped',
    })
  })

  it('marks a skipped next-week day as skipped', async () => {
    const deps = makeDeps({
      slots: [makeSlot(NEXT_WEEK)],
      days: [makeDeliveryDay({ date: NEXT_WEEK, status: 'skipped' })],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const card = result.next_week.days.find(d => d.delivery_date === NEXT_WEEK)

    expect(card).toMatchObject({
      card_state: 'skipped',
      skip_available: false,
      skip_reason: 'already_skipped',
    })
  })

  it('keeps skip available on a scheduled upcoming day', async () => {
    const deps = makeDeps({
      slots: [makeSlot(UPCOMING)],
      days: [makeDeliveryDay({ date: UPCOMING, status: 'scheduled' })],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const card = result.this_week.days.find(d => d.delivery_date === UPCOMING)

    expect(card).toMatchObject({
      card_state: 'upcoming',
      skip_available: true,
      skip_reason: null,
    })
  })

  it('does not treat skipped days as skipped when the subscription is paused', async () => {
    const deps = makeDeps({
      sub: makeSubscription({ status: 'paused' }),
      slots: [makeSlot(UPCOMING)],
      days: [makeDeliveryDay({ date: UPCOMING, status: 'skipped' })],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const card = result.this_week.days.find(d => d.delivery_date === UPCOMING)

    expect(card).toMatchObject({
      card_state: 'upcoming',
      skip_available: false,
      skip_reason: 'subscription_paused',
    })
  })
})
