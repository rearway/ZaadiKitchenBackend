import type { Deps } from '../../entitygateway/index.js'
import { mealTypeNameEn } from '../../../shared/meal-display.js'
import { getSaudiWorkWeekBounds, getNextSaudiWorkWeekBounds, formatWeekRangeLabel } from '../services/weekUtils.js'
import { loadMealTypeDisplays } from '../services/mealDisplayNames.js'

export interface GetMenuMetaInput {
  userId: string
}

export interface GetMenuMetaOutput {
  this_week: {
    label: string
    date_from: string
    date_to: string
  }
  next_week: {
    label: string
    date_from: string
    date_to: string
  }
  filter_options: Array<{
    id: string
    label: string
    is_default: boolean
  }>
}

export function makeUC(deps: Deps) {
  return async function getMenuMeta(_input: GetMenuMetaInput): Promise<GetMenuMetaOutput> {
    const { logger } = deps

    try {
      const displays = await loadMealTypeDisplays(deps.appSettingsLoader)
      const now = new Date()
      const thisWeek = getSaudiWorkWeekBounds(now)
      const nextWeek = getNextSaudiWorkWeekBounds(now)

      const thisRange = formatWeekRangeLabel(thisWeek.dateFrom, thisWeek.dateTo)
      const nextRange = formatWeekRangeLabel(nextWeek.dateFrom, nextWeek.dateTo)

      return {
        this_week: {
          label: `This week · ${thisRange}`,
          date_from: thisWeek.dateFrom,
          date_to: thisWeek.dateTo,
        },
        next_week: {
          label: `Next week · ${nextRange}`,
          date_from: nextWeek.dateFrom,
          date_to: nextWeek.dateTo,
        },
        filter_options: [
          { id: 'all', label: 'All', is_default: true },
          { id: 'executive', label: mealTypeNameEn('executive', displays), is_default: false },
          { id: 'salad', label: mealTypeNameEn('salad', displays), is_default: false },
        ],
      }
    } catch (error) {
      logger.error('GetMenuMeta failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetMenuMeta'
