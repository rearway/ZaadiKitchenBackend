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
    erpCode: 'MK3F9A',
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
    isDefault: true,
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
      is_skipped: true,
      undoable: true,
      skip_reason: 'already_skipped',
      is_deliverable: false,
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
      is_deliverable: true,
    })
  })

  it('returns one card per day with both streams and marks only scheduled days deliverable', async () => {
    const deps = makeDeps({
      sub: makeSubscription({ mealType: 'executive' }),
      slots: [
        makeSlot(TODAY, makeMeal({ id: 'meal-today', mealType: 'executive' })),
        makeSlot(UPCOMING, makeMeal({ mealType: 'executive' })),
        makeSlot(UPCOMING, makeMeal({ id: 'meal-salad', mealType: 'salad' })),
        makeSlot('2026-09-15', makeMeal({ id: 'meal-tue', mealType: 'executive' })),
      ],
      days: [makeDeliveryDay({ date: UPCOMING, status: 'scheduled' })],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const byDate = (date: string) =>
      result.this_week.days.find(d => d.delivery_date === date)

    expect(byDate(TODAY)).toMatchObject({
      meal_type: 'executive',
      is_deliverable: false,
      skip_reason: 'no_delivery',
    })
    expect(byDate(UPCOMING)).toMatchObject({
      meal_type: 'executive',
      is_deliverable: true,
      skip_available: true,
    })
    expect(byDate(UPCOMING)?.executive_options).toHaveLength(1)
    expect(byDate(UPCOMING)?.salad_options).toEqual([
      expect.objectContaining({ meal_id: 'meal-salad' }),
    ])
    expect(byDate('2026-09-15')).toMatchObject({
      is_deliverable: false,
      skip_reason: 'no_delivery',
    })
  })

  it('keeps is_deliverable false for paused and delivered days', async () => {
    const deps = makeDeps({
      slots: [
        makeSlot(UPCOMING),
        makeSlot(TODAY, makeMeal({ id: 'meal-today' })),
      ],
      days: [
        makeDeliveryDay({ date: UPCOMING, status: 'paused' }),
        makeDeliveryDay({ date: TODAY, status: 'delivered' }),
      ],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    expect(
      result.this_week.days.find(d => d.delivery_date === UPCOMING)
    ).toMatchObject({ is_deliverable: false })
    expect(
      result.this_week.days.find(d => d.delivery_date === TODAY)
    ).toMatchObject({ is_deliverable: false })
  })

  it('shows undo on the skipped day card while still listing both stream options', async () => {
    const deps = makeDeps({
      sub: makeSubscription({ mealType: 'executive' }),
      slots: [
        makeSlot(UPCOMING, makeMeal({ mealType: 'executive' })),
        makeSlot(UPCOMING, makeMeal({ id: 'meal-salad', mealType: 'salad' })),
      ],
      days: [
        makeDeliveryDay({ date: UPCOMING, status: 'skipped', mealType: 'executive' }),
      ],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const cards = result.this_week.days.filter(
      d => d.delivery_date === UPCOMING
    )

    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      meal_type: 'executive',
      card_state: 'skipped',
      undoable: true,
      is_skipped: true,
      skip_reason: 'already_skipped',
      is_deliverable: false,
      can_change: false,
    })
    expect(cards[0].salad_options).toEqual([
      expect.objectContaining({ meal_id: 'meal-salad' }),
    ])
  })

  it('uses the assigned stream for skip flags and effective meal', async () => {
    const deps = makeDeps({
      sub: makeSubscription({ mealType: 'salad' }),
      slots: [
        makeSlot(UPCOMING, makeMeal({ mealType: 'executive' })),
        makeSlot(UPCOMING, makeMeal({ id: 'meal-salad', mealType: 'salad' })),
      ],
      days: [
        makeDeliveryDay({ date: UPCOMING, status: 'scheduled', mealType: 'salad' }),
      ],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const card = result.this_week.days.find(
      d => d.delivery_date === UPCOMING
    )

    expect(card).toMatchObject({
      meal_type: 'salad',
      meal_id: 'meal-salad',
      skip_available: true,
      skip_reason: null,
      is_deliverable: true,
    })
    expect(card?.executive_options).toHaveLength(1)
    expect(card?.salad_options).toHaveLength(1)
  })

  it('marks the switched-day card deliverable after a per-day meal-type change', async () => {
    const deps = makeDeps({
      sub: makeSubscription({ mealType: 'salad' }),
      slots: [
        makeSlot(UPCOMING, makeMeal({ mealType: 'executive' })),
        makeSlot(UPCOMING, makeMeal({ id: 'meal-salad', mealType: 'salad' })),
      ],
      days: [
        makeDeliveryDay({
          date: UPCOMING,
          status: 'scheduled',
          mealType: 'executive',
        }),
      ],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const card = result.this_week.days.find(
      d => d.delivery_date === UPCOMING
    )

    expect(card).toMatchObject({
      meal_type: 'executive',
      is_deliverable: true,
      skip_available: true,
      skip_reason: null,
    })
  })

  it('uses the customer pick as the effective meal and enables can_change when there are options', async () => {
    const execA = makeMeal({ id: 'exec-a', nameEn: 'Default Exec' })
    const execB = makeMeal({ id: 'exec-b', nameEn: 'Picked Exec' })
    const deps = makeDeps({
      slots: [
        { ...makeSlot(UPCOMING, execA), isDefault: true },
        { ...makeSlot(UPCOMING, execB), id: 'slot-b', isDefault: false },
      ],
      days: [
        makeDeliveryDay({
          date: UPCOMING,
          status: 'scheduled',
          selectedMealId: execB.id,
        }),
      ],
    })
    const getCustomerMenuWeek = makeUC(deps)

    const result = await getCustomerMenuWeek({ userId: 'user-uuid-1' })
    const card = result.this_week.days.find(d => d.delivery_date === UPCOMING)

    expect(card).toMatchObject({
      meal_id: 'exec-b',
      name_en: 'Picked Exec',
      selected_meal_id: 'exec-b',
      can_change: true,
      effective_meal: expect.objectContaining({ meal_id: 'exec-b' }),
    })
    expect(card?.executive_options).toEqual([
      expect.objectContaining({ meal_id: 'exec-a', is_default: true, is_selected: false }),
      expect.objectContaining({ meal_id: 'exec-b', is_default: false, is_selected: true }),
    ])
  })

  it('uses the Asia/Riyadh civil date as today at 21:30 UTC', async () => {
    jest.setSystemTime(new Date('2026-09-14T21:30:00.000Z'))
    const deps = makeDeps({
      slots: [
        makeSlot('2026-09-14'),
        makeSlot('2026-09-15', makeMeal({ id: 'meal-tue' })),
      ],
    })

    const result = await makeUC(deps)({ userId: 'user-uuid-1' })
    const monday = result.this_week.days.find(d => d.delivery_date === '2026-09-14')
    const tuesday = result.this_week.days.find(d => d.delivery_date === '2026-09-15')

    expect(monday).toMatchObject({ is_today: false, card_state: 'past' })
    expect(tuesday).toMatchObject({ is_today: true, card_state: 'today' })
  })

  it('uses the Asia/Riyadh civil date as today at 02:00 UTC', async () => {
    jest.setSystemTime(new Date('2026-09-14T02:00:00.000Z'))
    const deps = makeDeps({
      slots: [
        makeSlot('2026-09-14'),
        makeSlot('2026-09-15', makeMeal({ id: 'meal-tue' })),
      ],
    })

    const result = await makeUC(deps)({ userId: 'user-uuid-1' })
    const monday = result.this_week.days.find(d => d.delivery_date === '2026-09-14')
    const tuesday = result.this_week.days.find(d => d.delivery_date === '2026-09-15')

    expect(monday).toMatchObject({ is_today: true, card_state: 'today' })
    expect(tuesday).toMatchObject({ is_today: false, card_state: 'upcoming' })
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

  it('omits selected_date when date is not requested and does not look up holidays', async () => {
    const deps = makeDeps({ slots: [makeSlot(TODAY)] })
    const result = await makeUC(deps)({ userId: 'user-uuid-1' })

    expect(result).not.toHaveProperty('selected_date')
    expect(result).not.toHaveProperty('selected_day')
    expect(result.this_week.date_from).toBe('2026-09-13')
    expect(result.next_week.date_to).toBe('2026-09-24')
    expect(deps.publicHolidayLoader.getHolidayDates).not.toHaveBeenCalled()
  })

  it('returns a published selected_day with cutoff and can_change', async () => {
    const execA = makeMeal({ id: 'exec-a', nameEn: 'Default Exec' })
    const execB = makeMeal({ id: 'exec-b', nameEn: 'Picked Exec' })
    const deps = makeDeps({
      slots: [
        { ...makeSlot(UPCOMING, execA), isDefault: true },
        { ...makeSlot(UPCOMING, execB), id: 'slot-b', isDefault: false },
      ],
      days: [
        makeDeliveryDay({
          date: UPCOMING,
          status: 'scheduled',
          selectedMealId: execB.id,
        }),
      ],
    })

    const result = await makeUC(deps)({ userId: 'user-uuid-1', date: UPCOMING })

    expect(result.selected_date).toBe(UPCOMING)
    expect(result.selected_day).toMatchObject({
      delivery_date: UPCOMING,
      menu_status: 'published',
      cutoff_at: '2026-09-15T15:00:00.000Z',
      meal_id: 'exec-b',
      name_en: 'Picked Exec',
      can_change: true,
      selected_meal_id: 'exec-b',
    })
    expect(result.selected_day?.executive_options).toHaveLength(2)
    expect(result.this_week.days.find(d => d.delivery_date === UPCOMING)).not.toHaveProperty(
      'menu_status'
    )
  })

  it('marks a published day after cutoff as not changeable', async () => {
    const deps = makeDeps({
      slots: [
        makeSlot(TODAY, makeMeal({ id: 'exec-a' })),
        { ...makeSlot(TODAY, makeMeal({ id: 'exec-b' })), id: 'slot-b', isDefault: false },
      ],
      days: [makeDeliveryDay({ date: TODAY, status: 'scheduled' })],
    })

    const result = await makeUC(deps)({ userId: 'user-uuid-1', date: TODAY })

    expect(result.selected_day).toMatchObject({
      menu_status: 'published',
      can_change: false,
      cutoff_at: '2026-09-13T15:00:00.000Z',
    })
  })

  it('returns non_working_day with empty options for Friday and Saturday', async () => {
    const deps = makeDeps({
      slots: [makeSlot('2026-09-18', makeMeal({ nameEn: 'Should not leak' }))],
    })

    const friday = await makeUC(deps)({ userId: 'user-uuid-1', date: '2026-09-18' })
    const saturday = await makeUC(deps)({ userId: 'user-uuid-1', date: '2026-09-19' })

    expect(friday.selected_day).toMatchObject({
      menu_status: 'non_working_day',
      name_en: null,
      executive_options: [],
      salad_options: [],
      cutoff_at: '2026-09-17T15:00:00.000Z',
    })
    expect(saturday.selected_day?.menu_status).toBe('non_working_day')
    expect(saturday.selected_day?.cutoff_at).toBe('2026-09-18T15:00:00.000Z')
  })

  it('returns holiday and hides meals even when a published menu exists', async () => {
    const deps = makeDeps({
      slots: [makeSlot('2026-09-15', makeMeal({ nameEn: 'Draft leak' }))],
    })
    deps.publicHolidayLoader.getHolidayDates = jest
      .fn()
      .mockResolvedValue(['2026-09-15'])

    const result = await makeUC(deps)({ userId: 'user-uuid-1', date: '2026-09-15' })

    expect(result.selected_day).toMatchObject({
      menu_status: 'holiday',
      name_en: null,
      meal_id: null,
      executive_options: [],
      salad_options: [],
    })
    expect(result.this_week.days.find(d => d.delivery_date === '2026-09-15')?.name_en).toBe(
      'Draft leak'
    )
  })

  it('returns not_published with no meals when the date has no published slots', async () => {
    const deps = makeDeps({
      days: [
        makeDeliveryDay({
          date: '2026-09-15',
          status: 'scheduled',
          selectedMealId: 'secret-draft-meal',
        }),
      ],
    })

    const result = await makeUC(deps)({ userId: 'user-uuid-1', date: '2026-09-15' })

    expect(result.selected_day).toMatchObject({
      menu_status: 'not_published',
      name_en: null,
      meal_id: null,
      selected_meal_id: null,
      executive_options: [],
      salad_options: [],
      can_change: false,
    })
    expect(JSON.stringify(result.selected_day)).not.toContain('secret-draft-meal')
  })

  it.each(['2026-13-40', '09-16-2026', '2026-09-31', 'foo', '2026-09-16T00:00:00Z', ' '])(
    'rejects invalid date %s',
    async date => {
      const deps = makeDeps()
      await expect(
        makeUC(deps)({ userId: 'user-uuid-1', date })
      ).rejects.toMatchObject({ errorCode: 'INVALID_DATE', statusCode: 400 })
    }
  )

  it('rejects a date outside this week and next week', async () => {
    const deps = makeDeps()
    await expect(
      makeUC(deps)({ userId: 'user-uuid-1', date: '2026-09-12' })
    ).rejects.toMatchObject({ errorCode: 'DATE_OUT_OF_RANGE', statusCode: 400 })
    await expect(
      makeUC(deps)({ userId: 'user-uuid-1', date: '2026-09-25' })
    ).rejects.toMatchObject({
      errorCode: 'DATE_OUT_OF_RANGE',
      statusCode: 400,
      details: { date_from: '2026-09-13', date_to: '2026-09-24' },
    })
  })
})
