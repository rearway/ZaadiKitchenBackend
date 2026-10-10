import { Deps } from '../../entitygateway/index.js'
import {
  mapPaymentOrderToBillingHistory,
  mapReferralRewardToBillingHistory,
  mapWalletToBillingHistory,
  sortBillingHistoryTransactions,
  type BillingHistoryTransaction,
} from '../services/billingTransactionMappers.js'

export interface GetBillingTransactionsInput {
  userId: string
  page?: number
  perPage?: number
}

export interface GetBillingTransactionsOutput {
  transactions: BillingHistoryTransaction[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

/** Max rows pulled per source when merging (page × per_page capped). */
const MAX_FETCH_PER_SOURCE = 500

export function makeUC(deps: Deps) {
  return async function getBillingTransactions(
    input: GetBillingTransactionsInput
  ): Promise<GetBillingTransactionsOutput> {
    const { logger, walletLoader, orderLoader, referralLoader } = deps
    try {
      const page = input.page ?? 1
      const perPage = Math.min(input.perPage ?? 20, 50)
      const fetchLimit = Math.min(page * perPage, MAX_FETCH_PER_SOURCE)
      const pagination = { page: 1, perPage: fetchLimit }

      const [wallet, payments, referrals] = await Promise.all([
        walletLoader.getTransactionsByUserId(input.userId, pagination),
        orderLoader.getConfirmedOrdersForBilling(input.userId, pagination),
        referralLoader.getReferralRewardsForBilling(input.userId, pagination),
      ])

      const merged = sortBillingHistoryTransactions([
        ...wallet.transactions.map(mapWalletToBillingHistory),
        ...payments.orders.map(mapPaymentOrderToBillingHistory),
        ...referrals.rewards.map(mapReferralRewardToBillingHistory),
      ])

      const total = wallet.total + payments.total + referrals.total
      const offset = (page - 1) * perPage
      const transactions = merged.slice(offset, offset + perPage)

      return {
        transactions,
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      }
    } catch (error) {
      logger.error(
        'Failed to get billing transactions',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetBillingTransactions'
