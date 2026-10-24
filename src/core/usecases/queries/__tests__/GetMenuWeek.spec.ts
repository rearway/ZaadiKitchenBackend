import { makeUC } from '../GetMenuWeek'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { MenuSlot } from '../../../entities/MenuSlot.js'
import type { Meal } from '../../../entities/Meal.js'

describe('GetMenuWeek', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not create the week two ahead before Thursday 18:00 Asia/Riyadh', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-22T14:59:59.000Z'))
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue(null),
      },
    })

    await expect(makeUC(deps)({ weekId: 'w2026-44' })).rejects.toMatchObject({
      errorCode: 'RESOURCE_NOT_FOUND',
    })
    expect(deps.menuWeekPersistor.ensureWeekExists).not.toHaveBeenCalled()
  })

  it('creates the week two ahead at Thursday 18:00 Asia/Riyadh', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-22T15:00:00.000Z'))
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({
          id: 'w2026-44',
          weekNumber: 44,
          status: 'draft',
        }),
        getSlotsByWeekId: jest.fn().mockResolvedValue([]),
      },
    })

    await makeUC(deps)({ weekId: 'w2026-44' })

    expect(deps.menuWeekPersistor.ensureWeekExists).toHaveBeenCalledWith(
      expect.objectContaining({ weekId: 'w2026-44', dateFrom: '2026-11-01' })
    )
  })

  it('returns grouped slots, defaults, and add flags', async () => {
    const slots: MenuSlot[] = [
      {
        id: 'exec-1',
        weekId: 'w2026-42',
        deliveryDate: '2026-10-11',
        mealType: 'executive',
        mealId: 'e1',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'salad-1',
        weekId: 'w2026-42',
        deliveryDate: '2026-10-11',
        mealType: 'salad',
        mealId: 's1',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    const meals: Meal[] = [
      {
        id: 'e1',
        nameEn: 'Exec',
        mealType: 'executive',
        status: 'updated',
        kcal: 500,
        emoji: '🍛',
        erpCode: 'E1',
        timesServed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 's1',
        nameEn: 'Salad',
        mealType: 'salad',
        status: 'active',
        kcal: 300,
        emoji: '🥗',
        erpCode: 'S1',
        timesServed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({
          id: 'w2026-42',
          weekNumber: 42,
          status: 'draft',
        }),
        getSlotsByWeekId: jest.fn().mockResolvedValue(slots),
      },
      mealLoader: {
        ...base.mealLoader,
        getMealsByIds: jest.fn().mockResolvedValue(meals),
      },
    })

    const result = await makeUC(deps)({ weekId: 'w2026-42' })
    const day = result.days[0]

    expect(day.executive_slots).toHaveLength(1)
    expect(day.salad_slots).toHaveLength(1)
    expect(day.default_meal_id).toEqual({ executive: 'e1', salad: 's1' })
    expect(day.can_add_executive).toBe(true)
    expect(day.can_add_salad).toBe(true)
    expect(day.executive_slots[0].is_default).toBe(true)
    expect(day.executive_slots[0].meal?.status).toBe('updated')
    expect(result.is_editable).toBe(true)
    expect(result.publish_ready).toBe(true)
  })

  it('keeps published weeks editable so admin can add or replace dishes', async () => {
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({
          id: 'w2026-42',
          weekNumber: 42,
          status: 'published',
        }),
        getSlotsByWeekId: jest.fn().mockResolvedValue([
          {
            id: 'exec-1',
            weekId: 'w2026-42',
            deliveryDate: '2026-10-11',
            mealType: 'executive',
            mealId: 'e1',
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      },
    })

    const result = await makeUC(deps)({ weekId: 'w2026-42' })
    expect(result.is_editable).toBe(true)
    expect(result.days[0].can_add_executive).toBe(true)
    expect(result.days[0].executive_slots[0].is_editable).toBe(true)
  })

  it('locks past weeks', async () => {
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({
          id: 'w2026-42',
          weekNumber: 42,
          status: 'past',
        }),
        getSlotsByWeekId: jest.fn().mockResolvedValue([
          {
            id: 'exec-1',
            weekId: 'w2026-42',
            deliveryDate: '2026-10-11',
            mealType: 'executive',
            mealId: 'e1',
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      },
    })

    const result = await makeUC(deps)({ weekId: 'w2026-42' })
    expect(result.is_editable).toBe(false)
    expect(result.days[0].can_add_executive).toBe(false)
    expect(result.days[0].executive_slots[0].is_editable).toBe(false)
  })
})
