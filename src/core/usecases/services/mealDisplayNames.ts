import type { AppSettingsLoader } from '../../entitygateway/AppSettings.js'
import {
  applyMealTypeDisplays,
  DEFAULT_MEAL_TYPES,
  parseMealTypes,
  type MealTypeDisplay,
} from '../../../shared/meal-display.js'

/** Reads `meal_types` and caches them. Falls back to defaults if the table is empty or missing. */
export async function loadMealTypeDisplays(
  loader: AppSettingsLoader
): Promise<MealTypeDisplay[]> {
  try {
    const rows = await loader.getAll()
    const parsed = parseMealTypes(rows.find(row => row.key === 'meal_types')?.value)
    const displays = parsed ?? DEFAULT_MEAL_TYPES.map(item => ({ ...item }))
    applyMealTypeDisplays(displays)
    return displays
  } catch {
    const displays = DEFAULT_MEAL_TYPES.map(item => ({ ...item }))
    applyMealTypeDisplays(displays)
    return displays
  }
}
