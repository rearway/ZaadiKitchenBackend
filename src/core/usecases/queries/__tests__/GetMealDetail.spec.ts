import { makeUC } from '../GetMealDetail'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'
import type { Meal } from '../../../entities/Meal.js'
import type { MenuSlotWithMeal } from '../../../entities/MenuSlot.js'

const FROZEN_NOW = new Date('2026-09-14T10:00:00Z')
const UPCOMING = '2026-09-16'

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'exec-a',
    nameEn: 'Default Exec',
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
    weekId: 'w2026-38',
    deliveryDate: UPCOMING,
    mealType: meal.mealType,
    mealId: meal.id,
    isDefault,
    meal,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('GetMealDetail', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(FROZEN_NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('marks the selected dish as effective and selectable before cutoff', async () => {
    const execA = makeMeal({ id: 'exec-a' })
    const execB = makeMeal({ id: 'exec-b', nameEn: 'Picked Exec' })
    const sub = makeSubscription()
    const deps = buildDeps({
      mealLoader: {
        ...buildDeps().mealLoader,
        getMealById: jest.fn().mockResolvedValue(execB),
      },
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(
          makeDeliveryDay({
            date: UPCOMING,
            status: 'scheduled',
            selectedMealId: execB.id,
          })
        ),
      },
      menuWeekLoader: {
        ...buildDeps().menuWeekLoader,
        getMenuForDateRange: jest
          .fn()
          .mockResolvedValue([makeSlot(execA, true), makeSlot(execB)]),
      },
    })

    const result = await makeUC(deps)({
      mealId: execB.id,
      userId: sub.userId,
      deliveryDate: UPCOMING,
    })

    expect(result).toMatchObject({
      is_selected: true,
      is_effective: true,
      is_default: false,
      can_select: true,
      selected_meal_id: 'exec-b',
    })
  })
})
