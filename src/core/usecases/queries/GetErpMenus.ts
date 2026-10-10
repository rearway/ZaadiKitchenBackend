import type { Deps } from '../../entitygateway/index.js'
import type { ErpMenuRow } from '../../entitygateway/ErpIntegration.js'
import { clampPagination } from '../services/erpDateUtils.js'

export interface GetErpMenusInput {
  offset?: number
  limit?: number
}

export interface GetErpMenusOutput {
  data: ErpMenuRow[]
  pagination: { offset: number; limit: number; total: number }
}

export function makeUC(deps: Deps) {
  return async function getErpMenus(input: GetErpMenusInput): Promise<GetErpMenusOutput> {
    const { logger, erpIntegrationLoader } = deps
    try {
      const { offset, limit } = clampPagination(input.offset, input.limit)
      const { rows, total } = await erpIntegrationLoader.getMenus(offset, limit)
      return { data: rows, pagination: { offset, limit, total } }
    } catch (error) {
      logger.error('GetErpMenus failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetErpMenus'
