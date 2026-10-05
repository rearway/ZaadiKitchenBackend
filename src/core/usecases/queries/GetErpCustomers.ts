import type { Deps } from '../../entitygateway/index.js'
import type { ErpCustomerRow } from '../../entitygateway/ErpIntegration.js'
import { clampPagination } from '../services/erpDateUtils.js'

export interface GetErpCustomersInput {
  offset?: number
  limit?: number
}

export interface GetErpCustomersOutput {
  data: ErpCustomerRow[]
  pagination: { offset: number; limit: number; total: number }
}

export function makeUC(deps: Deps) {
  return async function getErpCustomers(
    input: GetErpCustomersInput
  ): Promise<GetErpCustomersOutput> {
    const { logger, erpIntegrationLoader } = deps
    try {
      const { offset, limit } = clampPagination(input.offset, input.limit)
      const { rows, total } = await erpIntegrationLoader.getCustomers(offset, limit)
      return { data: rows, pagination: { offset, limit, total } }
    } catch (error) {
      logger.error('GetErpCustomers failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetErpCustomers'
