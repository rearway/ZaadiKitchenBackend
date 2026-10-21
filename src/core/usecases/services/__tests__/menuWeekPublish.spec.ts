import {
  canAddStreamSlot,
  evaluateWeekPublishReadiness,
  isWeekEditable,
  MAX_DISHES_PER_STREAM,
  slotWithMealOnDate,
} from '../menuWeekPublish'
import type { MenuSlot } from '../../../entities/MenuSlot.js'

function slot(
  date: string,
  mealType: 'executive' | 'salad',
  overrides: Partial<MenuSlot> = {}
): MenuSlot {
  return {
    id: `slot_${date}_${mealType}`,
    weekId: 'w2026-42',
    deliveryDate: date,
    mealType,
    mealId: undefined,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const SUN = '2026-10-11'
const MON = '2026-10-12'

describe('evaluateWeekPublishReadiness', () => {
  it('is ready when every day has min 1+1 filled with defaults', () => {
    const slots = [SUN, MON].flatMap(date => [
      slot(date, 'executive', { mealId: `exec-${date}`, isDefault: true }),
      slot(date, 'salad', { mealId: `salad-${date}`, isDefault: true }),
    ])

    expect(evaluateWeekPublishReadiness(slots)).toMatchObject({
      publishReady: true,
      blockedReason: null,
      filledDays: 2,
      totalDays: 2,
    })
  })

  it('allows extra dishes up to 3 per stream', () => {
    const slots = [
      slot(SUN, 'executive', { mealId: 'e1', isDefault: true, id: 'e-1' }),
      slot(SUN, 'executive', { mealId: 'e2', id: 'e-2' }),
      slot(SUN, 'executive', { mealId: 'e3', id: 'e-3' }),
      slot(SUN, 'salad', { mealId: 's1', isDefault: true, id: 's-1' }),
    ]

    expect(evaluateWeekPublishReadiness(slots).publishReady).toBe(true)
    expect(canAddStreamSlot(slots, SUN, 'executive')).toBe(false)
    expect(MAX_DISHES_PER_STREAM).toBe(3)
  })

  it('does not require empty extra slots to be filled', () => {
    const slots = [
      slot(SUN, 'executive', { mealId: 'e1', isDefault: true, id: 'e-1' }),
      slot(SUN, 'executive', { id: 'e-2' }),
      slot(SUN, 'salad', { mealId: 's1', isDefault: true }),
    ]

    expect(evaluateWeekPublishReadiness(slots).publishReady).toBe(true)
  })

  it('blocks when a stream is missing', () => {
    const slots = [
      slot(SUN, 'executive', { mealId: 'e1', isDefault: true }),
      slot(SUN, 'salad'),
    ]

    expect(evaluateWeekPublishReadiness(slots)).toMatchObject({
      publishReady: false,
      blockedReason: 'Sun: Salad missing',
    })
  })

  it('blocks when the default is not set on a filled stream', () => {
    const slots = [
      slot(SUN, 'executive', { mealId: 'e1' }),
      slot(SUN, 'salad', { mealId: 's1', isDefault: true }),
    ]

    expect(evaluateWeekPublishReadiness(slots).blockedReason).toBe(
      'Sun: Executive default not set'
    )
  })

  it('blocks a draft meal on a filled slot', () => {
    const slots = [
      slot(SUN, 'executive', { mealId: 'e1', isDefault: true }),
      slot(SUN, 'salad', { mealId: 's1', isDefault: true }),
    ]

    expect(
      evaluateWeekPublishReadiness(slots, [
        { id: 'e1', status: 'draft' },
        { id: 's1', status: 'active' },
      ]).blockedReason
    ).toBe('Sun: Draft meal on menu')
  })
})

describe('isWeekEditable', () => {
  it('allows draft and published weeks, not past', () => {
    expect(isWeekEditable('draft')).toBe(true)
    expect(isWeekEditable('published')).toBe(true)
    expect(isWeekEditable('past')).toBe(false)
  })
})

describe('slotWithMealOnDate', () => {
  it('finds the same dish on that date in either stream', () => {
    const slots = [
      slot(SUN, 'executive', { mealId: 'e1', id: 'e-1' }),
      slot(SUN, 'salad', { mealId: 's1', id: 's-1' }),
    ]
    expect(slotWithMealOnDate(slots, SUN, 'e1')?.id).toBe('e-1')
    expect(slotWithMealOnDate(slots, SUN, 'e1', 'e-1')).toBeUndefined()
    expect(slotWithMealOnDate(slots, MON, 'e1')).toBeUndefined()
  })
})
