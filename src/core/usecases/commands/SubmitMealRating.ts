import { Deps } from '../../entitygateway/index.js'
import { MealRating, RATING_TAGS, RatingTag } from '../../entities/MealRating.js'
import { ValidationError, ResourceNotFoundError } from '../../../shared/errors/index.js'
import { RatingAlreadySubmittedError } from '../../../shared/errors/domain.errors.js'

export interface SubmitMealRatingInput {
  userId: string
  mealId: string
  deliveryDayId: string
  stars: number
  tags?: string[]
}

export interface SubmitMealRatingOutput {
  message: string
  data: MealRating
}

export function makeUC(deps: Deps) {
  return async function submitMealRating(
    input: SubmitMealRatingInput
  ): Promise<SubmitMealRatingOutput> {
    const { logger, subscriptionLoader, deliveryDayLoader, mealRatingPersistor, mealRatingLoader } = deps

    try {
      const { userId, mealId, deliveryDayId, stars, tags } = input

      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        throw new ValidationError('stars must be an integer between 1 and 5')
      }

      const validTags: RatingTag[] = []
      if (tags?.length) {
        for (const tag of tags) {
          if (!RATING_TAGS.includes(tag as RatingTag)) {
            throw new ValidationError(`Invalid tag: "${tag}". Valid tags: ${RATING_TAGS.join(', ')}`)
          }
          validTags.push(tag as RatingTag)
        }
      }

      const subscription = await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) throw new ResourceNotFoundError('Subscription')

      const day = await deliveryDayLoader.getDeliveryDayById(deliveryDayId)
      if (!day || day.userId !== userId) throw new ResourceNotFoundError('DeliveryDay', deliveryDayId)
      if (day.status !== 'delivered') {
        throw new ValidationError('Only delivered meals can be rated')
      }

      const existing = await mealRatingLoader.getRatingByDeliveryDay(userId, deliveryDayId)
      if (existing) throw new RatingAlreadySubmittedError()

      const rating = await mealRatingPersistor.createRating({
        userId,
        subscriptionId: subscription.id,
        deliveryDayId,
        mealId,
        deliveryDate: day.date,
        stars,
        tags: validTags,
      })

      return { message: 'Rating submitted successfully', data: rating }
    } catch (error) {
      logger.error('Failed to submit meal rating', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'SubmitMealRating'
