import { Deps } from '../../entitygateway/index.js'
import { UserWithoutPassword } from '../../entities/index.js'

export interface GetProfileInput {
  userId: string
}

export type GetProfileOutput = {
  message: string
  data: UserWithoutPassword & { onboardingComplete: boolean; pendingReviewCount: number }
}

export function makeUC(deps: Deps) {
  return async function getProfile(
    input: GetProfileInput
  ): Promise<GetProfileOutput> {
    const { logger, userLoader, subscriptionLoader, mealRatingLoader } = deps
    try {
      const { userId } = input

      const user = await userLoader.getUserById(userId)
      if (!user) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('User not found')
      }

      const { password: _, ...userWithoutPassword } = user

      const onboardingComplete = !!user.fullName && user.fullName !== 'New User'

      let pendingReviewCount = 0
      const subscription = await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (subscription) {
        pendingReviewCount = await mealRatingLoader.getPendingRatingCount(userId, subscription.id)
      }

      return {
        message: 'Profile fetched successfully',
        data: {
          ...userWithoutPassword,
          onboardingComplete,
          pendingReviewCount,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to get profile',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetProfile'
