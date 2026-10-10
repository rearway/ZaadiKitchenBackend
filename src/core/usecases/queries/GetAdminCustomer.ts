import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'

export interface GetAdminCustomerInput {
  customerId: string
}

export function makeUC(deps: Deps) {
  return async function getAdminCustomer(input: GetAdminCustomerInput) {
    const { logger, adminCustomerLoader } = deps

    try {
      const customer = await adminCustomerLoader.getCustomerDetail(input.customerId)

      if (!customer) {
        throw new ResourceNotFoundError('Customer', input.customerId)
      }

      return { data: customer }
    } catch (error) {
      logger.error(
        'Failed to get admin customer',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminCustomer'
