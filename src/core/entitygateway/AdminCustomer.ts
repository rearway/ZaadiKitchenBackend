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
  daysRemaining: number
  deliveredCount: number
  skippedCount: number
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
  deliveryDate: string
  issueType: string
  status: string
  creditedAmountSar: number | null
  rejectionReason: string | null
  createdAt: Date
}

export interface AdminCustomerLoader {
  listCustomers(params: {
    q?: string
    status?: string
    page: number
    perPage: number
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
