export type PromoCodeType = 'referral' | 'promo'

export interface PromoCode {
  id: string
  code: string
  type: PromoCodeType
  discountSar: number
  ownerUserId: string | null
  validForPlanSlug: string | null
  maxUses: number | null
  timesUsed: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
