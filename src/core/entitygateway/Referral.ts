import type { UserReferral } from '../entities/UserReferral.js'

export interface ReferralHistoryEntry {
  referredUserName: string
  joinedAt: Date
  planName: string | null
  rewardCreditedSar: number
}

export interface ReferralRewardBillingRow {
  referralId: string
  referredUserName: string
  rewardCreditedSar: number
  referredPlanPriceSar: number
  creditedAt: Date
}

export interface ReferralLoader {
  getReferralStatsByUserId(userId: string): Promise<{
    referralCode: string
    friendsJoined: number
    totalEarnedSar: number
  }>
  getReferralHistory(userId: string): Promise<ReferralHistoryEntry[]>
  getReferralRewardsForBilling(
    userId: string,
    pagination: { page: number; perPage: number }
  ): Promise<{ rewards: ReferralRewardBillingRow[]; total: number }>
  getReferralByCode(code: string): Promise<UserReferral | null>
  hasUserBeenReferred(referredUserId: string): Promise<boolean>
}

export interface ReferralPersistor {
  createReferral(
    input: Omit<UserReferral, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<UserReferral>
  markRewarded(id: string, rewardSar: number): Promise<void>
  ensureReferralCode(userId: string, fullName: string): Promise<string>
}
