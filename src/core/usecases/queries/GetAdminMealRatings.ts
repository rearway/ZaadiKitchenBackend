import type { Deps } from '../../entitygateway/index.js'
import type { RatingTag } from '../../entities/MealRating.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'

export interface GetAdminMealRatingsInput {
  mealId: string
  page?: number
  perPage?: number
}

export interface GetAdminMealRatingsOutput {
  meal_id: string
  average_rating: number | null
  rating_count: number
  ratings: Array<{
    id: string
    user_id: string
    phone: string | null
    full_name: string | null
    stars: number
    tags: RatingTag[]
    delivery_date: string
    created_at: Date
  }>
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export function makeUC(deps: Deps) {
  return async function getAdminMealRatings(
    input: GetAdminMealRatingsInput
  ): Promise<GetAdminMealRatingsOutput> {
    const { logger, mealLoader, mealRatingLoader } = deps

    try {
      const meal = await mealLoader.getMealById(input.mealId)
      if (!meal) throw new ResourceNotFoundError('Meal', input.mealId)

      const page = Math.max(1, input.page ?? 1)
      const perPage = Math.min(50, Math.max(1, input.perPage ?? 20))

      const { ratings, total, averageRating } =
        await mealRatingLoader.getRatingsByMeal(input.mealId, page, perPage)

      return {
        meal_id: input.mealId,
        average_rating: averageRating,
        rating_count: total,
        ratings: ratings.map(rating => ({
          id: rating.id,
          user_id: rating.userId,
          phone: rating.phone,
          full_name: rating.fullName,
          stars: rating.stars,
          tags: rating.tags,
          delivery_date: rating.deliveryDate,
          created_at: rating.createdAt,
        })),
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      }
    } catch (error) {
      logger.error(
        'GetAdminMealRatings failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminMealRatings'
