import { Deps } from '../../entitygateway/index.js'

export interface GetReferralInput {
  userId: string
}

export interface GetReferralOutput {
  referral_code: string
  friends_joined: number
  total_earned_sar: number
  reward_rate_pct: number
  whatsapp_share_text: string
}

export function makeUC(deps: Deps) {
  return async function getReferral(
    input: GetReferralInput
  ): Promise<GetReferralOutput> {
    const { logger, referralLoader } = deps
    try {
      const stats = await referralLoader.getReferralStatsByUserId(input.userId)

      const shareText =
        `Hey! Try Zaadi Kitchen — fresh lunch delivered to your desk every day. ` +
        `Use my code ${stats.referralCode} for SAR 100 off your first plan. 🍛`

      return {
        referral_code: stats.referralCode,
        friends_joined: stats.friendsJoined,
        total_earned_sar: stats.totalEarnedSar,
        reward_rate_pct: 10,
        whatsapp_share_text: shareText,
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
