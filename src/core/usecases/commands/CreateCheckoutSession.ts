import { Deps } from '../../entitygateway/index.js'
import { MealType } from '../../entities/index.js'

export interface CreateCheckoutSessionInput {
  userId: string
  planId: string
  mealType: MealType
}

export interface CreateCheckoutSessionOutput {
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

export function makeUC(deps: Deps) {
  return async function createCheckoutSession(
    input: CreateCheckoutSessionInput
  ): Promise<CreateCheckoutSessionOutput> {
    const { logger, planLoader, walletLoader, checkoutSessionPersistor } = deps
    try {
      const { userId, planId, mealType } = input

      const plan = await planLoader.getPlanBySlug(planId)
      if (!plan || !plan.isActive) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Plan', planId)
      }

      const walletBalance = await walletLoader.getBalanceByUserId(userId)
      const walletCredit = Math.min(walletBalance, plan.priceSar)
      const totalDue = plan.priceSar - walletCredit

      // Expire any existing active session
      await checkoutSessionPersistor.expireAllUserSessions(userId)

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      const session = await checkoutSessionPersistor.createSession({
        userId,
        planId: plan.id,
        mealType,
        basePriceSar: plan.priceSar,
        walletCreditSar: walletCredit,
        promoDiscountSar: 0,
        totalDueSar: totalDue,
        promoCode: null,
        promoAttemptCount: 0,
        promoLocked: false,
        status: 'active',
        expiresAt,
      })

      return {
        session_id: session.id,
        plan_id: planId,
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
    } catch (error) {
      logger.error(
        'Failed to create checkout session',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'CreateCheckoutSession'
