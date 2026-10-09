import { makeUC } from '../AssignMealToSlot'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { MenuSlot } from '../../../entities/MenuSlot.js'
import type { MenuWeek } from '../../../entities/MenuWeek.js'
import type { Meal } from '../../../entities/Meal.js'

const WEEK_ID = 'w2026-40'
const DATE = '2026-10-04'

function makeWeek(overrides: Partial<MenuWeek> = {}): MenuWeek {
  return {
    id: WEEK_ID,
    weekNumber: 40,
    year: 2026,
    dateFrom: '2026-10-04',
    dateTo: '2026-10-08',
    status: 'draft',
    publishedAt: null,
    publishedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeSlot(
  mealType: 'executive' | 'salad',
  overrides: Partial<MenuSlot> = {}
): MenuSlot {
  return {
    id: `slot-${mealType}`,
    weekId: WEEK_ID,
    deliveryDate: DATE,
    mealType,
    mealId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeMeal(mealType: 'executive' | 'salad', id = `meal-${mealType}`): Meal {
  return {
    id,
    nameEn: mealType === 'salad' ? 'Fattoush' : 'Chicken',
    nameAr: '',
    mealType,
    status: 'active',
    kcal: 500,
    emoji: '🥗',
    photoUrl: null,
    proteinG: 20,
    carbsG: 30,
    fatG: 10,
    chefNote: '',
    keyIngredients: [],
    erpCode: `ERP-${id}`,
    timesServed: 0,
    lastServedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('AssignMealToSlot', () => {
  it('assigns when meal type matches the slot', async () => {
    const execSlot = makeSlot('executive')
    const meal = makeMeal('executive')
    const deps = buildDeps({
      menuWeekLoader: {
        ...buildDeps().menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue(makeWeek()),
        getSlotById: jest.fn().mockResolvedValue(execSlot),
        getSlotsByWeekId: jest.fn().mockResolvedValue([
          execSlot,
          makeSlot('salad'),
        ]),
        getMealsInWeek: jest.fn().mockResolvedValue([]),
      },
      mealLoader: {
        ...buildDeps().mealLoader,
        getMealById: jest.fn().mockResolvedValue(meal),
      },
      menuWeekPersistor: {
        ...buildDeps().menuWeekPersistor,
        assignMealToSlot: jest.fn().mockResolvedValue({ ...execSlot, mealId: meal.id }),
      },
    })
    const assign = makeUC(deps)

    const result = await assign({
      weekId: WEEK_ID,
      slotId: execSlot.id,
      mealId: meal.id,
    })

    expect(result.meal.meal_id).toBe(meal.id)
    expect(deps.menuWeekPersistor.assignMealToSlot).toHaveBeenCalled()
  })

  it('rejects salad meal on executive slot', async () => {
    const execSlot = makeSlot('executive')
    const salad = makeMeal('salad')
    const deps = buildDeps({
      menuWeekLoader: {
        ...buildDeps().menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue(makeWeek()),
        getSlotById: jest.fn().mockResolvedValue(execSlot),
        getSlotsByWeekId: jest.fn().mockResolvedValue([
          execSlot,
          makeSlot('salad', { mealId: 'existing-salad' }),
        ]),
        getMealsInWeek: jest.fn().mockResolvedValue([]),
      },
      mealLoader: {
        ...buildDeps().mealLoader,
        getMealById: jest.fn().mockResolvedValue(salad),
      },
    })
    const assign = makeUC(deps)

    await expect(
      assign({ weekId: WEEK_ID, slotId: execSlot.id, mealId: salad.id })
    ).rejects.toMatchObject({
      errorCode: 'MEAL_TYPE_SLOT_MISMATCH',
      statusCode: 422,
    })
    expect(deps.menuWeekPersistor.assignMealToSlot).not.toHaveBeenCalled()
  })

  it('rejects second salad on the same day when another salad slot is filled', async () => {
    const saladSlot2 = makeSlot('salad', {
      id: 'slot-salad-2',
      mealId: undefined,
    })
    const saladSlot1 = makeSlot('salad', {
      id: 'slot-salad-1',
      mealId: 'meal-salad-a',
    })
    const saladB = makeMeal('salad', 'meal-salad-b')
    const deps = buildDeps({
      menuWeekLoader: {
        ...buildDeps().menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue(makeWeek()),
        getSlotById: jest.fn().mockResolvedValue(saladSlot2),
        getSlotsByWeekId: jest.fn().mockResolvedValue([
          makeSlot('executive'),
          saladSlot1,
          saladSlot2,
        ]),
        getMealsInWeek: jest.fn().mockResolvedValue([]),
      },
      mealLoader: {
        ...buildDeps().mealLoader,
        getMealById: jest.fn().mockResolvedValue(saladB),
      },
    })
    const assign = makeUC(deps)

    await expect(
      assign({ weekId: WEEK_ID, slotId: saladSlot2.id, mealId: saladB.id })
    ).rejects.toMatchObject({
      errorCode: 'DAY_MEAL_TYPE_ALREADY_ASSIGNED',
      statusCode: 409,
    })
  })
})
