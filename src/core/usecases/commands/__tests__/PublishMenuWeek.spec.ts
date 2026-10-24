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

const TWO_AHEAD = '2026-11-01'
const TWO_AHEAD_ID = 'w2026-44'
const CURRENT_FROM = '2026-10-18'
const NEXT_FROM = '2026-10-25'

function readyDeps(dateFrom: string, weekId: string) {
  const base = buildDeps()
  return buildDeps({
    menuWeekLoader: {
      ...base.menuWeekLoader,
      getWeekById: jest.fn().mockResolvedValue({
        id: weekId,
        status: 'draft',
        dateFrom,
        dateTo: dateFrom,
      }),
      getSlotsByWeekId: jest.fn().mockResolvedValue([
        slot({
          weekId,
          deliveryDate: dateFrom,
          mealType: 'executive',
          mealId: 'e1',
          isDefault: true,
        }),
        slot({
          id: 's2',
          weekId,
          deliveryDate: dateFrom,
          mealType: 'salad',
          mealId: 's1',
          isDefault: true,
        }),
      ]),
    },
    mealLoader: {
      ...base.mealLoader,
      getMealsByIds: jest.fn().mockResolvedValue([
        { id: 'e1', status: 'active' },
        { id: 's1', status: 'active' },
      ]),
    },
    menuWeekPersistor: {
      ...base.menuWeekPersistor,
      publishWeek: jest.fn().mockResolvedValue({
        id: weekId,
        status: 'published',
        publishedAt: new Date('2026-10-22T15:00:00.000Z'),
      }),
    },
    userLoader: {
      ...base.userLoader,
      getUserById: jest.fn().mockResolvedValue({ fullName: 'Admin' }),
    },
  })
}

describe('PublishMenuWeek', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('rejects publishing the week two ahead just before Thursday 18:00 Asia/Riyadh', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-22T14:59:59.000Z'))
    const deps = readyDeps(TWO_AHEAD, TWO_AHEAD_ID)

    await expect(
      makeUC(deps)({ weekId: TWO_AHEAD_ID, publishedByUserId: 'admin-1' })
    ).rejects.toMatchObject({
      errorCode: 'WEEK_NOT_YET_UNLOCKED',
      statusCode: 422,
      message: expect.stringContaining('Thursday 18:00 Asia/Riyadh'),
    })
    expect(deps.menuWeekPersistor.publishWeek).not.toHaveBeenCalled()
  })

  it('publishes the week two ahead at Thursday 18:00 Asia/Riyadh', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-22T15:00:00.000Z'))
    const deps = readyDeps(TWO_AHEAD, TWO_AHEAD_ID)

    const result = await makeUC(deps)({
      weekId: TWO_AHEAD_ID,
      publishedByUserId: 'admin-1',
    })

    expect(result.status).toBe('published')
    expect(deps.menuWeekPersistor.publishWeek).toHaveBeenCalledWith(
      TWO_AHEAD_ID,
      'admin-1'
    )
  })

  it('publishes the week two ahead after Thursday 18:00 Asia/Riyadh', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-22T15:00:01.000Z'))
    const deps = readyDeps(TWO_AHEAD, TWO_AHEAD_ID)

    await makeUC(deps)({ weekId: TWO_AHEAD_ID, publishedByUserId: 'admin-1' })

    expect(deps.menuWeekPersistor.publishWeek).toHaveBeenCalledWith(
      TWO_AHEAD_ID,
      'admin-1'
    )
  })

  it('still publishes the current week before the Thursday cutoff', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-22T14:59:59.000Z'))
    const deps = readyDeps(CURRENT_FROM, 'w2026-42')

    await makeUC(deps)({ weekId: 'w2026-42', publishedByUserId: 'admin-1' })

    expect(deps.menuWeekPersistor.publishWeek).toHaveBeenCalledWith(
      'w2026-42',
      'admin-1'
    )
  })

  it('still publishes the immediate next week before the Thursday cutoff', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-10-22T14:59:59.000Z'))
    const deps = readyDeps(NEXT_FROM, 'w2026-43')

    await makeUC(deps)({ weekId: 'w2026-43', publishedByUserId: 'admin-1' })

    expect(deps.menuWeekPersistor.publishWeek).toHaveBeenCalledWith(
      'w2026-43',
      'admin-1'
    )
  })

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
        getSlotsByWeekId: jest
          .fn()
          .mockResolvedValue([
            slot(),
            slot({
              id: 's2',
              mealType: 'salad',
              mealId: undefined,
              isDefault: false,
            }),
          ]),
      },
      mealLoader: {
        ...base.mealLoader,
        getMealsByIds: jest
          .fn()
          .mockResolvedValue([{ id: 'e1', status: 'active' }]),
      },
    })

    await expect(
      makeUC(deps)({ weekId: WEEK_ID, publishedByUserId: 'admin-1' })
    ).rejects.toMatchObject({ errorCode: 'WEEK_NOT_COMPLETE', statusCode: 409 })
    expect(deps.menuWeekPersistor.publishWeek).not.toHaveBeenCalled()
  })
})
