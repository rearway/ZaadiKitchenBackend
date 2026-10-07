import type { Deps } from '../../entitygateway/index.js'
import { getPromotionTargets, normalizePlanSlug } from '../services/planPromotionUtils.js'

export interface GetPlanChangeOptionsInput {
  userId: string
}

export interface GetPlanChangeOptionsOutput {
  current_plan_id: string | null
  subscription_status: string | null
  start_date: string | null
  allowed_plan_ids: string[]
  promotion_available: boolean
  blocked_reason: string | null
}

export function makeUC(deps: Deps) {
  return async function getPlanChangeOptions(
    input: GetPlanChangeOptionsInput
  ): Promise<GetPlanChangeOptionsOutput> {
    const { logger, subscriptionLoader, planLoader } = deps

    try {
      const sub = await subscriptionLoader.getActiveSubscriptionByUserId(
        input.userId
      )

      if (!sub) {
        return {
          current_plan_id: null,
          subscription_status: null,
          start_date: null,
          allowed_plan_ids: [],
          promotion_available: false,
          blocked_reason: null,
        }
      }

      const plan = await planLoader.getPlanById(sub.planId)
      const currentSlug = plan ? normalizePlanSlug(plan.slug) : null

      if (sub.status !== 'active') {
        return {
          current_plan_id: currentSlug,
          subscription_status: sub.status,
          start_date: sub.startDate,
          allowed_plan_ids: [],
          promotion_available: false,
          blocked_reason:
            'Plan upgrades are only available while your subscription is active.',
        }
      }

      const allowed = currentSlug ? getPromotionTargets(currentSlug) : []

      return {
        current_plan_id: currentSlug,
        subscription_status: sub.status,
        start_date: sub.startDate,
        allowed_plan_ids: allowed,
        promotion_available: allowed.length > 0,
        blocked_reason:
          allowed.length === 0
            ? 'You are already on the highest plan tier.'
            : null,
      }
    } catch (error) {
      logger.error(
        'Failed to get plan change options',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetPlanChangeOptions'
