import { makeUC } from '../AssignMealToSlot'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { MenuSlot } from '../../../entities/MenuSlot.js'
import type { MenuWeek } from '../../../entities/MenuWeek.js'
import type { Meal } from '../../../entities/Meal.js'

const WEEK_ID = 'w2026-42'
const DAYS = [
  { key: 'sun', date: '2026-10-11' },
  { key: 'mon', date: '2026-10-12' },
  { key: 'tue', date: '2026-10-13' },
  { key: 'wed', date: '2026-10-14' },
  { key: 'thu', date: '2026-10-15' },
]

const slotId = (day: string, type: 'exec' | 'salad') =>
  `slot_${WEEK_ID}_${day}_${type}`

function makeWeek(overrides: Partial<MenuWeek> = {}): MenuWeek {
  return {
    id: WEEK_ID,
    weekNumber: 42,
    year: 2026,
    dateFrom: '2026-10-11',
    dateTo: '2026-10-15',
    status: 'draft',
    publishedAt: null,
    publishedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeWeekSlots(): MenuSlot[] {
  return DAYS.flatMap(({ key, date }) =>
    (['executive', 'salad'] as const).map(mealType => ({
      id: slotId(key, mealType === 'executive' ? 'exec' : 'salad'),
      weekId: WEEK_ID,
      deliveryDate: date,
      mealType,
      mealId: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  )
}

function makeMeal(
  id: string,
  mealType: 'executive' | 'salad',
  overrides: Partial<Meal> = {}
): Meal {
  return {
    id,
    nameEn: id,
    nameAr: '',
    mealType,
    status: 'active',
    kcal: 500,
    emoji: '',
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
    ...overrides,
  }
}

/** In-memory week: assign persists into `slots` so later calls see earlier assignments. */
function setup(opts: { week?: MenuWeek | null; meals?: Meal[] } = {}) {
  const slots = makeWeekSlots()
  const meals = new Map((opts.meals ?? []).map(m => [m.id, m]))
  const week = opts.week === undefined ? makeWeek() : opts.week

  const base = buildDeps()
  const deps = buildDeps({
    menuWeekLoader: {
      ...base.menuWeekLoader,
      getWeekById: jest.fn().mockImplementation(async (id: string) =>
        week && week.id === id ? week : null
      ),
      getSlotById: jest.fn().mockImplementation(async (id: string) =>
        slots.find(s => s.id === id) ?? null
      ),
      getSlotsByWeekId: jest.fn().mockImplementation(async (id: string) =>
        slots.filter(s => s.weekId === id).map(s => ({ ...s }))
      ),
    },
    mealLoader: {
      ...base.mealLoader,
      getMealById: jest.fn().mockImplementation(async (id: string) =>
        meals.get(id) ?? null
      ),
      getMealsByIds: jest.fn().mockImplementation(async (ids: string[]) =>
        ids.map(id => meals.get(id)).filter((m): m is Meal => !!m)
      ),
    },
    menuWeekPersistor: {
      ...base.menuWeekPersistor,
      assignMealToSlot: jest
        .fn()
        .mockImplementation(async (id: string, mealId: string) => {
          const slot = slots.find(s => s.id === id)!
          slot.mealId = mealId
          return { ...slot }
        }),
    },
  })

  const assign = makeUC(deps)
  return { deps, slots, assign }
}

describe('AssignMealToSlot', () => {
  const execA = makeMeal('exec-A', 'executive')
  const execB = makeMeal('exec-B', 'executive')
  const saladA = makeMeal('salad-A', 'salad')
  const saladB = makeMeal('salad-B', 'salad')
  const draftExec = makeMeal('exec-draft', 'executive', { status: 'draft' })
  const allMeals = [execA, execB, saladA, saladB, draftExec]

  describe('allowed', () => {
    it('assigns an active executive meal to the executive slot', async () => {
      const { assign, deps } = setup({ meals: allMeals })

      const result = await assign({
        weekId: WEEK_ID,
        slotId: slotId('sun', 'exec'),
        mealId: execA.id,
      })

      expect(result.slot_id).toBe(slotId('sun', 'exec'))
      expect(result.meal).toMatchObject({ meal_id: execA.id, meal_type: 'executive' })
      expect(result.week_fill_status).toEqual({
        filled_slots: 1,
        total_slots: 10,
        publish_ready: false,
      })
      expect(deps.menuWeekPersistor.assignMealToSlot).toHaveBeenCalledWith(
        slotId('sun', 'exec'),
        execA.id
      )
    })

    it('allows the same meal on multiple days in the same week', async () => {
      const { assign, slots } = setup({ meals: allMeals })

      await assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: execA.id })
      await assign({ weekId: WEEK_ID, slotId: slotId('wed', 'exec'), mealId: execA.id })
      await assign({ weekId: WEEK_ID, slotId: slotId('thu', 'exec'), mealId: execA.id })

      const withA = slots.filter(s => s.mealId === execA.id).map(s => s.id)
      expect(withA).toEqual([
        slotId('sun', 'exec'),
        slotId('wed', 'exec'),
        slotId('thu', 'exec'),
      ])
    })

    it('allows the same salad on different days', async () => {
      const { assign } = setup({ meals: allMeals })

      await assign({ weekId: WEEK_ID, slotId: slotId('mon', 'salad'), mealId: saladA.id })
      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('tue', 'salad'), mealId: saladA.id })
      ).resolves.toMatchObject({ meal: { meal_id: saladA.id } })
    })

    it('allows a salad in the executive slot when the day has no salad', async () => {
      const { assign } = setup({ meals: allMeals })

      const result = await assign({
        weekId: WEEK_ID,
        slotId: slotId('sun', 'exec'),
        mealId: saladA.id,
      })

      expect(result.meal_type).toBe('executive')
      expect(result.meal.meal_type).toBe('salad')
    })

    it('allows an executive meal in the salad slot', async () => {
      const { assign } = setup({ meals: allMeals })

      await assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: execA.id })
      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'salad'), mealId: execB.id })
      ).resolves.toMatchObject({ meal: { meal_id: execB.id } })
    })

    it('allows two executive meals on the same day', async () => {
      const { assign } = setup({ meals: allMeals })

      await assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: execA.id })
      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'salad'), mealId: execA.id })
      ).resolves.toBeDefined()
    })

    it('allows replacing the salad in the same slot with another salad', async () => {
      const { assign, slots } = setup({ meals: allMeals })

      await assign({ weekId: WEEK_ID, slotId: slotId('sun', 'salad'), mealId: saladA.id })
      await assign({ weekId: WEEK_ID, slotId: slotId('sun', 'salad'), mealId: saladB.id })

      expect(slots.find(s => s.id === slotId('sun', 'salad'))?.mealId).toBe(saladB.id)
    })

    it('reports publish_ready once all 10 slots are filled', async () => {
      const { assign } = setup({ meals: allMeals })

      let last
      for (const { key } of DAYS) {
        await assign({ weekId: WEEK_ID, slotId: slotId(key, 'exec'), mealId: execA.id })
        last = await assign({ weekId: WEEK_ID, slotId: slotId(key, 'salad'), mealId: saladA.id })
      }

      expect(last!.week_fill_status).toEqual({
        filled_slots: 10,
        total_slots: 10,
        publish_ready: true,
      })
    })
  })

  describe('one salad per day', () => {
    it('rejects a second salad in the executive slot when the salad slot has one', async () => {
      const { assign, deps } = setup({ meals: allMeals })
      await assign({ weekId: WEEK_ID, slotId: slotId('sun', 'salad'), mealId: saladA.id })
      jest.mocked(deps.menuWeekPersistor.assignMealToSlot).mockClear()

      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: saladB.id })
      ).rejects.toMatchObject({
        errorCode: 'DAY_SALAD_ALREADY_ASSIGNED',
        statusCode: 409,
        details: {
          delivery_date: '2026-10-11',
          existing_slot_id: slotId('sun', 'salad'),
          existing_meal_name: saladA.nameEn,
        },
      })
      expect(deps.menuWeekPersistor.assignMealToSlot).not.toHaveBeenCalled()
    })

    it('rejects a salad in the salad slot when the executive slot holds a salad', async () => {
      const { assign } = setup({ meals: allMeals })
      await assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: saladA.id })

      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'salad'), mealId: saladB.id })
      ).rejects.toMatchObject({ errorCode: 'DAY_SALAD_ALREADY_ASSIGNED' })
    })

    it('rejects the same salad twice on the same day', async () => {
      const { assign } = setup({ meals: allMeals })
      await assign({ weekId: WEEK_ID, slotId: slotId('sun', 'salad'), mealId: saladA.id })

      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: saladA.id })
      ).rejects.toMatchObject({ errorCode: 'DAY_SALAD_ALREADY_ASSIGNED' })
    })

    it('does not count salads on other days', async () => {
      const { assign } = setup({ meals: allMeals })
      await assign({ weekId: WEEK_ID, slotId: slotId('mon', 'salad'), mealId: saladA.id })

      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'salad'), mealId: saladB.id })
      ).resolves.toBeDefined()
    })
  })

  describe('validation', () => {
    it('rejects a draft meal', async () => {
      const { assign, deps } = setup({ meals: allMeals })

      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: draftExec.id })
      ).rejects.toMatchObject({ errorCode: 'MEAL_IS_DRAFT', statusCode: 422 })
      expect(deps.menuWeekPersistor.assignMealToSlot).not.toHaveBeenCalled()
    })

    it('rejects an unknown meal', async () => {
      const { assign } = setup({ meals: allMeals })

      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: 'nope' })
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rejects an unknown week', async () => {
      const { assign } = setup({ week: null, meals: allMeals })

      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: execA.id })
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('rejects an unknown slot', async () => {
      const { assign } = setup({ meals: allMeals })

      await expect(
        assign({ weekId: WEEK_ID, slotId: 'slot_missing', mealId: execA.id })
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it.each(['published', 'past'] as const)('rejects assign on a %s week', async status => {
      const { assign, deps } = setup({ week: makeWeek({ status }), meals: allMeals })

      await expect(
        assign({ weekId: WEEK_ID, slotId: slotId('sun', 'exec'), mealId: execA.id })
      ).rejects.toMatchObject({ errorCode: 'SLOT_NOT_EDITABLE' })
      expect(deps.menuWeekPersistor.assignMealToSlot).not.toHaveBeenCalled()
    })
  })
})
