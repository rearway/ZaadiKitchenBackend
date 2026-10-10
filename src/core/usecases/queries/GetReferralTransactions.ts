import { Deps } from '../../entitygateway/index.js'
import { formatBillingShortDate } from '../services/billingFormatUtils.js'

const REFERRAL_REWARD_RATE_PCT = 10

export interface GetReferralTransactionsInput {
  userId: string
  page?: number
  perPage?: number
}

export interface GetReferralTransactionsOutput {
  transactions: Array<{
    id: string
    category: 'referral_reward'
    type: 'credit'
    amount_sar: number
    label: string
    description: string | null
    created_at: string
  }>
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export function makeUC(deps: Deps) {
  return async function getReferralTransactions(
    input: GetReferralTransactionsInput
  ): Promise<GetReferralTransactionsOutput> {
    const { logger, referralLoader } = deps
    try {
      const page = input.page ?? 1
      const perPage = Math.min(input.perPage ?? 20, 50)

      const { rewards, total } =
        await referralLoader.getReferralRewardsForBilling(input.userId, {
          page,
          perPage,
        })

      return {
        transactions: rewards.map(r => {
          const baseSar =
            r.referredPlanPriceSar > 0
              ? r.referredPlanPriceSar
              : Math.round(r.rewardCreditedSar / (REFERRAL_REWARD_RATE_PCT / 100))
          const shortDate = formatBillingShortDate(r.creditedAt)
          return {
            id: r.referralId,
            category: 'referral_reward' as const,
            type: 'credit' as const,
            amount_sar: r.rewardCreditedSar,
            label: `Referral reward — ${r.referredUserName}`,
            description: `${shortDate} · ${REFERRAL_REWARD_RATE_PCT}% of SAR ${baseSar}`,
            created_at: r.creditedAt.toISOString(),
          }
        }),
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      }
    } catch (error) {
      logger.error(
        'Failed to get referral transactions',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetReferralTransactions'
