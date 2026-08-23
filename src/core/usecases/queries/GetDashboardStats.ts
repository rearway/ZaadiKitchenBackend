import { Deps } from '../../entitygateway/index.js'
function toYYYYMMDD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface GetDashboardStatsOutput {
  activeCustomers: number
  openIssues: number
  menuWeekStatus: {
    weekLabel: string
    statusText: string
  }
}

export function makeUC(deps: Deps) {
  return async function getDashboardStats(): Promise<GetDashboardStatsOutput> {
    const { adminCustomerLoader, deliveryIssueLoader, menuWeekLoader } = deps

    // 1. Active Customers
    // For now, let's just list all customers and filter active ones
    // Or if the loader has a specific method for stats, we use it.
    // We will just do a simple listCustomers with no pagination to get the total
    const customers = await adminCustomerLoader.listCustomers({ page: 1, perPage: 10000 })
    const activeCustomers = customers.customers.filter(c => c.subscriptionStatus === 'active').length

    // 2. Open Issues
    // Get open issues for today
    const today = toYYYYMMDD(new Date())
    const issues = await deliveryIssueLoader.getOpenIssuesByDate(today)
    const openIssues = issues.length

    // 3. Menu Week Status
    // Find the next upcoming week
    const weeks = await menuWeekLoader.getWeeks({})
    const sortedWeeks = weeks.sort((a, b) => new Date(a.dateFrom).getTime() - new Date(b.dateFrom).getTime())
    
    // Find the current or next week
    const upcomingWeek = sortedWeeks.find(w => new Date(w.dateTo) >= new Date()) || sortedWeeks[0]
    
    let menuWeekStatus = {
      weekLabel: 'No menu week found',
      statusText: 'unfilled'
    }

    if (upcomingWeek) {
      const slots = await menuWeekLoader.getSlotsByWeekId(upcomingWeek.id)
      const unfilledSlots = slots.filter(s => !s.mealId).length
      
      const startD = new Date(upcomingWeek.dateFrom)
      const month = startD.toLocaleString('en-US', { month: 'short' })
      const day = startD.getDate()
      
      menuWeekStatus.weekLabel = `Week of ${month} ${day}`
      
      if (unfilledSlots === 0) {
        menuWeekStatus.statusText = 'ready'
      } else {
        menuWeekStatus.statusText = `${unfilledSlots} slots unfilled`
      }
    }

    return {
      activeCustomers,
      openIssues,
      menuWeekStatus
    }
  }
}

export const name = 'GetDashboardStats'
