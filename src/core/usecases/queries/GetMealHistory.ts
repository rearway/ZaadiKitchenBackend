import { Deps } from '../../entitygateway/index.js'
import { DeliveryHistoryEntry } from '../../entitygateway/DeliveryDay.js'

export interface GetMealHistoryInput {
  userId: string
  page?: number
  perPage?: number
  period?: string
}

export interface GetMealHistoryOutput {
  data: {
    entries: DeliveryHistoryEntry[]
    pagination: { page: number; perPage: number; total: number; totalPages: number }
  }
}

export function makeUC(deps: Deps) {
  return async function getMealHistory(
    input: GetMealHistoryInput
  ): Promise<GetMealHistoryOutput> {
    const { logger, deliveryDayLoader } = deps

    try {
      const page = input.page ?? 1
      const perPage = Math.min(input.perPage ?? 20, 50)

      const { days, total } = await deliveryDayLoader.getDeliveryHistory(
        input.userId,
        page,
        perPage,
        input.period
      )

      return {
        data: {
          entries: days,
          pagination: {
            page,
            perPage,
            total,
            totalPages: Math.ceil(total / perPage),
          },
        },
      }
    } catch (error) {
      logger.error('Failed to get meal history', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetMealHistory'
