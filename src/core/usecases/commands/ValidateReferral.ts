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
      discount_type: string
      discount_sar: number
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

      // Check plan match
      if (planId) {
        const plan = await planLoader.getPlanBySlug(planId)
        if (
          promo.validForPlanSlug &&
          plan &&
          promo.validForPlanSlug !== plan.slug
        ) {
          return {
            valid: false,
            error_code: 'PLAN_MISMATCH',
            message: 'This code is not valid for the selected plan.',
          }
        }
      }

      // Referral codes require new user
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

      return {
        valid: true,
        code,
        discount_type: promo.type,
        discount_sar: promo.discountSar,
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
