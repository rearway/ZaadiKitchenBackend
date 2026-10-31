import {
  canChangeMealChoice,
  defaultMealId,
  resolveCustomerMenuStatus,
  streamOptions,
} from '../customerMenuDay'
import { makeSubscription } from '../../../../__tests__/helpers/mock-deps'
import type { Meal } from '../../../entities/Meal.js'
import type { MenuSlotWithMeal } from '../../../entities/MenuSlot.js'

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-a',
    nameEn: 'Chicken',
    mealType: 'executive',
    kcal: 400,
    emoji: '🍗',
    status: 'active',
    erpCode: 'ERP-A',
    timesServed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeSlot(meal: Meal, isDefault = false): MenuSlotWithMeal {
  return {
    id: `slot-${meal.id}`,
    weekId: 'w1',
    deliveryDate: '2099-12-31',
    mealType: meal.mealType,
    mealId: meal.id,
    isDefault,
    meal,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('customerMenuDay', () => {
  const execA = makeMeal({ id: 'exec-a' })
  const execB = makeMeal({ id: 'exec-b', nameEn: 'Lamb' })
  const saladA = makeMeal({ id: 'salad-a', mealType: 'salad', nameEn: 'Caesar' })

  it('returns stream options with default and selected flags', () => {
    const options = streamOptions(
      [
        makeSlot(execA, true),
        makeSlot(execB),
        makeSlot(saladA, true),
      ],
      'executive',
      execB.id
    )

    expect(options).toEqual([
      expect.objectContaining({
        meal_id: 'exec-a',
        is_default: true,
        is_selected: false,
      }),
      expect.objectContaining({
        meal_id: 'exec-b',
        is_default: false,
        is_selected: true,
      }),
    ])
  })

  it('returns all four dishes on a stream', () => {
    const meals = [1, 2, 3, 4].map(n =>
      makeMeal({ id: `exec-${n}`, nameEn: `Dish ${n}` })
    )
    const options = streamOptions(
      meals.map((meal, index) => makeSlot(meal, index === 0)),
      'executive'
    )
    expect(options.map(option => option.meal_id)).toEqual([
      'exec-1',
      'exec-2',
      'exec-3',
      'exec-4',
    ])
  })

  it('returns the default dish id, falling back to the first filled', () => {
    expect(
      defaultMealId([makeSlot(execA, true), makeSlot(execB)], 'executive')
    ).toBe('exec-a')
    expect(defaultMealId([makeSlot(execB), makeSlot(execA)], 'executive')).toBe(
      'exec-b'
    )
  })

  it('allows a choice only on a scheduled day with 2+ options before cutoff', () => {
    const sub = makeSubscription()
    expect(
      canChangeMealChoice({
        subscription: sub,
        dayStatus: 'scheduled',
        deliveryDate: '2099-12-31',
        optionCount: 2,
      })
    ).toBe(true)
    expect(
      canChangeMealChoice({
        subscription: sub,
        dayStatus: 'scheduled',
        deliveryDate: '2099-12-31',
        optionCount: 1,
      })
    ).toBe(false)
    expect(
      canChangeMealChoice({
        subscription: sub,
        dayStatus: 'skipped',
        deliveryDate: '2099-12-31',
        optionCount: 2,
      })
    ).toBe(false)
    expect(
      canChangeMealChoice({
        subscription: sub,
        dayStatus: 'scheduled',
        deliveryDate: '2020-01-06',
        optionCount: 2,
      })
    ).toBe(false)
  })

  it('classifies weekend, holiday, published, and unpublished days', () => {
    expect(
      resolveCustomerMenuStatus({
        date: '2026-09-18',
        isHoliday: true,
        hasPublishedMenu: true,
      })
    ).toBe('non_working_day')
    expect(
      resolveCustomerMenuStatus({
        date: '2026-09-19',
        isHoliday: false,
        hasPublishedMenu: false,
      })
    ).toBe('non_working_day')
    expect(
      resolveCustomerMenuStatus({
        date: '2026-09-15',
        isHoliday: true,
        hasPublishedMenu: true,
      })
    ).toBe('holiday')
    expect(
      resolveCustomerMenuStatus({
        date: '2026-09-15',
        isHoliday: false,
        hasPublishedMenu: true,
      })
    ).toBe('published')
    expect(
      resolveCustomerMenuStatus({
        date: '2026-09-15',
        isHoliday: false,
        hasPublishedMenu: false,
      })
    ).toBe('not_published')
  })
})
