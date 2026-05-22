export type CheckoutSessionStatus = 'active' | 'expired' | 'confirmed'
export type MealType = 'executive' | 'salad'

export interface CheckoutSession {
  id: string
  userId: string
  planId: string
  mealType: MealType
  basePriceSar: number
  walletCreditSar: number
  promoDiscountSar: number
  totalDueSar: number
  promoCode: string | null
  promoAttemptCount: number
  promoLocked: boolean
  status: CheckoutSessionStatus
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}
