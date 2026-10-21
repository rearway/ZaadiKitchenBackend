import { makeUC } from '../ClearMenuSlot'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { MenuSlot } from '../../../entities/MenuSlot.js'

const WEEK_ID = 'w2026-42'
const SUN = '2026-10-11'

function slot(overrides: Partial<MenuSlot> = {}): MenuSlot {
  return {
    id: 's1',
    weekId: WEEK_ID,
    deliveryDate: SUN,
    mealType: 'executive',
    mealId: 'exec-a',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('ClearMenuSlot', () => {
  it('blocks clearing a default when another dish remains in the stream', async () => {
    const slots = [
      slot({ id: 's1', isDefault: true, mealId: 'exec-a' }),
      slot({ id: 's2', isDefault: false, mealId: 'exec-b' }),
    ]
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({ id: WEEK_ID, status: 'draft' }),
        getSlotById: jest.fn().mockResolvedValue(slots[0]),
        getSlotsByWeekId: jest.fn().mockResolvedValue(slots),
      },
    })

    await expect(
      makeUC(deps)({ weekId: WEEK_ID, slotId: 's1' })
    ).rejects.toMatchObject({ errorCode: 'CANNOT_CLEAR_DEFAULT', statusCode: 409 })
    expect(deps.menuWeekPersistor.clearSlot).not.toHaveBeenCalled()
  })

  it('deletes an extra slot after clearing it', async () => {
    const extra = slot({ id: 'slot_w2026-42_sun_exec_2', isDefault: false, mealId: 'exec-b' })
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({ id: WEEK_ID, status: 'draft' }),
        getSlotById: jest.fn().mockResolvedValue(extra),
        getSlotsByWeekId: jest.fn().mockResolvedValue([
          slot({ id: 'slot_w2026-42_sun_exec', isDefault: true }),
          extra,
        ]),
      },
    })

    await makeUC(deps)({ weekId: WEEK_ID, slotId: extra.id })

    expect(deps.menuWeekPersistor.clearSlot).toHaveBeenCalledWith(extra.id)
    expect(deps.menuWeekPersistor.deleteSlot).toHaveBeenCalledWith(extra.id)
  })

  it('allows clearing an extra slot on a published week', async () => {
    const extra = slot({ id: 'slot_w2026-42_sun_exec_2', isDefault: false, mealId: 'exec-b' })
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({ id: WEEK_ID, status: 'published' }),
        getSlotById: jest.fn().mockResolvedValue(extra),
        getSlotsByWeekId: jest.fn().mockResolvedValue([
          slot({ id: 'slot_w2026-42_sun_exec', isDefault: true, mealId: 'exec-a' }),
          extra,
        ]),
      },
    })

    await makeUC(deps)({ weekId: WEEK_ID, slotId: extra.id })

    expect(deps.menuWeekPersistor.clearSlot).toHaveBeenCalledWith(extra.id)
  })

  it('blocks clearing the last dish of a stream on a published week', async () => {
    const only = slot({ id: 's1', isDefault: true, mealId: 'exec-a' })
    const base = buildDeps()
    const deps = buildDeps({
      menuWeekLoader: {
        ...base.menuWeekLoader,
        getWeekById: jest.fn().mockResolvedValue({ id: WEEK_ID, status: 'published' }),
        getSlotById: jest.fn().mockResolvedValue(only),
        getSlotsByWeekId: jest.fn().mockResolvedValue([only]),
      },
    })

    await expect(
      makeUC(deps)({ weekId: WEEK_ID, slotId: 's1' })
    ).rejects.toMatchObject({
      errorCode: 'CANNOT_CLEAR_LAST_STREAM_MEAL',
      statusCode: 409,
    })
    expect(deps.menuWeekPersistor.clearSlot).not.toHaveBeenCalled()
  })
})
