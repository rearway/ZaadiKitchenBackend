import type { Deps } from '../../entitygateway/index.js'
import {
  formatMonthLabel,
  getDayLabelShort,
  getMonSunWeekForMonth,
  todayKSA,
} from '../services/revenueUtils.js'

export interface GetRevenueDailyInput {
  month: string
}

export function makeUC(deps: Deps) {
  return async function getRevenueDaily(input: GetRevenueDailyInput) {
    const { revenueLoader } = deps
    const today = todayKSA()
    const weekDates = getMonSunWeekForMonth(input.month, today)
    const [dailyRows, availableMonths] = await Promise.all([
      revenueLoader.getDailyRevenue(weekDates),
      revenueLoader.getAvailableRevenueMonths(input.month.slice(0, 7)),
    ])

    return {
      data: {
        month: input.month,
        month_label: formatMonthLabel(input.month),
        days: dailyRows.map(row => ({
          date: row.date,
          day_label: getDayLabelShort(row.date),
          revenue_sar: Math.round(row.revenueSar),
          is_today: row.date === today,
        })),
        available_months: availableMonths.map(month => ({
          value: month,
          label: formatMonthLabel(month),
        })),
      },
    }
  }
}

export const name = 'GetRevenueDaily'
