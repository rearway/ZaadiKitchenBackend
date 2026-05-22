export interface UserReferral {
  id: string
  referrerUserId: string
  referredUserId: string
  referralCode: string
  rewardCreditedSar: number
  isRewarded: boolean
  createdAt: Date
  updatedAt: Date
}
