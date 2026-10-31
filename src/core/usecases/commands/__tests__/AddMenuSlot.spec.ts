import { makeUC } from '../AddMenuSlot'
import { makeSlotId } from '../../services/weekUtils'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { MenuSlot } from '../../../entities/MenuSlot.js'
import type { MenuWeek } from '../../../entities/MenuWeek.js'
import type { Meal } from '../../../entities/Meal.js'

const WEEK_ID = 'w2026-42'
const SUN = '2026-10-11'

function makeWeek(overrides: Partial<MenuWeek> = {}): MenuWeek {
  return {
    id: WEEK_ID,
    weekNumber: 42,
    year: 2026,
    dateFrom: '2026-10-11',
    dateTo: '2026-10-15',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function baseSlots(): MenuSlot[] {
  return (['executive', 'salad'] as const).map(mealType => ({
    id: `slot_${WEEK_ID}_sun_${mealType === 'executive' ? 'exec' : 'salad'}`,
    weekId: WEEK_ID,
    deliveryDate: SUN,
    mealType,
    mealId: undefined,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}

function extraSlot(
  index: number,
  mealType: 'executive' | 'salad'
): MenuSlot {
  return {
    id: makeSlotId(WEEK_ID, SUN, mealType, index),
    weekId: WEEK_ID,
    deliveryDate: SUN,
    mealType,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function setup(
  slots: MenuSlot[],
  meals: Meal[] = [],
  week: MenuWeek = makeWeek()
) {
  const mealMap = new Map(meals.map(m => [m.id, m]))
  const base = buildDeps()
  const deps = buildDeps({
    menuWeekLoader: {
      ...base.menuWeekLoader,
      getWeekById: jest.fn().mockResolvedValue(week),
      getSlotsByWeekId: jest.fn().mockImplementation(async () => slots.map(s => ({ ...s }))),
    },
    mealLoader: {
      ...base.mealLoader,
      getMealById: jest.fn().mockImplementation(async (id: string) => mealMap.get(id) ?? null),
    },
    menuWeekPersistor: {
      ...base.menuWeekPersistor,
      createSlot: jest.fn().mockImplementation(async input => {
        const created: MenuSlot = {
          id: input.id,
          weekId: input.weekId,
          deliveryDate: input.deliveryDate,
          mealType: input.mealType,
          mealId: input.mealId ?? undefined,
          isDefault: input.isDefault ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        slots.push(created)
        return created
      }),
      assignMealToSlot: jest.fn().mockImplementation(async (id: string, mealId: string) => {
        const slot = slots.find(s => s.id === id)!
        slot.mealId = mealId
        return { ...slot }
      }),
    },
  })
  return { add: makeUC(deps), deps, slots }
}

describe('AddMenuSlot', () => {
  it('adds a second executive slot', async () => {
    const { add, deps } = setup(baseSlots())

    const result = await add({ weekId: WEEK_ID, date: SUN, mealType: 'executive' })

    expect(result.slot_id).toBe(makeSlotId(WEEK_ID, SUN, 'executive', 2))
    expect(deps.menuWeekPersistor.createSlot).toHaveBeenCalled()
  })

  it('adds a fourth slot on each stream', async () => {
    for (const mealType of ['executive', 'salad'] as const) {
      const slots = [
        ...baseSlots(),
        extraSlot(2, mealType),
        extraSlot(3, mealType),
      ]
      const { add } = setup(slots)

      const result = await add({ weekId: WEEK_ID, date: SUN, mealType })

      expect(result.slot_id).toBe(makeSlotId(WEEK_ID, SUN, mealType, 4))
    }
  })

  it('rejects a fifth slot on each stream', async () => {
    for (const mealType of ['executive', 'salad'] as const) {
      const slots = [
        ...baseSlots(),
        extraSlot(2, mealType),
        extraSlot(3, mealType),
        extraSlot(4, mealType),
      ]
      const { add } = setup(slots)

      await expect(
        add({ weekId: WEEK_ID, date: SUN, mealType })
      ).rejects.toMatchObject({
        errorCode: 'DAY_MEAL_TYPE_LIMIT',
        statusCode: 409,
      })
    }
  })

  it('allows adding a slot on a published week', async () => {
    const { add } = setup(baseSlots(), [], makeWeek({ status: 'published' }))

    await expect(
      add({ weekId: WEEK_ID, date: SUN, mealType: 'executive' })
    ).resolves.toMatchObject({ meal_type: 'executive' })
  })

  it('rejects adding a dish that is already on that date', async () => {
    const meal: Meal = {
      id: 'exec-a',
      nameEn: 'Biryani',
      mealType: 'executive',
      kcal: 500,
      emoji: '🍛',
      status: 'active',
      erpCode: 'ERP-A',
      timesServed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const slots = baseSlots()
    slots[0].mealId = meal.id
    const { add } = setup(slots, [meal])

    await expect(
      add({
        weekId: WEEK_ID,
        date: SUN,
        mealType: 'executive',
        mealId: meal.id,
      })
    ).rejects.toMatchObject({ errorCode: 'MEAL_ALREADY_ON_DAY', statusCode: 409 })
  })
})
