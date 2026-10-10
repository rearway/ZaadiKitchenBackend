import type { ConfirmedOrderBillingRow } from '../../entitygateway/Order.js'
import type { ReferralRewardBillingRow } from '../../entitygateway/Referral.js'
import type { WalletTransaction } from '../../entities/WalletTransaction.js'
import {
  formatBillingPlanPeriod,
  formatBillingShortDate,
} from './billingFormatUtils.js'

const REFERRAL_REWARD_RATE_PCT = 10

export type BillingHistoryCategory =
  | 'wallet_ledger'
  | 'subscription_payment'
  | 'referral_reward'

export interface BillingHistoryTransaction {
  id: string
  category: BillingHistoryCategory
  type: string
  amount_sar: number
  label: string
  description: string | null
  payment_method_label: string | null
  created_at: string
}

export function mapWalletToBillingHistory(
  t: WalletTransaction
): BillingHistoryTransaction {
  return {
    id: t.id,
    category: 'wallet_ledger',
    type: t.type,
    amount_sar: t.amountSar,
    label: t.label,
    description: t.description ?? null,
    payment_method_label: null,
    created_at: t.createdAt.toISOString(),
  }
}

export function mapPaymentOrderToBillingHistory(
  o: ConfirmedOrderBillingRow
): BillingHistoryTransaction {
  return {
    id: o.orderId,
    category: 'subscription_payment',
    type: 'debit',
    amount_sar: o.totalPaidSar,
    label: `${o.planName} · ${formatBillingPlanPeriod(o.createdAt)}`,
    description: formatBillingShortDate(o.createdAt),
    payment_method_label: o.paymentMethodLabel,
    created_at: o.createdAt.toISOString(),
  }
}

export function mapReferralRewardToBillingHistory(
  r: ReferralRewardBillingRow
): BillingHistoryTransaction {
  const baseSar =
    r.referredPlanPriceSar > 0
      ? r.referredPlanPriceSar
      : Math.round(r.rewardCreditedSar / (REFERRAL_REWARD_RATE_PCT / 100))
  const shortDate = formatBillingShortDate(r.creditedAt)
  return {
    id: r.referralId,
    category: 'referral_reward',
    type: 'credit',
    amount_sar: r.rewardCreditedSar,
    label: `Referral reward — ${r.referredUserName}`,
    description: `${shortDate} · ${REFERRAL_REWARD_RATE_PCT}% of SAR ${baseSar}`,
    payment_method_label: null,
    created_at: r.creditedAt.toISOString(),
  }
}

export function sortBillingHistoryTransactions(
  items: BillingHistoryTransaction[]
): BillingHistoryTransaction[] {
  return [...items].sort((a, b) => {
    const byTime = b.created_at.localeCompare(a.created_at)
    if (byTime !== 0) return byTime
    const byCategory = a.category.localeCompare(b.category)
    if (byCategory !== 0) return byCategory
    return a.id.localeCompare(b.id)
  })
}
