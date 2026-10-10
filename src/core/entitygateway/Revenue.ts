export interface RevenueSummaryData {
  mrrAmountSar: number
  mrrPriorAmountSar: number
  activeCount: number
  newTodayCount: number
  churnedCount: number
  subscribersByPlan: Array<{ planSlug: string; count: number }>
  avgSkipRate: number
  skipRateChange: number
  saladMealPct: number
}

export interface RevenueDailyDay {
  date: string
  revenueSar: number
}

export interface RevenueLoader {
  getSummary(todayKsa: string): Promise<RevenueSummaryData>

  getDailyRevenue(
    dates: string[]
  ): Promise<RevenueDailyDay[]>

  getAvailableRevenueMonths(currentMonth: string): Promise<string[]>
}
