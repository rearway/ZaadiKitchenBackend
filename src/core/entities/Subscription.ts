import type { MealType } from './CheckoutSession.js'

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired'

export interface Subscription {
  id: string
  userId: string
  orderId: string
  planId: string
  mealType: MealType
  status: SubscriptionStatus
  totalMealDays: number
  deliveredCount: number
  skippedCount: number
  startDate: string
  endDate: string
  skipDaysAllowed: number
  skipDaysUsed: number
  pauseDaysAllowed: number
  pauseDaysUsed: number
  pausedFrom: string | null
  pausedUntil: string | null
  pauseCeilingDate: string | null
  createdAt: Date
  updatedAt: Date
}
