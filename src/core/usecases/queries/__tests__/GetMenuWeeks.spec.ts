import { makeUC } from '../GetMenuWeeks'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { MenuWeek } from '../../../entities/MenuWeek.js'
import type { EnsureWeekParams } from '../../../entitygateway/MenuWeek.js'

const JUST_BEFORE = new Date('2026-10-22T14:59:59.000Z') // Thu 17:59:59 Asia/Riyadh
const AT_CUTOFF = new Date('2026-10-22T15:00:00.000Z') // Thu 18:00:00 Asia/Riyadh
const JUST_AFTER = new Date('2026-10-22T15:00:01.000Z') // Thu 18:00:01 Asia/Riyadh
const FRIDAY_OPEN = new Date('2026-10-22T21:00:00.000Z') // Fri 00:00:00 Asia/Riyadh

const CURRENT = '2026-10-18'
const NEXT = '2026-10-25'
const TWO_AHEAD = '2026-11-01'

function week(dateFrom: string, dateTo: string, id: string): MenuWeek {
  return {
    id,
    weekNumber: 1,
    year: 2026,
    dateFrom,
    dateTo,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

const FIXTURES: Record<string, MenuWeek> = {
  '2026-10-18': week(CURRENT, '2026-10-22', 'w2026-42'),
  '2026-10-25': week(NEXT, '2026-10-29', 'w2026-43'),
  '2026-11-01': week(TWO_AHEAD, '2026-11-05', 'w2026-44'),
}

function setup() {
  const deps = buildDeps()
  jest
    .mocked(deps.menuWeekPersistor.ensureWeekExists)
    .mockImplementation(async (params: EnsureWeekParams) => ({
      week: FIXTURES[params.dateFrom],
      slots: [],
    }))
  jest
    .mocked(deps.menuWeekLoader.getWeekById)
    .mockImplementation(async (id: string) => {
      return Object.values(FIXTURES).find(w => w.id === id) ?? null
    })
  jest.mocked(deps.menuWeekLoader.getSlotsByWeekId).mockResolvedValue([])
  return deps
}

function ensuredFrom(deps: ReturnType<typeof setup>): string[] {
  return jest
    .mocked(deps.menuWeekPersistor.ensureWeekExists)
    .mock.calls.map(call => call[0].dateFrom)
}

describe('GetMenuWeeks admin horizon', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not ensure the week two ahead before Thursday 18:00 Asia/Riyadh', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(JUST_BEFORE)
    const deps = setup()

    const result = await makeUC(deps)({})

    expect(ensuredFrom(deps)).toEqual([CURRENT, NEXT])
    expect(result.weeks.map(w => w.date_from)).toEqual([CURRENT, NEXT])
    expect(
      result.weeks.find(w => w.date_from === CURRENT)?.is_current_week
    ).toBe(true)
    expect(result.weeks.find(w => w.date_from === CURRENT)?.is_editable).toBe(
      true
    )
  })

  it('ensures and lists two weeks ahead at Thursday 18:00 Asia/Riyadh', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(AT_CUTOFF)
    const deps = setup()

    const result = await makeUC(deps)({})

    expect(ensuredFrom(deps)).toEqual([CURRENT, NEXT, TWO_AHEAD])
    expect(result.weeks.map(w => w.date_from)).toEqual([
      CURRENT,
      NEXT,
      TWO_AHEAD,
    ])
  })

  it('ensures and lists two weeks ahead after Thursday 18:00 Asia/Riyadh', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(JUST_AFTER)
    const deps = setup()

    const result = await makeUC(deps)({})

    expect(ensuredFrom(deps)).toEqual([CURRENT, NEXT, TWO_AHEAD])
    expect(result.weeks.map(w => w.date_from)).toEqual([
      CURRENT,
      NEXT,
      TWO_AHEAD,
    ])
  })

  it('lists the next two work weeks when Friday opens in Asia/Riyadh', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(FRIDAY_OPEN)
    const deps = setup()

    const result = await makeUC(deps)({})

    expect(ensuredFrom(deps)).toEqual(expect.arrayContaining([NEXT, TWO_AHEAD]))
    expect(ensuredFrom(deps)).not.toEqual([CURRENT, NEXT])
    expect(result.weeks.map(w => w.date_from)).toEqual([NEXT, TWO_AHEAD])
    expect(result.weeks[0].is_current_week).toBe(true)
  })
})
