import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'
import { ensurePauseStatus } from '../services/ensurePauseStatus.js'
import { getSkipCutoffTimestamp } from '../services/weekUtils.js'
import {
  canChangeMealChoice,
  defaultMealId,
  resolveDayEffectiveMeal,
  streamOptions,
  toMealSummary,
  type MealOptionCard,
  type MealSummary,
} from '../services/customerMenuDay.js'

export interface GetMealChoiceInput {
  userId: string
  deliveryDate: string
}

export interface GetMealChoiceOutput {
  delivery_date: string
  meal_type: 'executive' | 'salad'
  selected_meal_id: string | null
  default_meal_id: string | null
  can_change: boolean
  cutoff_at: string
  effective_meal: MealSummary | null
  options: MealOptionCard[]
  executive_options: MealOptionCard[]
  salad_options: MealOptionCard[]
}

export function makeUC(deps: Deps) {
  return async function getMealChoice(
    input: GetMealChoiceInput
  ): Promise<GetMealChoiceOutput> {
    const {
      logger,
      subscriptionLoader,
      deliveryDayLoader,
      menuWeekLoader,
    } = deps

    try {
      let sub = await subscriptionLoader.getActiveSubscriptionByUserId(
        input.userId
      )
      if (!sub) throw new ResourceNotFoundError('Subscription')
      sub = await ensurePauseStatus(deps, sub)

      const day = await deliveryDayLoader.getDeliveryDayByDate(
        sub.id,
        input.deliveryDate
      )
      if (!day) {
        throw new ResourceNotFoundError('Delivery day', input.deliveryDate)
      }

      const slots = await menuWeekLoader.getMenuForDateRange(
        input.deliveryDate,
        input.deliveryDate
      )
      const selectedMealId = day.selectedMealId ?? null
      const executive_options = streamOptions(
        slots,
        'executive',
        selectedMealId
      )
      const salad_options = streamOptions(slots, 'salad', selectedMealId)
      const options = [...executive_options, ...salad_options]
      const effective = resolveDayEffectiveMeal(
        day.mealType,
        selectedMealId,
        slots
      )

      return {
        delivery_date: day.date,
        meal_type: day.mealType,
        selected_meal_id: selectedMealId,
        default_meal_id: defaultMealId(slots, day.mealType),
        can_change: canChangeMealChoice({
          subscription: sub,
          dayStatus: day.status,
          deliveryDate: day.date,
          optionCount: options.length,
        }),
        cutoff_at: getSkipCutoffTimestamp(day.date).toISOString(),
        effective_meal: effective ? toMealSummary(effective) : null,
        options,
        executive_options,
        salad_options,
      }
    } catch (error) {
      logger.error(
        'GetMealChoice failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetMealChoice'
