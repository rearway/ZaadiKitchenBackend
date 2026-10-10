import { getPublishedWeeksBlockingMealEdit } from '../getMealPublishedEditBlockers.js'
import { getSaudiWorkWeekBounds, getNextSaudiWorkWeekBounds } from '../weekUtils.js'
import type { MenuWeekLoader } from '../../../entitygateway/MenuWeek.js'

describe('getPublishedWeeksBlockingMealEdit', () => {
  const referenceDate = new Date('2026-09-14T10:00:00Z') // Monday
  const mealId = 'meal-uuid-1'
  const thisWeek = getSaudiWorkWeekBounds(referenceDate)
  const nextWeek = getNextSaudiWorkWeekBounds(referenceDate)

  function makeLoader(slots: Awaited<ReturnType<MenuWeekLoader['getMenuForDateRange']>>) {
    return {
      getMenuForDateRange: jest.fn().mockResolvedValue(slots),
    } as unknown as MenuWeekLoader
  }

  it('queries only the current and next work week date range', async () => {
    const loader = makeLoader([])
    await getPublishedWeeksBlockingMealEdit(mealId, loader, referenceDate)

    expect(loader.getMenuForDateRange).toHaveBeenCalledWith(
      thisWeek.dateFrom,
      nextWeek.dateTo
    )
  })

  it('returns published week ids where the meal is assigned', async () => {
    const loader = makeLoader([
      { weekId: thisWeek.weekId, mealId, deliveryDate: thisWeek.dateFrom, mealType: 'executive', id: 's1', createdAt: new Date(), updatedAt: new Date() },
      { weekId: nextWeek.weekId, mealId, deliveryDate: nextWeek.dateFrom, mealType: 'executive', id: 's2', createdAt: new Date(), updatedAt: new Date() },
    ])

    const result = await getPublishedWeeksBlockingMealEdit(mealId, loader, referenceDate)

    expect(result).toEqual([thisWeek.weekId, nextWeek.weekId])
  })

  it('returns an empty list when the meal is not in current or next published weeks', async () => {
    const loader = makeLoader([
      { weekId: 'w2026-10', mealId: 'other-meal', deliveryDate: thisWeek.dateFrom, mealType: 'executive', id: 's1', createdAt: new Date(), updatedAt: new Date() },
    ])

    const result = await getPublishedWeeksBlockingMealEdit(mealId, loader, referenceDate)

    expect(result).toEqual([])
  })

  it('deduplicates week ids when the meal appears on multiple days', async () => {
    const loader = makeLoader([
      { weekId: thisWeek.weekId, mealId, deliveryDate: thisWeek.deliveryDates[0], mealType: 'executive', id: 's1', createdAt: new Date(), updatedAt: new Date() },
      { weekId: thisWeek.weekId, mealId, deliveryDate: thisWeek.deliveryDates[1], mealType: 'executive', id: 's2', createdAt: new Date(), updatedAt: new Date() },
    ])

    const result = await getPublishedWeeksBlockingMealEdit(mealId, loader, referenceDate)

    expect(result).toEqual([thisWeek.weekId])
  })
})
