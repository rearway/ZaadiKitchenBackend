import type { MealType } from './CheckoutSession.js'

export type DeliveryDayStatus =
  | 'scheduled'
  | 'skipped'
  | 'delivered'
  | 'past_cutoff'
  | 'paused'

export interface DeliveryDay {
  id: string
  subscriptionId: string
  userId: string
  date: string
  mealType: MealType
  mealName: string | null
  status: DeliveryDayStatus
  deliveredAt: Date | null
  createdAt: Date
  updatedAt: Date
}
