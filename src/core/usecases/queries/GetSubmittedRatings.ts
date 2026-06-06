import { Deps } from '../../entitygateway/index.js'
import { MealRating } from '../../entities/MealRating.js'

export interface GetSubmittedRatingsInput {
  userId: string
  page?: number
  perPage?: number
}

export interface GetSubmittedRatingsOutput {
  data: {
    ratings: MealRating[]
    pagination: { page: number; perPage: number; total: number; totalPages: number }
  }
}

export function makeUC(deps: Deps) {
  return async function getSubmittedRatings(
    input: GetSubmittedRatingsInput
  ): Promise<GetSubmittedRatingsOutput> {
    const { logger, mealRatingLoader } = deps

    try {
      const page = input.page ?? 1
      const perPage = Math.min(input.perPage ?? 20, 50)

      const { ratings, total } = await mealRatingLoader.getRatingsByUser(input.userId, page, perPage)

      return {
        data: {
          ratings,
          pagination: {
            page,
            perPage,
            total,
            totalPages: Math.ceil(total / perPage),
          },
        },
      }
    } catch (error) {
      logger.error('Failed to get submitted ratings', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetSubmittedRatings'
