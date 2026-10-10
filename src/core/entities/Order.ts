import type { MealType } from './CheckoutSession.js'

export type OrderStatus = 'pending' | 'confirmed' | 'failed'

export interface Order {
  id: string
  userId: string
  subscriptionId: string | null
  planId: string
  paymentMethodId: string | null
  mealType: MealType
  mealCount: number
  startDate: string
  planPriceSar: number
  walletCreditSar: number
  promoDiscountSar: number
  promoCode: string | null
  discountLabel: string | null
  totalPaidSar: number
  paymentMethodType: string | null
  paymentMethodLabel: string | null
  gatewayPaymentId: string | null
  status: OrderStatus
  isNewUser: boolean
  createdAt: Date
  updatedAt: Date
}
