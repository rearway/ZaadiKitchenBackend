import { Deps } from '../../entitygateway/index.js'
import {
  formatBillingPlanPeriod,
  formatBillingShortDate,
} from '../services/billingFormatUtils.js'

export interface GetPaymentTransactionsInput {
  userId: string
  page?: number
  perPage?: number
}

export interface GetPaymentTransactionsOutput {
  transactions: Array<{
    id: string
    category: 'subscription_payment'
    type: 'debit'
    amount_sar: number
    label: string
    description: string | null
    payment_method_label: string | null
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
  return async function getPaymentTransactions(
    input: GetPaymentTransactionsInput
  ): Promise<GetPaymentTransactionsOutput> {
    const { logger, orderLoader } = deps
    try {
      const page = input.page ?? 1
      const perPage = Math.min(input.perPage ?? 20, 50)

      const { orders, total } =
        await orderLoader.getConfirmedOrdersForBilling(input.userId, {
          page,
          perPage,
        })

      return {
        transactions: orders.map(o => ({
          id: o.orderId,
          category: 'subscription_payment' as const,
          type: 'debit' as const,
          amount_sar: o.totalPaidSar,
          label: `${o.planName} · ${formatBillingPlanPeriod(o.createdAt)}`,
          description: formatBillingShortDate(o.createdAt),
          payment_method_label: o.paymentMethodLabel,
          created_at: o.createdAt.toISOString(),
        })),
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      }
    } catch (error) {
      logger.error(
        'Failed to get payment transactions',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetPaymentTransactions'
