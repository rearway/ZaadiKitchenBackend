export interface CustomerSubscriptionCounts {
  status: string
  planName: string | null
  endDate: string | null
  totalMealDays: number
  deliveredCount: number
  skippedCount: number
  /** Meal days left: totalMealDays − delivered − skipped. Not calendar days. */
  days_remaining: number
  mealsLeft: number
}

export interface CustomerListItem {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  isActive: boolean
  createdAt: Date
  subscriptionStatus: 'active' | 'paused' | 'cancelled' | 'expired' | null
  planName: string | null
  endDate: string | null
  walletBalanceSar: number
  subscription: CustomerSubscriptionCounts | null
}

export interface CustomerAddress {
  buildingName: string
  floor: string | null
  areaName: string
}

export interface CustomerActiveSubscription {
  id: string
  planName: string
  mealType: string
  status: string
  startDate: string
  endDate: string
  /** Calendar days until endDate. Admin days-left uses meal counts instead. */
  daysRemaining: number
  totalMealDays: number
  deliveredCount: number
  skippedCount: number
  days_remaining: number
  mealsLeft: number
  skipDaysUsed: number
  skipDaysAllowed: number
  pauseDaysUsed: number
  pauseDaysAllowed: number
}

export interface AdminCustomerDetail {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  isActive: boolean
  createdAt: Date
  subscription: CustomerActiveSubscription | null
  walletBalanceSar: number
  primaryAddress: CustomerAddress | null
  openIssueCount: number
}

export interface CustomerHistorySubscription {
  id: string
  planName: string
  mealType: string
  status: string
  startDate: string
  endDate: string
  deliveredCount: number
  skippedCount: number
}

export interface CustomerHistoryDelivery {
  id: string
  date: string
  status: string
  mealType: string
  mealName: string | null
}

export interface CustomerHistoryIssue {
  id: string
  subscriptionId: string
  deliveryDate: string
  issueType: string
  description: string | null
  status: string
  creditedAmountSar: number | null
  rejectionReason: string | null
  rejectionNotes: string | null
  createdAt: Date
  resolvedAt: Date | null
  planName: string | null
  mealName: string | null
}

export interface AdminCustomerLoader {
  listCustomers(params: {
    q?: string
    status?: string
    filter?: 'new' | 'churned'
    plan?: string
    page: number
    perPage: number
    todayKsa?: string
  }): Promise<{ customers: CustomerListItem[]; total: number }>

  getCustomerDetail(userId: string): Promise<AdminCustomerDetail | null>

  getCustomerHistory(userId: string): Promise<{
    subscriptions: CustomerHistorySubscription[]
    deliveries: CustomerHistoryDelivery[]
    issues: CustomerHistoryIssue[]
  }>
}

export interface AdminCustomerPersistor {
  deactivateCustomer(userId: string): Promise<void>
}
