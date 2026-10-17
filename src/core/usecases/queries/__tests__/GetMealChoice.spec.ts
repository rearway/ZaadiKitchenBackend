import { makeUC } from '../GetMealChoice'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'
import type { Meal } from '../../../entities/Meal.js'
import type { MenuSlotWithMeal } from '../../../entities/MenuSlot.js'
import { ResourceNotFoundError } from '../../../../shared/errors/index.js'

const DATE = '2099-12-31'

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'exec-a',
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
    deliveryDate: DATE,
    mealType: meal.mealType,
    mealId: meal.id,
    isDefault,
    meal,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('GetMealChoice', () => {
  it('returns stream options, default, selected, and effective meal', async () => {
    const execA = makeMeal({ id: 'exec-a', nameEn: 'Default Exec' })
    const execB = makeMeal({ id: 'exec-b', nameEn: 'Picked Exec' })
    const salad = makeMeal({ id: 'salad-a', mealType: 'salad', nameEn: 'Caesar' })
    const sub = makeSubscription()
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(
          makeDeliveryDay({
            date: DATE,
            status: 'scheduled',
            selectedMealId: execB.id,
          })
        ),
      },
      menuWeekLoader: {
        ...buildDeps().menuWeekLoader,
        getMenuForDateRange: jest
          .fn()
          .mockResolvedValue([
            makeSlot(execA, true),
            makeSlot(execB),
            makeSlot(salad, true),
          ]),
      },
    })

    const result = await makeUC(deps)({ userId: sub.userId, deliveryDate: DATE })

    expect(result).toMatchObject({
      delivery_date: DATE,
      meal_type: 'executive',
      selected_meal_id: 'exec-b',
      default_meal_id: 'exec-a',
      can_change: true,
      effective_meal: { meal_id: 'exec-b', name_en: 'Picked Exec' },
    })
    expect(result.options.map(o => o.meal_id)).toEqual(['exec-a', 'exec-b'])
    expect(result.salad_options).toHaveLength(1)
  })

  it('throws when there is no delivery day', async () => {
    const sub = makeSubscription()
    const deps = buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
    })

    await expect(
      makeUC(deps)({ userId: sub.userId, deliveryDate: DATE })
    ).rejects.toBeInstanceOf(ResourceNotFoundError)
  })
})
