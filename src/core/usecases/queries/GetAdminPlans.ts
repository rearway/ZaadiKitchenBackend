import { Deps } from '../../entitygateway/index.js'
import type { Plan } from '../../entities/Plan.js'
import { toPlanDiscountFields } from '../services/planPricing.js'

export interface AdminPlanView {
  id: string
  slug: string
  name: string
  price_sar: number
  max_price_sar: number | null
  discount_percent: number | null
  meal_count: number
  price_per_meal_sar: number
  is_most_popular: boolean
  is_active: boolean
  updated_at: Date
}

export function toAdminPlanView(plan: Plan): AdminPlanView {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    price_sar: plan.priceSar,
    ...toPlanDiscountFields(plan),
    // Raw stored value, so the admin form shows what was saved even when it is not a discount.
    max_price_sar: plan.maxPriceSar,
    meal_count: plan.mealCount,
    price_per_meal_sar: plan.pricePerMealSar,
    is_most_popular: plan.isMostPopular,
    is_active: plan.isActive,
    updated_at: plan.updatedAt,
  }
}

export type GetAdminPlansInput = Record<string, never>

export interface GetAdminPlansOutput {
  plans: AdminPlanView[]
}

export function makeUC(deps: Deps) {
  return async function getAdminPlans(
    _input: GetAdminPlansInput = {}
  ): Promise<GetAdminPlansOutput> {
    const { logger, planLoader } = deps
    try {
      const plans = await planLoader.getAllPlans()
      return { plans: plans.map(toAdminPlanView) }
    } catch (error) {
      logger.error(
        'Failed to get admin plans',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAdminPlans'
