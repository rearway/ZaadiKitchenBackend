import { Deps } from '../../entitygateway/index.js'
import type { ReferralHistoryEntry } from '../../entitygateway/Referral.js'

export interface GetReferralInput {
  userId: string
}

export interface GetReferralFriend {
  name: string
  joined_at: string
  plan_name: string | null
  reward_sar: number
}

export interface GetReferralOutput {
  referral_code: string
  friends_joined: number
  total_earned_sar: number
  reward_rate_pct: number
  whatsapp_share_text: string
  referred_friends: GetReferralFriend[]
}

function toFriend(entry: ReferralHistoryEntry): GetReferralFriend {
  return {
    name: entry.referredUserName,
    joined_at: entry.joinedAt.toISOString(),
    plan_name: entry.planName,
    reward_sar: entry.rewardCreditedSar,
  }
}

export function makeUC(deps: Deps) {
  return async function getReferral(
    input: GetReferralInput
  ): Promise<GetReferralOutput> {
    const { logger, referralLoader } = deps
    try {
      const [stats, history] = await Promise.all([
        referralLoader.getReferralStatsByUserId(input.userId),
        referralLoader.getReferralHistory(input.userId),
      ])

      const shareText =
        `Hey! Try Zaadi Kitchen — fresh lunch delivered to your desk every day. ` +
        `Use my code ${stats.referralCode} for 20% off your first plan. 🍛`

      return {
        referral_code: stats.referralCode,
        friends_joined: stats.friendsJoined,
        total_earned_sar: stats.totalEarnedSar,
        reward_rate_pct: 10,
        whatsapp_share_text: shareText,
        referred_friends: history.map(toFriend),
      }
    } catch (error) {
      logger.error(
        'Failed to get referral',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetReferral'
