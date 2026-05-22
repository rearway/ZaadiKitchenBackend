import { Deps } from '../../entitygateway/index.js'

export interface GetPlansInput {
  userId: string
}

export interface GetPlansOutput {
  plans: Array<{
    id: string
    name: string
    price_sar: number
    meal_count: number
    price_per_meal_sar: number
    skip_days_allowed: number
    pause_days_allowed: number
    is_most_popular: boolean
  }>
}

export function makeUC(deps: Deps) {
  return async function getPlans(
    _input: GetPlansInput
  ): Promise<GetPlansOutput> {
    const { logger, planLoader } = deps
    try {
      const plans = await planLoader.getAllPlans()
      return {
        plans: plans.map(p => ({
          id: p.slug,
          name: p.name,
          price_sar: p.priceSar,
          meal_count: p.mealCount,
          price_per_meal_sar: p.pricePerMealSar,
          skip_days_allowed: p.skipDaysAllowed,
          pause_days_allowed: p.pauseDaysAllowed,
          is_most_popular: p.isMostPopular,
        })),
      }
    } catch (error) {
      logger.error(
        'Failed to get plans',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetPlans'
