import { Deps } from '../../entitygateway/index.js'
import { PendingRatingDay } from '../../entitygateway/MealRating.js'

export interface GetPendingRatingsInput {
  userId: string
}

export interface GetPendingRatingsOutput {
  data: PendingRatingDay[]
}

export function makeUC(deps: Deps) {
  return async function getPendingRatings(
    input: GetPendingRatingsInput
  ): Promise<GetPendingRatingsOutput> {
    const { logger, subscriptionLoader, mealRatingLoader } = deps

    try {
      const subscription = await subscriptionLoader.getActiveSubscriptionByUserId(input.userId)
      if (!subscription) return { data: [] }

      const days = await mealRatingLoader.getPendingRatingDays(input.userId, subscription.id, 5)
      return { data: days }
    } catch (error) {
      logger.error('Failed to get pending ratings', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetPendingRatings'
