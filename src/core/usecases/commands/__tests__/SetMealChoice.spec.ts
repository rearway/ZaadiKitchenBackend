import { makeUC } from '../SetMealChoice'
import {
  buildDeps,
  makeSubscription,
  makeDeliveryDay,
} from '../../../../__tests__/helpers/mock-deps'
import type { Meal } from '../../../entities/Meal.js'
import type { MenuSlotWithMeal } from '../../../entities/MenuSlot.js'
import {
  PastCutoffError,
  ValidationError,
} from '../../../../shared/errors/index.js'

const DATE = '2099-12-31'
const PAST = '2020-01-06'

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

function makeChoiceDeps(opts: {
  day?: ReturnType<typeof makeDeliveryDay>
  slots?: MenuSlotWithMeal[]
} = {}) {
  const sub = makeSubscription()
  const execA = makeMeal({ id: 'exec-a', nameEn: 'Default Exec' })
  const execB = makeMeal({ id: 'exec-b', nameEn: 'Picked Exec' })
  const salad = makeMeal({ id: 'salad-a', mealType: 'salad', nameEn: 'Caesar' })
  const slots =
    opts.slots ?? [makeSlot(execA, true), makeSlot(execB), makeSlot(salad, true)]
  return {
    sub,
    execB,
    salad,
    deps: buildDeps({
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
      },
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayByDate: jest.fn().mockResolvedValue(
          opts.day ??
            makeDeliveryDay({
              date: DATE,
              status: 'scheduled',
              mealType: 'executive',
            })
        ),
      },
      menuWeekLoader: {
        ...buildDeps().menuWeekLoader,
        getMenuForDateRange: jest.fn().mockResolvedValue(slots),
      },
      deliveryDayPersistor: {
        ...buildDeps().deliveryDayPersistor,
        updateSelectedMeal: jest.fn().mockResolvedValue(
          makeDeliveryDay({ selectedMealId: execB.id, mealName: execB.nameEn })
        ),
      },
    }),
  }
}

describe('SetMealChoice', () => {
  it('saves a valid dish on the assigned stream', async () => {
    const { deps, sub, execB } = makeChoiceDeps()
    const result = await makeUC(deps)({
      userId: sub.userId,
      deliveryDate: DATE,
      mealId: execB.id,
    })

    expect(deps.deliveryDayPersistor.updateSelectedMeal).toHaveBeenCalledWith(
      expect.any(String),
      'exec-b',
      'Picked Exec'
    )
    expect(result).toMatchObject({
      delivery_date: DATE,
      selected_meal_id: 'exec-b',
      effective_meal: { meal_id: 'exec-b' },
    })
  })

  it('switches the day to salad when picking a salad dish', async () => {
    const { deps, sub, salad } = makeChoiceDeps()
    const result = await makeUC(deps)({
      userId: sub.userId,
      deliveryDate: DATE,
      mealId: salad.id,
    })

    expect(
      deps.deliveryDayPersistor.updateMealTypeForSubscription
    ).toHaveBeenCalledWith(sub.id, 'salad', DATE, [DATE])
    expect(deps.deliveryDayPersistor.updateSelectedMeal).toHaveBeenCalledWith(
      expect.any(String),
      'salad-a',
      'Caesar'
    )
    expect(result).toMatchObject({
      meal_type: 'salad',
      selected_meal_id: 'salad-a',
      effective_meal: { meal_id: 'salad-a' },
    })
  })

  it('rejects after cutoff', async () => {
    const { deps, sub, execB } = makeChoiceDeps({
      day: makeDeliveryDay({ date: PAST, status: 'scheduled' }),
    })
    await expect(
      makeUC(deps)({
        userId: sub.userId,
        deliveryDate: PAST,
        mealId: execB.id,
      })
    ).rejects.toBeInstanceOf(PastCutoffError)
  })

  it('rejects a skipped day', async () => {
    const { deps, sub, execB } = makeChoiceDeps({
      day: makeDeliveryDay({ date: DATE, status: 'skipped' }),
    })
    await expect(
      makeUC(deps)({
        userId: sub.userId,
        deliveryDate: DATE,
        mealId: execB.id,
      })
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
