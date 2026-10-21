import { makeUC } from '../PublishMenuWeek'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { MenuSlot } from '../../../entities/MenuSlot.js'

const WEEK_ID = 'w2026-42'

function slot(overrides: Partial<MenuSlot> = {}): MenuSlot {
  return {
    id: 's1',
    weekId: WEEK_ID,
    deliveryDate: '2026-10-11',
    mealType: 'executive',
    mealId: 'e1',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('PublishMenuWeek', () => {
  it('rejects publish when a stream is missing', async () => {
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({
          id: WEEK_ID,
          status: 'draft',
          dateFrom: '2026-10-11',
        }),
        getSlotsByWeekId: jest.fn().mockResolvedValue([
          slot(),
          slot({ id: 's2', mealType: 'salad', mealId: undefined, isDefault: false }),
        ]),
      },
      mealLoader: {
        ...base.mealLoader,
        getMealsByIds: jest.fn().mockResolvedValue([{ id: 'e1', status: 'active' }]),
      },
    })

    await expect(
      makeUC(deps)({ weekId: WEEK_ID, publishedByUserId: 'admin-1' })
    ).rejects.toMatchObject({ errorCode: 'WEEK_NOT_COMPLETE', statusCode: 409 })
    expect(deps.menuWeekPersistor.publishWeek).not.toHaveBeenCalled()
  })
})
