import type { Deps } from '../../entitygateway/index.js'
import type { ErpPaymentRow } from '../../entitygateway/ErpIntegration.js'
import { clampPagination, parseErpDateInput } from '../services/erpDateUtils.js'

export interface GetErpPaymentsInput {
  dateFrom: string
  dateTo: string
  offset?: number
  limit?: number
}

export interface GetErpPaymentsOutput {
  data: ErpPaymentRow[]
  pagination: { offset: number; limit: number; total: number }
}

export function makeUC(deps: Deps) {
  return async function getErpPayments(
    input: GetErpPaymentsInput
  ): Promise<GetErpPaymentsOutput> {
    const { logger, erpIntegrationLoader } = deps
    try {
      const dateFrom = parseErpDateInput(input.dateFrom, 'dateFrom')
      const dateTo = parseErpDateInput(input.dateTo, 'dateTo')
      const { offset, limit } = clampPagination(input.offset, input.limit)
      const { rows, total } = await erpIntegrationLoader.getPayments(
        dateFrom,
        dateTo,
        offset,
        limit
      )
      return { data: rows, pagination: { offset, limit, total } }
    } catch (error) {
      logger.error('GetErpPayments failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetErpPayments'
