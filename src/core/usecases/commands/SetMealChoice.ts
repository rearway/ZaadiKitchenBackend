import type { Deps } from '../../entitygateway/index.js'
import { isAfterSkipCutoff } from '../services/weekUtils.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'
import { canUseSkipAndPause } from '../services/subscriptionServicePeriod.js'
import {
  filledSlotsForStream,
  resolveEffectiveMeal,
} from '../services/resolveEffectiveMeal.js'
import { toMealSummary, type MealSummary } from '../services/customerMenuDay.js'

export interface SetMealChoiceInput {
  userId: string
  deliveryDate: string
  mealId: string
}

export interface SetMealChoiceOutput {
  delivery_date: string
  meal_type: 'executive' | 'salad'
  selected_meal_id: string
  effective_meal: MealSummary | null
}

export function makeUC(deps: Deps) {
  return async function setMealChoice(
    input: SetMealChoiceInput
  ): Promise<SetMealChoiceOutput> {
    const {
      logger,
      subscriptionLoader,
      deliveryDayLoader,
      deliveryDayPersistor,
      menuWeekLoader,
    } = deps

    try {
      let subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(input.userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }
      subscription = await ensurePauseStatus(deps, subscription)

      if (!canUseSkipAndPause(subscription)) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(
          'Only active subscriptions can change a meal choice.'
        )
      }

      if (isAfterSkipCutoff(input.deliveryDate)) {
        const { PastCutoffError } =
          await import('../../../shared/errors/index.js')
        throw new PastCutoffError()
      }

      const day = await deliveryDayLoader.getDeliveryDayByDate(
        subscription.id,
        input.deliveryDate
      )
      if (!day) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Delivery day', input.deliveryDate)
      }

      if (day.status !== 'scheduled') {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(
          `Cannot change meal choice for a ${day.status} delivery.`
        )
      }

      const slots = await menuWeekLoader.getMenuForDateRange(
        input.deliveryDate,
        input.deliveryDate
      )
      const option = filledSlotsForStream(slots, day.mealType).find(
        s => s.mealId === input.mealId
      )
      if (!option?.meal) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError(
          'That dish is not an option for this delivery day.'
        )
      }

      await deliveryDayPersistor.updateSelectedMeal(
        day.id,
        option.meal.id,
        option.meal.nameEn
      )

      const effective = resolveEffectiveMeal({
        mealType: day.mealType,
        selectedMealId: option.meal.id,
        slots,
      })

      return {
        delivery_date: day.date,
        meal_type: day.mealType,
        selected_meal_id: option.meal.id,
        effective_meal: effective ? toMealSummary(effective) : null,
      }
    } catch (error) {
      logger.error(
        'SetMealChoice failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'SetMealChoice'
