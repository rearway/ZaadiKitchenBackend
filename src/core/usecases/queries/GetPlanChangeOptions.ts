import type { Deps } from '../../entitygateway/index.js'
import {
  getPromotionTargets,
  normalizePlanSlug,
} from '../services/planPromotionUtils.js'
import {
  canUpgradeSubscriptionPlan,
  isSubscriptionInServicePeriod,
} from '../services/subscriptionServicePeriod.js'
import { loadCurrentSubscription } from '../services/loadCurrentSubscription.js'

export interface GetPlanChangeOptionsInput {
  userId: string
}

export interface GetPlanChangeOptionsOutput {
  current_plan_id: string | null
  subscription_status: string | null
  start_date: string | null
  allowed_plan_ids: string[]
  promotion_available: boolean
  reactivation_available: boolean
  renewal_available: boolean
  blocked_reason: string | null
}

export function makeUC(deps: Deps) {
  return async function getPlanChangeOptions(
    input: GetPlanChangeOptionsInput
  ): Promise<GetPlanChangeOptionsOutput> {
    const { logger, subscriptionLoader, planLoader } = deps

    try {
      const sub = await loadCurrentSubscription(
        subscriptionLoader,
        input.userId
      )

      if (!sub) {
        return {
          current_plan_id: null,
          subscription_status: null,
          start_date: null,
          allowed_plan_ids: [],
          promotion_available: false,
          reactivation_available: false,
          renewal_available: false,
          blocked_reason: null,
        }
      }

      const plan = await planLoader.getPlanById(sub.planId)
      const currentSlug = plan ? normalizePlanSlug(plan.slug) : null

      if (!isSubscriptionInServicePeriod(sub)) {
        const plans = await planLoader.getActivePlans()
        return {
          current_plan_id: currentSlug,
          subscription_status: 'expired',
          start_date: sub.startDate,
          allowed_plan_ids: plans.map(item => normalizePlanSlug(item.slug)),
          promotion_available: false,
          reactivation_available: false,
          renewal_available: true,
          blocked_reason: null,
        }
      }

      if (!canUpgradeSubscriptionPlan(sub)) {
        const blockedReason =
          sub.status === 'paused'
            ? 'Plan upgrades are not available while your subscription is paused.'
            : 'Plan upgrades are only available while your subscription is active.'
        return {
          current_plan_id: currentSlug,
          subscription_status: sub.status,
          start_date: sub.startDate,
          allowed_plan_ids: [],
          promotion_available: false,
          reactivation_available: false,
          renewal_available: false,
          blocked_reason: blockedReason,
        }
      }

      const upgrades = currentSlug ? getPromotionTargets(currentSlug) : []
      const reactivation = sub.status === 'cancelled' && currentSlug != null
      const allowed = reactivation ? [currentSlug, ...upgrades] : upgrades

      return {
        current_plan_id: currentSlug,
        subscription_status: sub.status,
        start_date: sub.startDate,
        allowed_plan_ids: allowed,
        promotion_available: upgrades.length > 0,
        reactivation_available: reactivation,
        renewal_available: false,
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
