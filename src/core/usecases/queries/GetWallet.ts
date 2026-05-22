import { Deps } from '../../entitygateway/index.js'

export interface GetWalletInput {
  userId: string
}

export interface GetWalletOutput {
  balance_sar: number
  currency: string
  auto_applied_at_checkout: boolean
}

export function makeUC(deps: Deps) {
  return async function getWallet(
    input: GetWalletInput
  ): Promise<GetWalletOutput> {
    const { logger, walletLoader } = deps
    try {
      const balance = await walletLoader.getBalanceByUserId(input.userId)
      return {
        balance_sar: balance,
        currency: 'SAR',
        auto_applied_at_checkout: true,
      }
    } catch (error) {
      logger.error(
        'Failed to get wallet',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetWallet'
