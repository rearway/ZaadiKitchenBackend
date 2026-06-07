import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError, ValidationError } from '../../../shared/errors/index.js'
import { UserRole } from '../../../codecs/enums.js'

export interface AdminCreditWalletInput {
  customerId: string
  amountSar: number
  note: string
}

export function makeUC(deps: Deps) {
  return async function adminCreditWallet(input: AdminCreditWalletInput) {
    const { logger, userLoader, walletPersistor } = deps

    try {
      const user = await userLoader.getUserById(input.customerId)

      if (!user || user.role !== UserRole.CUSTOMER) {
        throw new ResourceNotFoundError('Customer', input.customerId)
      }

      if (input.amountSar <= 0 || input.amountSar > 500) {
        throw new ValidationError('Amount must be between 1 and 500 SAR')
      }

      await walletPersistor.createTransaction({
        userId: input.customerId,
        type: 'credit',
        amountSar: input.amountSar,
        label: 'Admin Credit',
        description: input.note,
        referenceId: null,
      })

      return { message: 'Wallet credited successfully' }
    } catch (error) {
      logger.error(
        'Failed to credit wallet',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'AdminCreditWallet'
