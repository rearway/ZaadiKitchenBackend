import { Deps } from '../../entitygateway/index.js'

export interface GetOutOfZoneRequestsInput {
  page?: number
  perPage?: number
}

export type GetOutOfZoneRequestsOutput = {
  message: string
  data: {
    total_requests: number
    areas: Array<{
      area_name: string
      request_count: number
      first_requested: string
      last_requested: string
    }>
    pagination: {
      page: number
      per_page: number
      total: number
      total_pages: number
    }
  }
}

export function makeUC(deps: Deps) {
  return async function getOutOfZoneRequests(
    input: GetOutOfZoneRequestsInput
  ): Promise<GetOutOfZoneRequestsOutput> {
    const { logger, outOfZoneInterestLoader } = deps
    try {
      const page = input.page ?? 1
      const perPage = Math.min(input.perPage ?? 20, 100)

      const { areas, total, totalRequests } =
        await outOfZoneInterestLoader.getAggregatedRequests(page, perPage)

      return {
        message: 'Out-of-zone requests retrieved successfully',
        data: {
          total_requests: totalRequests,
          areas,
          pagination: {
            page,
            per_page: perPage,
            total,
            total_pages: Math.ceil(total / perPage),
          },
        },
      }
    } catch (error) {
      logger.error(
        'Failed to get out-of-zone requests',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetOutOfZoneRequests'
