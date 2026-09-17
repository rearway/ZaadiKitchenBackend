import { makeUC } from '../GetHomeThisWeek'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'
import type { Meal } from '../../../entities/Meal.js'
import type { MenuSlotWithMeal } from '../../../entities/MenuSlot.js'

const FROZEN_NOW = new Date('2026-09-14T10:00:00Z') // Monday
const TODAY = '2026-09-14'
const UPCOMING = '2026-09-16' // Wednesday this week

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

describe('GetHomeThisWeek', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN_NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('includes photo_url from the assigned menu meal', async () => {
    const meal = makeMeal({ photoUrl: 'https://cdn.example.com/meals/chicken.jpg' })
    const deps = makeDeps({
      slots: [makeSlot(UPCOMING, meal)],
      days: [makeDeliveryDay({ date: UPCOMING, status: 'scheduled' })],
    })
    const getHomeThisWeek = makeUC(deps)

    const result = await getHomeThisWeek({ userId: 'user-uuid-1' })

    expect(result.cards[0].photo_url).toBe('https://cdn.example.com/meals/chicken.jpg')
  })

  it('marks a skipped upcoming day as skipped with Undo CTA', async () => {
    const meal = makeMeal()
    const deps = makeDeps({
      slots: [makeSlot(UPCOMING, meal)],
      days: [makeDeliveryDay({ date: UPCOMING, status: 'skipped' })],
    })
    const getHomeThisWeek = makeUC(deps)

    const result = await getHomeThisWeek({ userId: 'user-uuid-1' })

    expect(result.cards).toHaveLength(1)
    expect(result.cards[0]).toMatchObject({
      meal_id: meal.id,
      delivery_date: UPCOMING,
      card_state: 'skipped',
      action: { type: 'open_meal_detail', cta_label: 'Undo' },
    })
  })

  it('marks a skipped today card as skipped instead of today', async () => {
    const deps = makeDeps({
      slots: [makeSlot(TODAY)],
      days: [makeDeliveryDay({ date: TODAY, status: 'skipped' })],
    })
    const getHomeThisWeek = makeUC(deps)

    const result = await getHomeThisWeek({ userId: 'user-uuid-1' })

    expect(result.cards[0].card_state).toBe('skipped')
    expect(result.cards[0].day_label).toBe('TODAY')
    expect(result.cards[0].action?.cta_label).toBe('Undo')
  })

  it('keeps Skip CTA on a scheduled upcoming day', async () => {
    const deps = makeDeps({
      slots: [makeSlot(UPCOMING)],
      days: [makeDeliveryDay({ date: UPCOMING, status: 'scheduled' })],
    })
    const getHomeThisWeek = makeUC(deps)

    const result = await getHomeThisWeek({ userId: 'user-uuid-1' })

    expect(result.cards[0].card_state).toBe('upcoming')
    expect(result.cards[0].action).toEqual({
      type: 'open_meal_detail',
      cta_label: 'Skip →',
    })
  })

  it('keeps browse_only when the subscription is paused even if the day was skipped', async () => {
    const deps = makeDeps({
      sub: makeSubscription({ status: 'paused' }),
      slots: [makeSlot(UPCOMING)],
      days: [makeDeliveryDay({ date: UPCOMING, status: 'skipped' })],
    })
    const getHomeThisWeek = makeUC(deps)

    const result = await getHomeThisWeek({ userId: 'user-uuid-1' })

    expect(result.cards[0].card_state).toBe('browse_only')
    expect(result.cards[0].action?.cta_label).toBe('Browse only')
  })

  it('does not load delivery days when there is no subscription', async () => {
    const deps = makeDeps({
      sub: null,
      slots: [makeSlot(UPCOMING)],
    })
    const getHomeThisWeek = makeUC(deps)

    const result = await getHomeThisWeek({ userId: 'user-uuid-1' })

    expect(deps.deliveryDayLoader.getDeliveryDaysBySubscription).not.toHaveBeenCalled()
    expect(result.cards[0].card_state).toBe('upcoming')
    expect(result.cards[0].action?.cta_label).toBe('Subscribe →')
  })
})
