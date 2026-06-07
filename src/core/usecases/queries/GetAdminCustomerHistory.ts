import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'

export interface GetAdminCustomerHistoryInput {
  customerId: string
}

export function makeUC(deps: Deps) {
  return async function getAdminCustomerHistory(
    input: GetAdminCustomerHistoryInput
  ) {
    const { logger, adminCustomerLoader } = deps

    try {
      const customer = await adminCustomerLoader.getCustomerDetail(
        input.customerId
      )

      if (!customer) {
        throw new ResourceNotFoundError('Customer', input.customerId)
      }

      const history = await adminCustomerLoader.getCustomerHistory(
        input.customerId
      )

      return { data: history }
    } catch (error) {
      logger.error(
        'Failed to get admin customer history',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminCustomerHistory'
