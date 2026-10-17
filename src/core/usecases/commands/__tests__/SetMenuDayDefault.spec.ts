import { makeUC } from '../SetMenuDayDefault'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { MenuSlot } from '../../../entities/MenuSlot.js'

const WEEK_ID = 'w2026-42'
const SUN = '2026-10-11'

describe('SetMenuDayDefault', () => {
  it('sets default to an assigned dish on that stream/day', async () => {
    const slots: MenuSlot[] = [
      {
        id: 's1',
        weekId: WEEK_ID,
        deliveryDate: SUN,
        mealType: 'executive',
        mealId: 'exec-a',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 's2',
        weekId: WEEK_ID,
        deliveryDate: SUN,
        mealType: 'executive',
        mealId: 'exec-b',
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({
          id: WEEK_ID,
          status: 'draft',
          dateFrom: SUN,
          dateTo: '2026-10-15',
        }),
        getSlotsByWeekId: jest.fn().mockResolvedValue(slots),
      },
      menuWeekPersistor: {
        ...base.menuWeekPersistor,
        setDayDefault: jest.fn().mockResolvedValue({ ...slots[1], isDefault: true }),
      },
    })

    const result = await makeUC(deps)({
      weekId: WEEK_ID,
      date: SUN,
      mealType: 'executive',
      mealId: 'exec-b',
    })

    expect(deps.menuWeekPersistor.setDayDefault).toHaveBeenCalledWith(
      WEEK_ID,
      SUN,
      'executive',
      'exec-b'
    )
    expect(result.default_meal_id).toBe('exec-b')
  })

  it('rejects a meal that is not assigned that day', async () => {
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({ id: WEEK_ID, status: 'draft', dateFrom: SUN, dateTo: '2026-10-15' }),
        getSlotsByWeekId: jest.fn().mockResolvedValue([]),
      },
    })

    await expect(
      makeUC(deps)({ weekId: WEEK_ID, date: SUN, mealType: 'executive', mealId: 'missing' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
