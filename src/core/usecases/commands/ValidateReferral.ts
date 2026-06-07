import { Deps } from '../../entitygateway/index.js'

export interface ValidateReferralInput {
  userId: string
  code: string
  planId?: string
}

export type ValidateReferralOutput =
  | {
      valid: true
      code: string
      discount_type: 'referral' | 'promo'
      discount_sar: number
      discount_pct: number | null
      description: string
    }
  | {
      valid: false
      error_code: string
      message: string
    }

export function makeUC(deps: Deps) {
  return async function validateReferral(
    input: ValidateReferralInput
  ): Promise<ValidateReferralOutput> {
    const { logger, promoCodeLoader, orderLoader, planLoader } = deps
    try {
      const { userId, code, planId } = input

      const promo = await promoCodeLoader.getPromoByCode(code)

      if (
        !promo ||
        !promo.isActive ||
        (promo.maxUses !== null && promo.timesUsed >= promo.maxUses)
      ) {
        return {
          valid: false,
          error_code: 'INVALID_CODE',
          message: "This code doesn't exist or has already been used.",
        }
      }

      // Check if this user has already used this code on a previous order
      const alreadyUsed = await orderLoader.hasUserUsedPromoCode(userId, code)
      if (alreadyUsed) {
        return {
          valid: false,
          error_code: 'CODE_ALREADY_USED',
          message: 'You have already used this code.',
        }
      }

      // Resolve plan for discount calculation and plan-scope checks
      const plan = planId ? await planLoader.getPlanBySlug(planId) : null

      // Check plan match for scoped codes
      if (promo.validForPlanSlug && plan && promo.validForPlanSlug !== plan.slug) {
        return {
          valid: false,
          error_code: 'PLAN_MISMATCH',
          message: 'This code is not valid for the selected plan.',
        }
      }

      // Referral codes are only valid on a new user's first subscription
      if (promo.type === 'referral') {
        const lastOrder = await orderLoader.getLastOrderByUserId(userId)
        if (lastOrder) {
          return {
            valid: false,
            error_code: 'NOT_NEW_USER',
            message:
              "Referral codes are valid for new users' first subscription only.",
          }
        }
      }

      // For referral codes: discount is 20% of the plan price, computed dynamically.
      // For promo codes: discount is the fixed SAR amount stored on the record.
      const discountSar =
        promo.type === 'referral'
          ? plan
            ? Math.round(plan.priceSar * 0.2)
            : 0
          : promo.discountSar

      return {
        valid: true,
        code,
        discount_type: promo.type,
        discount_sar: discountSar,
        discount_pct: promo.type === 'referral' ? 20 : null,
        description:
          promo.type === 'referral' ? 'Referral discount' : 'Promo discount',
      }
    } catch (error) {
      logger.error(
        'Failed to validate referral',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'ValidateReferral'
