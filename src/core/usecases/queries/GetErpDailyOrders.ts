import type { Deps } from '../../entitygateway/index.js'
import type { ErpDailyOrderRow } from '../../entitygateway/ErpIntegration.js'
import { clampPagination, parseErpDateInput } from '../services/erpDateUtils.js'
import { resolveDailyOrdersDate } from '../services/erpCutoffUtils.js'

export interface GetErpDailyOrdersInput {
  date?: string
  offset?: number
  limit?: number
}

export interface GetErpDailyOrdersOutput {
  meta: {
    requestedDate: string | null
    resolvedDeliveryDate: string
    cutoffAt: string
    frozen: boolean
    cutoffApplied: boolean
    timezone: string
  }
  data: ErpDailyOrderRow[]
  pagination: { offset: number; limit: number; total: number }
}

export function makeUC(deps: Deps) {
  return async function getErpDailyOrders(
    input: GetErpDailyOrdersInput
  ): Promise<GetErpDailyOrdersOutput> {
    const { logger, erpIntegrationLoader, publicHolidayLoader } = deps
    try {
      const requestedDate = input.date
        ? parseErpDateInput(input.date, 'date')
        : null
      const year = new Date().getFullYear()
      const [h1, h2] = await Promise.all([
        publicHolidayLoader.getHolidaysByYear(year),
        publicHolidayLoader.getHolidaysByYear(year + 1),
      ])
      const holidayDates = new Set([...h1, ...h2].map(h => h.date))
      const meta = resolveDailyOrdersDate(requestedDate, holidayDates)
      const { offset, limit } = clampPagination(input.offset, input.limit)
      const { rows, total } = await erpIntegrationLoader.getDailyOrders(
        meta.resolvedDeliveryDate,
        offset,
        limit
      )
      return {
        meta: {
          requestedDate: meta.requestedDate,
          resolvedDeliveryDate: meta.resolvedDeliveryDate,
          cutoffAt: meta.cutoffAt,
          frozen: meta.frozen,
          cutoffApplied: meta.cutoffApplied,
          timezone: meta.timezone,
        },
        data: rows,
        pagination: { offset, limit, total },
      }
    } catch (error) {
      logger.error(
        'GetErpDailyOrders failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetErpDailyOrders'
