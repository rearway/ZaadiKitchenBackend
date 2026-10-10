import { Deps } from '../../entitygateway/index.js'

export interface GetWalletTransactionsInput {
  userId: string
  page?: number
  perPage?: number
}

export interface GetWalletTransactionsOutput {
  transactions: Array<{
    id: string
    type: string
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
  return async function getWalletTransactions(
    input: GetWalletTransactionsInput
  ): Promise<GetWalletTransactionsOutput> {
    const { logger, walletLoader } = deps
    try {
      const page = input.page ?? 1
      const perPage = Math.min(input.perPage ?? 20, 50)

      const { transactions, total } =
        await walletLoader.getTransactionsByUserId(input.userId, {
          page,
          perPage,
        })

      return {
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount_sar: t.amountSar,
          label: t.label,
          description: t.description ?? null,
          created_at: t.createdAt.toISOString(),
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
        'Failed to get wallet transactions',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetWalletTransactions'
