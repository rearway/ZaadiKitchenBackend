import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'
import { UserRole } from '../../../codecs/enums.js'

export interface DeactivateCustomerInput {
  customerId: string
}

export function makeUC(deps: Deps) {
  return async function deactivateCustomer(input: DeactivateCustomerInput) {
    const { logger, userLoader, adminCustomerPersistor } = deps

    try {
      const user = await userLoader.getUserById(input.customerId)

      if (!user || user.role !== UserRole.CUSTOMER) {
        throw new ResourceNotFoundError('Customer', input.customerId)
      }

      await adminCustomerPersistor.deactivateCustomer(input.customerId)

      return { message: 'Customer deactivated successfully' }
    } catch (error) {
      logger.error(
        'Failed to deactivate customer',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'DeactivateCustomer'
