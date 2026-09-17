import type { MenuWeekLoader } from '../../entitygateway/MenuWeek.js'
import { getSaudiWorkWeekBounds, getNextSaudiWorkWeekBounds } from './weekUtils.js'

/**
 * Returns published menu week IDs (current + next Saudi work week only) where
 * the meal is assigned. Past published weeks do not block edits.
 */
export async function getPublishedWeeksBlockingMealEdit(
  mealId: string,
  menuWeekLoader: MenuWeekLoader,
  referenceDate: Date = new Date()
): Promise<string[]> {
  const thisWeek = getSaudiWorkWeekBounds(referenceDate)
  const nextWeek = getNextSaudiWorkWeekBounds(referenceDate)

  const slots = await menuWeekLoader.getMenuForDateRange(
    thisWeek.dateFrom,
    nextWeek.dateTo
  )

  return [
    ...new Set(
      slots
        .filter(s => s.mealId === mealId)
        .map(s => s.weekId)
    ),
  ]
}
