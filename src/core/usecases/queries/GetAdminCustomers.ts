import type { Deps } from '../../entitygateway/index.js'

export interface GetAdminCustomersInput {
  q?: string
  status?: string
  page?: number
  perPage?: number
}

export function makeUC(deps: Deps) {
  return async function getAdminCustomers(input: GetAdminCustomersInput) {
    const { logger, adminCustomerLoader } = deps

    try {
      const page = input.page ?? 1
      const perPage = Math.min(input.perPage ?? 20, 50)

      const { customers, total } = await adminCustomerLoader.listCustomers({
        q: input.q,
        status: input.status,
        page,
        perPage,
      })

      return {
        data: {
          customers,
          pagination: {
            page,
            perPage,
            total,
            totalPages: Math.ceil(total / perPage),
          },
        },
      }
    } catch (error) {
      logger.error(
        'Failed to list admin customers',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminCustomers'
