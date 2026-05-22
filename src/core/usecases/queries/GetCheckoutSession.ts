import { Deps } from '../../entitygateway/index.js'
import { CheckoutSession } from '../../entities/index.js'

export interface GetCheckoutSessionInput {
  userId: string
  sessionId: string
}

export type GetCheckoutSessionOutput = {
  session_id: string
  plan_id: string
  meal_type: string
  base_price_sar: number
  wallet_credit_sar: number
  promo_discount_sar: number
  total_due_sar: number
  promo_code: string | null
  promo_attempt_count: number
  promo_locked: boolean
  expires_at: string
}

function toOutput(session: CheckoutSession): GetCheckoutSessionOutput {
  return {
    session_id: session.id,
    plan_id: session.planId,
    meal_type: session.mealType,
    base_price_sar: session.basePriceSar,
    wallet_credit_sar: session.walletCreditSar,
    promo_discount_sar: session.promoDiscountSar,
    total_due_sar: session.totalDueSar,
    promo_code: session.promoCode ?? null,
    promo_attempt_count: session.promoAttemptCount,
    promo_locked: session.promoLocked,
    expires_at: session.expiresAt.toISOString(),
  }
}

export function makeUC(deps: Deps) {
  return async function getCheckoutSession(
    input: GetCheckoutSessionInput
  ): Promise<GetCheckoutSessionOutput> {
    const { logger, checkoutSessionLoader } = deps
    try {
      const { sessionId } = input
      const session = await checkoutSessionLoader.getSessionById(sessionId)

      if (!session || session.status === 'expired') {
        const { SessionExpiredError } =
          await import('../../../shared/errors/index.js')
        throw new SessionExpiredError()
      }

      if (new Date() > session.expiresAt) {
        const { SessionExpiredError } =
          await import('../../../shared/errors/index.js')
        throw new SessionExpiredError()
      }

      return toOutput(session)
    } catch (error) {
      logger.error(
        'Failed to get checkout session',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetCheckoutSession'
